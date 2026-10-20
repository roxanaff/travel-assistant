using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TravelAssistant.Contracts;
using TravelAssistant.Data;
using TravelAssistant.Models;
using TravelAssistant.Validation;

namespace TravelAssistant.Services;

public sealed record LinkedFieldChange(string Field, JsonElement Before, JsonElement After);

/// <summary>
/// Records source changes without synchronising records. Canonical fields describe the
/// shared meaning of a relationship, not unrelated names, categories, or payment dates.
/// </summary>
public static class LinkedRecordReviews
{
    public sealed record Edge(object Source, object Target, ItineraryItem? Activity = null)
    {
        public bool IsFinancial => Source is Expense or PlannedCost || Target is Expense or PlannedCost;
    }

    public static async Task TrackAsync(
        TravelAssistantDbContext database,
        object source,
        Guid? excludedTarget = null)
    {
        var entry = database.Entry(source);
        if (entry.State == EntityState.Added) return;

        var before = entry.OriginalValues.ToObject();
        foreach (var edge in await GetEdges(database, source))
        {
            if (Id(edge.Target) == excludedTarget) continue;
            var oldValues = Project(before, edge);
            var newValues = Project(source, edge);
            if (edge.IsFinancial && Equal(newValues["Amount"], Project(edge.Target, edge)["Amount"]))
            {
                var sourceId = Id(source);
                var targetId = Id(edge.Target);
                var tripId = TripId(source);
                var resolvedMismatches = await database.LinkedRecordReviews.Where(review =>
                    review.TripId == tripId && review.IsMismatch
                    && ((review.SourceId == sourceId && review.TargetId == targetId)
                        || (review.SourceId == targetId && review.TargetId == sourceId))).ToListAsync();
                if (resolvedMismatches.Count > 0)
                {
                    database.LinkedRecordReviews.RemoveRange(resolvedMismatches);
                    continue;
                }
            }
            var changes = oldValues
                .Where(pair => source is Booking
                    ? pair.Key != "Duration"
                    : pair.Key is not "EndDate" and not "EndTime")
                .Where(pair => !Equal(pair.Value, newValues[pair.Key]))
                .Select(pair => new LinkedFieldChange(pair.Key, pair.Value, newValues[pair.Key]))
                .ToList();
            if (changes.Count > 0) await Record(database, edge, changes);
        }
    }

    public static async Task InitialiseExpenseLinkAsync(TravelAssistantDbContext database, object source, Expense expense)
    {
        var forward = new Edge(source, expense);
        if (Project(source, forward)["Amount"].GetDecimal() == expense.Amount) return;

        foreach (var edge in new[] { forward, new Edge(expense, source) })
        {
            var actual = Project(edge.Source, edge)["Amount"];
            var expected = Project(edge.Target, edge)["Amount"];
            await Record(database, edge, [new LinkedFieldChange("Amount", expected, actual)], true);
        }
    }

    public static async Task ClearPairAsync(TravelAssistantDbContext database, Guid firstId, Guid secondId)
    {
        var reviews = await database.LinkedRecordReviews.Where(review =>
            (review.SourceId == firstId && review.TargetId == secondId)
            || (review.SourceId == secondId && review.TargetId == firstId)).ToListAsync();
        database.LinkedRecordReviews.RemoveRange(reviews);
    }

    public static async Task ClearRecordAsync(TravelAssistantDbContext database, Guid tripId, Guid id)
    {
        var obsolete = await database.LinkedRecordReviews.Where(review =>
            review.TripId == tripId && (review.SourceId == id || review.TargetId == id)).ToListAsync();
        database.LinkedRecordReviews.RemoveRange(obsolete);
    }

