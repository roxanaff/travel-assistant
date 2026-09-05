using Microsoft.EntityFrameworkCore;
using TravelAssistant.Contracts;
using TravelAssistant.Data;
using TravelAssistant.Models;
using TravelAssistant.Validation;

namespace TravelAssistant.Endpoints;

/// <summary>
/// Defines the top-level trip API. Updating a trip can also shift or unschedule affected itinerary items.
/// </summary>
public static class TripEndpoints
{
    /// <summary>Maps routes for listing, reading, creating, editing, and deleting trips.</summary>
    public static IEndpointRouteBuilder MapTripEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/trips", async (System.Security.Claims.ClaimsPrincipal principal, TravelAssistantDbContext database) =>
        {
            if (!principal.TryGetUserId(out var userId)) return Results.Unauthorized();
            var trips = await database.Trips.Where(trip => trip.UserId == userId).ToListAsync();
            return Results.Ok(trips.Select(ToResponse));
        }).RequireAuthorization().WithName("GetTrips");

        app.MapGet("/api/trips/{id:guid}", async (Guid id, System.Security.Claims.ClaimsPrincipal principal, TravelAssistantDbContext database) =>
        {
            if (!principal.TryGetUserId(out var userId)) return Results.Unauthorized();
            var trip = await database.Trips.SingleOrDefaultAsync(item => item.Id == id && item.UserId == userId);
            return trip is null ? Results.NotFound() : Results.Ok(ToResponse(trip));
        }).RequireAuthorization().WithName("GetTrip");

        app.MapPost("/api/trips", async (CreateTripRequest request, System.Security.Claims.ClaimsPrincipal principal, TravelAssistantDbContext database) =>
        {
            if (!principal.TryGetUserId(out var userId)) return Results.Unauthorized();
            var validationError = TripValidation.Validate(request);
            if (validationError is not null)
            {
                return Results.BadRequest(validationError);
            }

            var trip = new Trip
            {
                UserId = userId,
                Name = request.Name.Trim(),
                Destination = NormalizeOptionalText(request.Destination),
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                ArrivalTime = request.ArrivalTime,
                Type = request.Type,
                Budget = request.Budget,
                Currency = request.Currency.Trim().ToUpperInvariant(),
                Note = NormalizeOptionalText(request.Note)
            };

            database.Trips.Add(trip);
            await database.SaveChangesAsync();

            return Results.Created($"/api/trips/{trip.Id}", ToResponse(trip));
        }).RequireAuthorization().WithName("CreateTrip");

        app.MapPut("/api/trips/{id:guid}", async (Guid id, CreateTripRequest request, System.Security.Claims.ClaimsPrincipal principal, TravelAssistantDbContext database) =>
        {
            if (!principal.TryGetUserId(out var userId)) return Results.Unauthorized();
            var validationError = TripValidation.Validate(request);
            if (validationError is not null)
            {
                return Results.BadRequest(validationError);
            }

            var trip = await database.Trips.SingleOrDefaultAsync(item => item.Id == id && item.UserId == userId);
            if (trip is null)
            {
                return Results.NotFound();
            }

            // Keep the old date range so related scheduled activities can be adjusted after the edit.
            var previousStartDate = trip.StartDate;
            var previousEndDate = trip.EndDate;

            trip.Name = request.Name.Trim();
            trip.Destination = NormalizeOptionalText(request.Destination);
            trip.StartDate = request.StartDate;
            trip.EndDate = request.EndDate;
            trip.ArrivalTime = request.ArrivalTime;
            trip.Type = request.Type;
            trip.Budget = request.Budget;
            trip.Currency = request.Currency.Trim().ToUpperInvariant();
            trip.Note = NormalizeOptionalText(request.Note);

            var unscheduledActivityCount = await ApplyItineraryDateChanges(
                trip,
                previousStartDate,
                previousEndDate,
                database);
            await ApplyTodoDeadlineDateChanges(
                trip,
                previousStartDate,
                previousEndDate,
                database);

            await database.SaveChangesAsync();
            return Results.Ok(ToResponse(trip, unscheduledActivityCount));
        }).RequireAuthorization().WithName("UpdateTrip");

        app.MapDelete("/api/trips/{id:guid}", async (Guid id, System.Security.Claims.ClaimsPrincipal principal, TravelAssistantDbContext database) =>
        {
            if (!principal.TryGetUserId(out var userId)) return Results.Unauthorized();
            var trip = await database.Trips.SingleOrDefaultAsync(item => item.Id == id && item.UserId == userId);
            if (trip is null)
            {
                return Results.NotFound();
            }

            database.Trips.Remove(trip);
            await database.SaveChangesAsync();
            return Results.NoContent();
        }).RequireAuthorization().WithName("DeleteTrip");

        return app;
    }

    /// <summary>Stores blank optional text as <c>null</c>, avoiding meaningless whitespace values.</summary>
    private static string? NormalizeOptionalText(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    /// <summary>
    /// Preserves an itinerary's relative schedule when the trip moves without becoming shorter;
    /// otherwise removes dates that no longer fall within the trip. Returns the number unscheduled.
    /// </summary>
    private static async Task<int> ApplyItineraryDateChanges(
        Trip trip,
        DateOnly? previousStartDate,
        DateOnly? previousEndDate,
        TravelAssistantDbContext database)
    {
        var scheduledItems = await database.ItineraryItems
            .Where(item => item.TripId == trip.Id && item.Date != null)
            .ToListAsync();

        if (scheduledItems.Count == 0)
        {
            return 0;
        }

        if (trip.StartDate is null || trip.EndDate is null)
        {
            foreach (var item in scheduledItems)
            {
                item.Date = null;
                item.StartTime = null;
            }

            return scheduledItems.Count;
        }

        if (previousStartDate is not null && previousEndDate is not null)
        {
            var previousLength = previousEndDate.Value.DayNumber - previousStartDate.Value.DayNumber;
            var revisedLength = trip.EndDate.Value.DayNumber - trip.StartDate.Value.DayNumber;
            var startDateDifference = trip.StartDate.Value.DayNumber - previousStartDate.Value.DayNumber;

            if (revisedLength >= previousLength && startDateDifference != 0)
            {
                foreach (var item in scheduledItems)
                {
                    item.Date = item.Date!.Value.AddDays(startDateDifference);
                }

                return 0;
            }
        }

        var unscheduledCount = 0;
        foreach (var item in scheduledItems.Where(item =>
                     item.Date < trip.StartDate || item.Date > trip.EndDate))
        {
            item.Date = null;
            item.StartTime = null;
            unscheduledCount++;
        }

        return unscheduledCount;
    }

    /// <summary>
    /// Assigns a deadline when a draft trip first receives complete dates, but never moves existing deadlines.
    /// A later change to a complete date range prompts the user to review their saved deadlines.
    /// </summary>
    private static async Task ApplyTodoDeadlineDateChanges(
        Trip trip,
        DateOnly? previousStartDate,
        DateOnly? previousEndDate,
        TravelAssistantDbContext database)
    {
        if (trip.StartDate is null || trip.EndDate is null)
        {
            return;
        }

        var previouslyHadCompleteDates = previousStartDate is not null && previousEndDate is not null;
        if (!previouslyHadCompleteDates)
        {
            var tasksWithoutDeadlines = await database.TodoItems
                .Where(item => item.TripId == trip.Id && item.Deadline == null)
                .ToListAsync();

            foreach (var task in tasksWithoutDeadlines)
            {
                task.Deadline = trip.StartDate;
            }

            return;
        }

        if (previousStartDate != trip.StartDate || previousEndDate != trip.EndDate)
        {
            trip.HasPendingTodoDeadlineReview = true;
        }
    }

    /// <summary>Projects a database entity into the API shape, including calculated display values.</summary>
    private static TripResponse ToResponse(Trip trip, int unscheduledActivityCount = 0)
    {
        var status = GetStatus(trip, DateOnly.FromDateTime(DateTime.UtcNow));
        return new TripResponse(
            trip.Id,
            trip.Name,
            trip.Destination,
            trip.StartDate,
            trip.EndDate,
            trip.ArrivalTime,
            trip.Type,
            trip.Budget,
            trip.Currency,
            trip.Note,
            trip.HasStartedPackingList,
            trip.HasStartedTodoList,
            trip.HasPendingTodoDeadlineReview,
            trip.CreatedAtUtc,
            status,
            unscheduledActivityCount);
    }

    /// <summary>Derives the dashboard status from the trip's completeness and date range.</summary>
    private static TripLifecycleStatus GetStatus(Trip trip, DateOnly today)
    {
        if (string.IsNullOrWhiteSpace(trip.Destination) || trip.StartDate is null || trip.EndDate is null)
        {
            return TripLifecycleStatus.Draft;
        }

        if (trip.StartDate > today)
        {
            return TripLifecycleStatus.Upcoming;
        }

        return trip.EndDate < today ? TripLifecycleStatus.Past : TripLifecycleStatus.Ongoing;
    }
}
