using Microsoft.EntityFrameworkCore;
using TravelAssistant.Contracts;
using TravelAssistant.Data;
using TravelAssistant.Models;
using TravelAssistant.Validation;

namespace TravelAssistant.Endpoints;

public static class TripEndpoints
{
    public static IEndpointRouteBuilder MapTripEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/trips", async (TravelAssistantDbContext database) =>
            (await database.Trips.ToListAsync()).Select(ToResponse)
        ).WithName("GetTrips");

        app.MapGet("/api/trips/{id:guid}", async (Guid id, TravelAssistantDbContext database) =>
        {
            var trip = await database.Trips.FindAsync(id);
            return trip is null ? Results.NotFound() : Results.Ok(ToResponse(trip));
        }).WithName("GetTrip");

        app.MapPost("/api/trips", async (CreateTripRequest request, TravelAssistantDbContext database) =>
        {
            var validationError = TripValidation.Validate(request);
            if (validationError is not null)
            {
                return Results.BadRequest(validationError);
            }

            var trip = new Trip
            {
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
        }).WithName("CreateTrip");

        app.MapPut("/api/trips/{id:guid}", async (Guid id, CreateTripRequest request, TravelAssistantDbContext database) =>
        {
            var validationError = TripValidation.Validate(request);
            if (validationError is not null)
            {
                return Results.BadRequest(validationError);
            }

            var trip = await database.Trips.FindAsync(id);
            if (trip is null)
            {
                return Results.NotFound();
            }

            trip.Name = request.Name.Trim();
            trip.Destination = NormalizeOptionalText(request.Destination);
            trip.StartDate = request.StartDate;
            trip.EndDate = request.EndDate;
            trip.ArrivalTime = request.ArrivalTime;
            trip.Type = request.Type;
            trip.Budget = request.Budget;
            trip.Currency = request.Currency.Trim().ToUpperInvariant();
            trip.Note = NormalizeOptionalText(request.Note);

            await database.SaveChangesAsync();
            return Results.Ok(ToResponse(trip));
        }).WithName("UpdateTrip");

        app.MapDelete("/api/trips/{id:guid}", async (Guid id, TravelAssistantDbContext database) =>
        {
            var trip = await database.Trips.FindAsync(id);
            if (trip is null)
            {
                return Results.NotFound();
            }

            database.Trips.Remove(trip);
            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("DeleteTrip");

        return app;
    }

    private static string? NormalizeOptionalText(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static TripResponse ToResponse(Trip trip)
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
            trip.CreatedAtUtc,
            status);
    }

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