    private static async Task Record(
        TravelAssistantDbContext database,
        Edge edge,
        List<LinkedFieldChange> changes,
        bool mismatch = false)
    {
        var tripId = TripId(edge.Source);
        var sourceId = Id(edge.Source);
        var targetId = Id(edge.Target);
        var review = await database.LinkedRecordReviews.SingleOrDefaultAsync(item =>
            item.TripId == tripId && item.SourceId == sourceId && item.TargetId == targetId);
        if (review is null)
        {
            review = new LinkedRecordReview
            {
                TripId = tripId,
                SourceKind = Kind(edge.Source),
                SourceId = sourceId,
                TargetKind = Kind(edge.Target),
                TargetId = targetId,
                IsMismatch = mismatch
            };
            database.LinkedRecordReviews.Add(review);
        }
        else if (database.Entry(review).State == EntityState.Deleted)
        {
            // Relinking the same pair resets the old decision before checking a fresh mismatch.
            database.Entry(review).State = EntityState.Modified;
            review.ChangesJson = "[]";
            review.TargetSnapshotJson = "{}";
            review.IsMismatch = mismatch;
        }

        var pending = ReadChanges(review).ToDictionary(change => change.Field);
        var baseline = ReadSnapshot(review);
        var currentTarget = Project(edge.Target, edge);
        foreach (var change in changes)
        {
            var first = pending.GetValueOrDefault(change.Field)?.Before ?? change.Before;
            if (!baseline.ContainsKey(change.Field)) baseline[change.Field] = currentTarget[change.Field];
            if (Equal(first, change.After))
            {
                pending.Remove(change.Field);
                baseline.Remove(change.Field);
            }
            else
            {
                pending[change.Field] = change with { Before = first };
            }
        }

        if (pending.Count == 0)
        {
            database.LinkedRecordReviews.Remove(review);
            if (edge.Activity is ItineraryItem activity)
            {
                if (edge.Target is Booking)
                {
                    activity.HasPendingBookingUpdateReview = false;
                    activity.PendingBookingChangeFields = null;
                }
                else
                {
                    activity.HasPendingActivityUpdateReview = false;
                    activity.PendingActivityChangeFields = null;
                }
            }
            return;
        }
        review.ChangesJson = JsonSerializer.Serialize(pending.Values);
        review.TargetSnapshotJson = JsonSerializer.Serialize(baseline);
        review.Revision = Guid.NewGuid();
    }

    public static List<LinkedFieldChange> ReadChanges(LinkedRecordReview review) =>
        JsonSerializer.Deserialize<List<LinkedFieldChange>>(review.ChangesJson) ?? [];

    private static Dictionary<string, JsonElement> ReadSnapshot(LinkedRecordReview review) =>
        JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(review.TargetSnapshotJson) ?? [];

    public static async Task<Edge?> LoadEdge(TravelAssistantDbContext database, LinkedRecordReview review)
    {
        var source = await Find(database, review.SourceKind, review.SourceId, review.TripId);
        if (source is null) return null;
        return (await GetEdges(database, source)).SingleOrDefault(edge =>
            Id(edge.Target) == review.TargetId && Kind(edge.Target) == review.TargetKind);
    }

    public static object Response(LinkedRecordReview review, Edge edge, string? blockedReason) => new
    {
        review.Id,
        review.Revision,
        review.SourceKind,
        review.SourceId,
        SourceName = Name(edge.Source),
        review.TargetKind,
        review.TargetId,
        TargetName = Name(edge.Target),
        review.IsMismatch,
        Role = edge.Activity?.BookingRole,
        Changes = ReadChanges(review),
        ProposedAmount = edge.IsFinancial
            ? Project(edge.Source, edge)["Amount"].GetDecimal()
                + (edge.Target is Booking booking ? booking.AmountRefunded ?? 0 : 0)
            : (decimal?)null,
        UpdateLabel = edge.Target is Booking && edge.Source is Expense
            ? "Update amount paid"
            : $"Update {Kind(edge.Target) switch { LinkedRecordKind.PlannedCost => "planned amount", LinkedRecordKind.Expense => "expense amount", LinkedRecordKind.Activity => "activity", _ => "booking" }}",
        BlockedReason = blockedReason
    };

