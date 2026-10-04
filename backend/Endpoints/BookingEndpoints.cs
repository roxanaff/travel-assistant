using Microsoft.EntityFrameworkCore;
using TravelAssistant.Contracts;
using TravelAssistant.Data;
using TravelAssistant.Models;
using TravelAssistant.Validation;

namespace TravelAssistant.Endpoints;

/// <summary>Defines the API workflow for trip bookings and their first-version relationships.</summary>
public static class BookingEndpoints
{
    public static IEndpointRouteBuilder MapBookingEndpoints(this IEndpointRouteBuilder app)
    {
        var routes = app.MapOwnedTripGroup();

        routes.MapGet("/bookings", async (Guid tripId, TravelAssistantDbContext database) =>
        {
            var tripExists = await database.Trips.AnyAsync(trip => trip.Id == tripId);
            if (!tripExists)
            {
                return Results.NotFound();
            }

            var bookings = await database.Bookings
                .Where(booking => booking.TripId == tripId)
                .Include(booking => booking.Activities)
                .Include(booking => booking.PlannedCost)
                    .ThenInclude(cost => cost!.Expense)
                .ToListAsync();

            var ordered = bookings
                .OrderBy(booking => booking.Status == BookingStatus.Cancelled)
                .ThenBy(booking => booking.StartDate)
                .ThenBy(booking => booking.StartTime == null)
                .ThenBy(booking => booking.StartTime)
                .ThenBy(booking => booking.CreatedAtUtc);

            return Results.Ok(ordered.Select(ToResponse));
        }).WithName("GetBookings");

        routes.MapGet("/bookings/{id:guid}", async (Guid tripId, Guid id, TravelAssistantDbContext database) =>
        {
            var booking = await FindBooking(tripId, id, database);
            return booking is null ? Results.NotFound() : Results.Ok(ToResponse(booking));
        }).WithName("GetBooking");

        routes.MapPost("/bookings", async (Guid tripId, SaveBookingRequest request, TravelAssistantDbContext database) =>
        {
            var validationError = BookingValidation.Validate(request);
            if (validationError is not null)
            {
                return Results.BadRequest(validationError);
            }

            var tripExists = await database.Trips.AnyAsync(trip => trip.Id == tripId);
            if (!tripExists)
            {
                return Results.NotFound();
            }

            var booking = new Booking { TripId = tripId };
            ApplyRequest(booking, request);
            database.Bookings.Add(booking);
            await database.SaveChangesAsync();

            return Results.Created($"/api/trips/{tripId}/bookings/{booking.Id}", ToResponse(booking));
        }).WithName("CreateBooking");

        routes.MapPut("/bookings/{id:guid}", async (
            Guid tripId,
            Guid id,
            SaveBookingRequest request,
            TravelAssistantDbContext database) =>
        {
            var validationError = BookingValidation.Validate(request);
            if (validationError is not null)
            {
                return Results.BadRequest(validationError);
            }

            var booking = await FindBooking(tripId, id, database);
            if (booking is null)
            {
                return Results.NotFound();
            }

            if ((request.TotalCost is null || request.TotalCost == 0) && booking.PlannedCost is not null)
            {
                return Results.Conflict("Remove or delete the linked budget entries before clearing this booking's cost.");
            }

            foreach (var activity in booking.Activities)
            {
                var changedFields = GetChangedFields(
                    booking,
                    request,
                    activity.BookingRole ?? BookingActivityRole.General);
                if (changedFields.Count > 0)
                {
                    activity.HasPendingActivityUpdateReview = true;
                    activity.PendingActivityChangeFields = MergeChangeFields(
                        activity.PendingActivityChangeFields,
                        changedFields);
                }
            }

            ApplyRequest(booking, request);
            await database.SaveChangesAsync();
            return Results.Ok(ToResponse(booking));
        }).WithName("UpdateBooking");

        routes.MapDelete("/bookings/{id:guid}", async (Guid tripId, Guid id, TravelAssistantDbContext database) =>
        {
            var booking = await FindBooking(tripId, id, database);
            if (booking is null)
            {
                return Results.NotFound();
            }

            foreach (var activity in booking.Activities)
            {
                activity.HasPendingDeletedBookingNotice = true;
            }

            if (booking.PlannedCost is not null)
            {
                booking.PlannedCost.HasPendingDeletedBookingNotice = true;
                if (booking.PlannedCost.Expense is not null)
                {
                    booking.PlannedCost.Expense.HasPendingDeletedBookingNotice = true;
                }
            }

            database.Bookings.Remove(booking);
            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("DeleteBooking");

        routes.MapPost("/bookings/{id:guid}/dismiss-deleted-link-notices", async (
            Guid tripId,
            Guid id,
            TravelAssistantDbContext database) =>
        {
            var booking = await database.Bookings.SingleOrDefaultAsync(item => item.Id == id && item.TripId == tripId);
            if (booking is null)
            {
                return Results.NotFound();
            }

            booking.HasPendingDeletedActivityNotice = false;
            booking.HasPendingDeletedPlannedCostNotice = false;
            booking.HasPendingDeletedExpenseNotice = false;
            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("DismissBookingDeletedLinkNotices");

        routes.MapPost("/bookings/{id:guid}/activities/{activityId:guid}", async (
            Guid tripId,
            Guid id,
            Guid activityId,
            LinkBookingActivityRequest request,
            TravelAssistantDbContext database) =>
        {
            var booking = await FindBooking(tripId, id, database);
            var activity = await database.ItineraryItems
                .SingleOrDefaultAsync(item => item.Id == activityId && item.TripId == tripId);
            if (booking is null || activity is null)
            {
                return Results.NotFound();
            }

            if (activity.BookingId is not null && activity.BookingId != booking.Id)
            {
                return Results.Conflict("This activity is already linked to another booking.");
            }

            if (request.Role != BookingActivityRole.General
                && booking.Category is not BookingCategory.Flight and not BookingCategory.RailBusFerry)
            {
                return Results.BadRequest("Journey-leg links are available only for flight, train, bus, or ferry bookings.");
            }

            if (request.Role == BookingActivityRole.Return && booking.ReturnStartDate is null)
            {
                return Results.BadRequest("Add a return journey before linking a return activity.");
            }

            activity.BookingId = booking.Id;
            activity.BookingRole = request.Role;
            activity.BookingRequired = true;
            activity.HasPendingDeletedBookingNotice = false;
            activity.HasPendingBookingUpdateReview = false;
            activity.HasPendingActivityUpdateReview = false;
            activity.PendingBookingChangeFields = null;
            activity.PendingActivityChangeFields = null;
            await database.SaveChangesAsync();

            return Results.Ok(new { activity.Id, activity.BookingId, activity.BookingRole });
        }).WithName("LinkBookingActivity");

        routes.MapDelete("/bookings/{id:guid}/activities/{activityId:guid}", async (
            Guid tripId,
            Guid id,
            Guid activityId,
            TravelAssistantDbContext database) =>
        {
            var activity = await database.ItineraryItems.SingleOrDefaultAsync(item =>
                item.Id == activityId && item.TripId == tripId && item.BookingId == id);
            if (activity is null)
            {
                return Results.NotFound();
            }

            activity.BookingId = null;
            activity.BookingRole = null;
            activity.HasPendingBookingUpdateReview = false;
            activity.HasPendingActivityUpdateReview = false;
            activity.PendingBookingChangeFields = null;
            activity.PendingActivityChangeFields = null;
            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("UnlinkBookingActivity");

        routes.MapPost("/bookings/{id:guid}/activities/{activityId:guid}/dismiss-booking-update-review", async (
            Guid tripId,
            Guid id,
            Guid activityId,
            TravelAssistantDbContext database) =>
        {
            var activity = await database.ItineraryItems.SingleOrDefaultAsync(item =>
                item.Id == activityId && item.BookingId == id && item.TripId == tripId);
            if (activity is null)
            {
                return Results.NotFound();
            }

            activity.HasPendingBookingUpdateReview = false;
            activity.PendingBookingChangeFields = null;
            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("DismissBookingUpdateReview");

        routes.MapPost("/bookings/{id:guid}/activities/{activityId:guid}/dismiss-activity-update-review", async (
            Guid tripId,
            Guid id,
            Guid activityId,
            TravelAssistantDbContext database) =>
        {
            var activity = await database.ItineraryItems.SingleOrDefaultAsync(item =>
                item.Id == activityId && item.BookingId == id && item.TripId == tripId);
            if (activity is null)
            {
                return Results.NotFound();
            }

            activity.HasPendingActivityUpdateReview = false;
            activity.PendingActivityChangeFields = null;
            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("DismissActivityUpdateReview");

        routes.MapPost("/bookings/{id:guid}/planned-costs/{plannedCostId:guid}", async (
            Guid tripId,
            Guid id,
            Guid plannedCostId,
            TravelAssistantDbContext database) =>
        {
            var booking = await FindBooking(tripId, id, database);
            var plannedCost = await database.PlannedCosts
                .Include(cost => cost.Booking)
                .SingleOrDefaultAsync(cost => cost.Id == plannedCostId && cost.TripId == tripId);
            if (booking is null || plannedCost is null)
            {
                return Results.NotFound();
            }

            if (booking.TotalCost is null || booking.TotalCost == 0)
            {
                return Results.Conflict("Add a total cost before linking this booking to the budget.");
            }

            if (booking.PlannedCost is not null && booking.PlannedCost.Id != plannedCost.Id)
            {
                return Results.Conflict("This booking already has a linked planned cost.");
            }

            if (plannedCost.BookingId is not null && plannedCost.BookingId != booking.Id)
            {
                return Results.Conflict("This planned cost is already linked to another booking.");
            }

            plannedCost.BookingId = booking.Id;
            plannedCost.HasPendingDeletedBookingNotice = false;
            await database.SaveChangesAsync();
            return Results.Ok(new { plannedCost.Id, plannedCost.BookingId });
        }).WithName("LinkBookingPlannedCost");

        routes.MapDelete("/bookings/{id:guid}/planned-costs/{plannedCostId:guid}", async (
            Guid tripId,
            Guid id,
            Guid plannedCostId,
            TravelAssistantDbContext database) =>
        {
            var plannedCost = await database.PlannedCosts.SingleOrDefaultAsync(cost =>
                cost.Id == plannedCostId && cost.TripId == tripId && cost.BookingId == id);
            if (plannedCost is null)
            {
                return Results.NotFound();
            }

            plannedCost.BookingId = null;
            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("UnlinkBookingPlannedCost");

        return app;
    }

    private static Task<Booking?> FindBooking(Guid tripId, Guid id, TravelAssistantDbContext database) =>
        database.Bookings
            .Include(booking => booking.Activities)
            .Include(booking => booking.PlannedCost)
                .ThenInclude(cost => cost!.Expense)
            .SingleOrDefaultAsync(booking => booking.Id == id && booking.TripId == tripId);

    private static void ApplyRequest(Booking booking, SaveBookingRequest request)
    {
        booking.Name = request.Name.Trim();
        booking.Category = request.Category;
        booking.Status = request.Status;
        booking.Provider = NormalizeOptionalText(request.Provider);
        booking.ConfirmationNumber = NormalizeOptionalText(request.ConfirmationNumber);
        booking.StartDate = request.StartDate;
        booking.StartTime = request.StartTime;
        booking.EndDate = request.EndDate;
        booking.EndTime = request.EndTime;
        booking.Location = NormalizeOptionalText(request.Location);
        booking.StartLocation = NormalizeOptionalText(request.StartLocation);
        booking.EndLocation = NormalizeOptionalText(request.EndLocation);
        booking.ReturnStartDate = request.ReturnStartDate;
        booking.ReturnStartTime = request.ReturnStartTime;
        booking.ReturnStartLocation = NormalizeOptionalText(request.ReturnStartLocation);
        booking.ReturnEndDate = request.ReturnEndDate;
        booking.ReturnEndTime = request.ReturnEndTime;
        booking.ReturnEndLocation = NormalizeOptionalText(request.ReturnEndLocation);
        booking.ExternalLink = NormalizeOptionalText(request.ExternalLink);
        booking.Note = NormalizeOptionalText(request.Note);
        booking.TotalCost = request.TotalCost;
        booking.AmountPaid = request.AmountPaid;
        booking.AmountRefunded = request.AmountRefunded == 0 ? null : request.AmountRefunded;
    }

    private static string? NormalizeOptionalText(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static List<string> GetChangedFields(
        Booking booking,
        SaveBookingRequest request,
        BookingActivityRole role)
    {
        var fields = new List<string>();
        var costChanged = booking.TotalCost != request.TotalCost;
        if (role == BookingActivityRole.Return)
        {
            var returnScheduleChanged = booking.ReturnStartDate != request.ReturnStartDate
                || booking.ReturnStartTime != request.ReturnStartTime
                || booking.ReturnEndDate != request.ReturnEndDate
                || booking.ReturnEndTime != request.ReturnEndTime;
            var returnLocationChanged = booking.ReturnStartLocation != NormalizeOptionalText(request.ReturnStartLocation)
                || booking.ReturnEndLocation != NormalizeOptionalText(request.ReturnEndLocation);
            if (returnScheduleChanged) fields.Add("schedule");
            if (returnLocationChanged) fields.Add("location");
            if (costChanged) fields.Add("cost");
            return fields;
        }

        var scheduleChanged = booking.StartDate != request.StartDate
            || booking.StartTime != request.StartTime
            || booking.EndDate != request.EndDate
            || booking.EndTime != request.EndTime;
        var locationChanged = role == BookingActivityRole.Outbound
            ? booking.StartLocation != NormalizeOptionalText(request.StartLocation)
                || booking.EndLocation != NormalizeOptionalText(request.EndLocation)
            : booking.Location != NormalizeOptionalText(request.Location);

        if (scheduleChanged) fields.Add("schedule");
        if (locationChanged) fields.Add("location");
        if (costChanged) fields.Add("cost");
        return fields;
    }

    private static string MergeChangeFields(string? existing, IEnumerable<string> changedFields) =>
        string.Join(",", (existing ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Concat(changedFields)
            .Distinct(StringComparer.Ordinal)
            .Order());

    private static object ToResponse(Booking booking) => new
    {
        booking.Id,
        booking.TripId,
        booking.Name,
        booking.Category,
        booking.Status,
        booking.Provider,
        booking.ConfirmationNumber,
        booking.StartDate,
        booking.StartTime,
        booking.EndDate,
        booking.EndTime,
        booking.Location,
        booking.StartLocation,
        booking.EndLocation,
        booking.ReturnStartDate,
        booking.ReturnStartTime,
        booking.ReturnStartLocation,
        booking.ReturnEndDate,
        booking.ReturnEndTime,
        booking.ReturnEndLocation,
        booking.ExternalLink,
        booking.Note,
        booking.TotalCost,
        booking.AmountPaid,
        booking.AmountRefunded,
        booking.HasPendingDeletedActivityNotice,
        booking.HasPendingDeletedPlannedCostNotice,
        booking.HasPendingDeletedExpenseNotice,
        FinancialStatus = GetFinancialStatus(booking),
        NetCost = booking.AmountPaid - (booking.AmountRefunded ?? 0),
        ActivityLinks = booking.Activities.Select(activity => new
        {
            activity.Id,
            activity.Name,
            activity.Date,
            activity.StartTime,
            Role = activity.BookingRole,
            activity.HasPendingBookingUpdateReview,
            activity.HasPendingActivityUpdateReview,
            activity.PendingBookingChangeFields,
            activity.PendingActivityChangeFields
        }),
        PlannedCostId = booking.PlannedCost?.Id,
        ExpenseId = booking.PlannedCost?.Expense?.Id,
        booking.CreatedAtUtc
    };

    private static string? GetFinancialStatus(Booking booking)
    {
        if (booking.TotalCost is null)
        {
            return null;
        }

        if (booking.TotalCost == 0)
        {
            return "Free";
        }

        if (booking.Status == BookingStatus.Cancelled && booking.AmountPaid > 0)
        {
            if (booking.AmountRefunded is null or 0)
            {
                return "NotRefunded";
            }

            return booking.AmountRefunded == booking.AmountPaid ? "FullyRefunded" : "PartiallyRefunded";
        }

        if (booking.AmountPaid == 0)
        {
            return "Unpaid";
        }

        return booking.AmountPaid == booking.TotalCost ? "Paid" : "PartiallyPaid";
    }
}