    /// <summary>Changes only affected fields. The caller restores proposed values after validation-only checks.</summary>
    public static async Task<string?> ApplyAsync(TravelAssistantDbContext database, LinkedRecordReview review, Edge edge)
    {
        var current = Project(edge.Target, edge);
        var baseline = ReadSnapshot(review);
        var changes = ReadChanges(review);
        foreach (var change in changes)
        {
            if (!baseline.TryGetValue(change.Field, out var original)
                || (!Equal(current[change.Field], original) && !Equal(current[change.Field], change.After)))
            {
                return "The related field was also edited. Keep it as is or edit the record manually to resolve the difference.";
            }
        }

        if (changes.Any(change => change.Field == "ArrivalLocation"))
        {
            return "This activity has one location, not separate departure and arrival locations. Edit its location manually or keep it as is.";
        }

        var values = changes.ToDictionary(change => change.Field, change => change.After);
        if (edge.Target is Booking booking)
        {
            if (edge.IsFinancial)
            {
                booking.AmountPaid = Number(values["Amount"])!.Value + (booking.AmountRefunded ?? 0);
            }
            else
            {
                var returning = edge.Activity?.BookingRole == BookingActivityRole.Return;
                // Moving the start preserves the booking's own duration unless duration itself changed.
                if (!values.ContainsKey("Duration")
                    && (values.ContainsKey("Date") || values.ContainsKey("Time"))
                    && current["Duration"].ValueKind != JsonValueKind.Null)
                {
                    values["Duration"] = current["Duration"];
                }
                if (values.TryGetValue("Date", out var date))
                {
                    if (date.ValueKind == JsonValueKind.Null) return "Bookings require a date. Edit the booking manually or keep it as is.";
                    if (returning) booking.ReturnStartDate = DateOnly.Parse(date.GetString()!);
                    else booking.StartDate = DateOnly.Parse(date.GetString()!);
                }
                if (values.TryGetValue("Time", out var time))
                {
                    if (returning) booking.ReturnStartTime = Time(time);
                    else booking.StartTime = Time(time);
                }
                if (values.TryGetValue("Duration", out var duration))
                {
                    var startDate = returning ? booking.ReturnStartDate : booking.StartDate;
                    var startTime = returning ? booking.ReturnStartTime : booking.StartTime;
                    if (duration.ValueKind != JsonValueKind.Null && (startDate is null || startTime is null))
                        return "A date and start time are needed to update the booking's duration.";
                    DateTime? end = duration.ValueKind == JsonValueKind.Null
                        ? null
                        : startDate!.Value.ToDateTime(startTime!.Value).AddMinutes(duration.GetInt32());
                    if (returning)
                    {
                        booking.ReturnEndDate = end is null ? null : DateOnly.FromDateTime(end.Value);
                        booking.ReturnEndTime = end is null ? null : TimeOnly.FromDateTime(end.Value);
                    }
                    else
                    {
                        booking.EndDate = end is null ? null : DateOnly.FromDateTime(end.Value);
                        booking.EndTime = end is null ? null : TimeOnly.FromDateTime(end.Value);
                    }
                }
                if (values.TryGetValue("Location", out var location))
                {
                    if (returning) booking.ReturnStartLocation = Text(location);
                    else if (edge.Activity?.BookingRole == BookingActivityRole.Outbound) booking.StartLocation = Text(location);
                    else booking.Location = Text(location);
                }
                if (values.TryGetValue("Cost", out var cost)) booking.TotalCost = Number(cost);
            }
            var error = BookingValidation.Validate(ToRequest(booking));
            if (error is not null) return error + " Edit the booking manually or keep it as is.";
            if (booking.TotalCost is null or 0
                && await database.Expenses.AnyAsync(item => item.TripId == review.TripId && item.BookingId == booking.Id))
            {
                return "Unlink or delete the related expense before clearing this booking's cost.";
            }
        }
        else if (edge.Target is ItineraryItem activity)
        {
            if (values.ContainsKey("EndDate") || values.ContainsKey("EndTime"))
            {
                var sourceDuration = Project(edge.Source, edge)["Duration"];
                if (sourceDuration.ValueKind == JsonValueKind.Null
                    && (values.GetValueOrDefault("EndDate").ValueKind == JsonValueKind.String
                        || values.GetValueOrDefault("EndTime").ValueKind == JsonValueKind.String))
                {
                    return "The booking needs departure and arrival times before its end can update an activity's duration. Edit the activity manually or keep it as is.";
                }
                values["Duration"] = sourceDuration;
            }
            if (values.TryGetValue("Date", out var date)) activity.Date = date.ValueKind == JsonValueKind.Null ? null : DateOnly.Parse(date.GetString()!);
            if (values.TryGetValue("Time", out var time)) activity.StartTime = Time(time);
            if (values.TryGetValue("Duration", out var duration)) activity.DurationMinutes = duration.ValueKind == JsonValueKind.Null ? null : duration.GetInt32();
            if (values.TryGetValue("Location", out var location)) activity.Location = Text(location);
            if (values.TryGetValue("Cost", out var cost)) activity.Cost = Number(cost);
            var trip = await database.Trips.SingleAsync(item => item.Id == review.TripId);
            var error = ItineraryItemValidation.Validate(new CreateItineraryItemRequest(
                activity.Name, activity.Date, activity.StartTime, activity.DurationMinutes,
                activity.OpeningTime, activity.ClosingTime, activity.Category, activity.Cost,
                activity.Location, activity.ExternalLink, activity.Priority, activity.Note, activity.BookingRequired), trip);
            if (error is not null) return error + " Edit the activity manually or keep it as is.";
        }
        else if (edge.Target is Expense expense)
        {
            var amount = Number(values["Amount"])!.Value;
            if (amount <= 0) return "Expenses require a positive amount. Keep the expense and unlink it, or delete the expense; the booking's payment and refund history will remain.";
            var error = ExpenseValidation.Validate(new CreateExpenseRequest(expense.Name, expense.Category, amount, expense.ExpenseDate, expense.PlannedCostId));
            if (error is not null) return error;
            expense.Amount = amount;
        }
        else if (edge.Target is PlannedCost plan)
        {
            var amount = Number(values["Amount"])!.Value;
            var error = PlannedCostValidation.Validate(new CreatePlannedCostRequest(plan.Name, plan.Category, amount));
            if (error is not null) return error;
            plan.Amount = amount;
        }
        return null;
    }

    public static SaveBookingRequest ToRequest(Booking booking) => new(
        booking.Name, booking.Category, booking.Status, booking.Provider, booking.ConfirmationNumber,
        booking.StartDate, booking.StartTime, booking.EndDate, booking.EndTime, booking.Location,
        booking.StartLocation, booking.EndLocation, booking.ReturnStartDate, booking.ReturnStartTime,
        booking.ReturnStartLocation, booking.ReturnEndDate, booking.ReturnEndTime, booking.ReturnEndLocation,
        booking.ExternalLink, booking.Note, booking.TotalCost, booking.AmountPaid, booking.AmountRefunded);

    private static Dictionary<string, JsonElement> Project(object record, Edge edge)
    {
        if (edge.IsFinancial)
        {
            var amount = record switch
            {
                Booking booking => booking.AmountPaid - (booking.AmountRefunded ?? 0),
                Expense expense => expense.Amount,
                PlannedCost plan => plan.Amount,
                _ => throw new InvalidOperationException("Unsupported financial relationship.")
            };
            return new() { ["Amount"] = JsonSerializer.SerializeToElement(amount) };
        }

        object? date;
        object? time;
        object? duration;
        object? location;
        object? cost;
        object? arrival = null;
        object? projectedEndDate = null;
        object? projectedEndTime = null;
        if (record is Booking reservation)
        {
            var returning = edge.Activity?.BookingRole == BookingActivityRole.Return;
            var startDate = returning ? reservation.ReturnStartDate : reservation.StartDate;
            var startTime = returning ? reservation.ReturnStartTime : reservation.StartTime;
            var endDate = returning ? reservation.ReturnEndDate : reservation.EndDate;
            var endTime = returning ? reservation.ReturnEndTime : reservation.EndTime;
            projectedEndDate = endDate;
            projectedEndTime = endTime;
            date = startDate;
            time = startTime;
            duration = startDate is not null && startTime is not null && endTime is not null
                ? (int?)((endDate ?? startDate.Value).ToDateTime(endTime.Value) - startDate.Value.ToDateTime(startTime.Value)).TotalMinutes
                : null;
            location = returning ? reservation.ReturnStartLocation
                : edge.Activity?.BookingRole == BookingActivityRole.Outbound ? reservation.StartLocation : reservation.Location;
            cost = reservation.TotalCost;
            arrival = returning ? reservation.ReturnEndLocation : reservation.EndLocation;
        }
        else
        {
            var activity = (ItineraryItem)record;
            date = activity.Date;
            time = activity.StartTime;
            duration = activity.DurationMinutes;
            location = activity.Location;
            cost = activity.Cost;
            if (activity.Date is DateOnly activityDate && activity.StartTime is TimeOnly activityTime
                && activity.DurationMinutes is int activityDuration)
            {
                var end = activityDate.ToDateTime(activityTime).AddMinutes(activityDuration);
                projectedEndDate = DateOnly.FromDateTime(end);
                projectedEndTime = TimeOnly.FromDateTime(end);
            }
        }
        return new Dictionary<string, object?>
        {
            ["Date"] = date,
            ["Time"] = time,
            ["Duration"] = duration,
            ["Location"] = location,
            ["Cost"] = cost,
            ["ArrivalLocation"] = arrival,
            ["EndDate"] = projectedEndDate,
            ["EndTime"] = projectedEndTime
        }.ToDictionary(pair => pair.Key, pair => JsonSerializer.SerializeToElement(pair.Value));
    }

    private static async Task<List<Edge>> GetEdges(TravelAssistantDbContext database, object source)
    {
        var result = new List<Edge>();
        var tripId = TripId(source);
        if (source is Booking booking)
        {
            var activities = await database.ItineraryItems.Where(item => item.TripId == tripId && item.BookingId == booking.Id).ToListAsync();
            result.AddRange(activities.Select(activity => new Edge(booking, activity, activity)));
            var bookingExpense = await database.Expenses.SingleOrDefaultAsync(item => item.TripId == tripId && item.BookingId == booking.Id);
            if (bookingExpense is not null) result.Add(new Edge(booking, bookingExpense));
        }
        else if (source is ItineraryItem activity && activity.BookingId is Guid bookingId)
        {
            var linkedBooking = await database.Bookings.SingleOrDefaultAsync(item => item.TripId == tripId && item.Id == bookingId);
            if (linkedBooking is not null) result.Add(new Edge(activity, linkedBooking, activity));
        }
        else if (source is Expense expense)
        {
            if (expense.BookingId is Guid linkedBookingId)
            {
                var linkedBooking = await database.Bookings.SingleOrDefaultAsync(item => item.TripId == tripId && item.Id == linkedBookingId);
                if (linkedBooking is not null) result.Add(new Edge(expense, linkedBooking));
            }
            if (expense.PlannedCostId is Guid planId)
            {
                var plan = await database.PlannedCosts.SingleOrDefaultAsync(item => item.TripId == tripId && item.Id == planId);
                if (plan is not null) result.Add(new Edge(expense, plan));
            }
        }
        else if (source is PlannedCost plan)
        {
            var planExpense = await database.Expenses.SingleOrDefaultAsync(item => item.TripId == tripId && item.PlannedCostId == plan.Id);
            if (planExpense is not null) result.Add(new Edge(plan, planExpense));
        }
        return result;
    }

    private static async Task<object?> Find(TravelAssistantDbContext database, LinkedRecordKind kind, Guid id, Guid tripId) => kind switch
    {
        LinkedRecordKind.Booking => await database.Bookings.SingleOrDefaultAsync(item => item.Id == id && item.TripId == tripId),
        LinkedRecordKind.Activity => await database.ItineraryItems.SingleOrDefaultAsync(item => item.Id == id && item.TripId == tripId),
        LinkedRecordKind.Expense => await database.Expenses.SingleOrDefaultAsync(item => item.Id == id && item.TripId == tripId),
        LinkedRecordKind.PlannedCost => await database.PlannedCosts.SingleOrDefaultAsync(item => item.Id == id && item.TripId == tripId),
        _ => null
    };

    public static Guid Id(object record) => record switch
    {
        Booking item => item.Id,
        ItineraryItem item => item.Id,
        Expense item => item.Id,
        PlannedCost item => item.Id,
        _ => throw new InvalidOperationException("Unsupported linked record.")
    };

    private static Guid TripId(object record) => record switch
    {
        Booking item => item.TripId,
        ItineraryItem item => item.TripId,
        Expense item => item.TripId,
        PlannedCost item => item.TripId,
        _ => throw new InvalidOperationException("Unsupported linked record.")
    };

    private static LinkedRecordKind Kind(object record) => record switch
    {
        Booking => LinkedRecordKind.Booking,
        ItineraryItem => LinkedRecordKind.Activity,
        Expense => LinkedRecordKind.Expense,
        PlannedCost => LinkedRecordKind.PlannedCost,
        _ => throw new InvalidOperationException("Unsupported linked record.")
    };

    private static string Name(object record) => record switch
    {
        Booking item => item.Name,
        ItineraryItem item => item.Name,
        Expense item => item.Name,
        PlannedCost item => item.Name,
        _ => "Linked record"
    };

    private static bool Equal(JsonElement first, JsonElement second) => JsonElement.DeepEquals(first, second);
    private static string? Text(JsonElement value) => value.ValueKind == JsonValueKind.Null ? null : value.GetString();
    private static decimal? Number(JsonElement value) => value.ValueKind == JsonValueKind.Null ? null : value.GetDecimal();
    private static TimeOnly? Time(JsonElement value) => value.ValueKind == JsonValueKind.Null ? null : TimeOnly.Parse(value.GetString()!);
}
