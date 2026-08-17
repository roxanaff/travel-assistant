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
            await database.Trips.OrderBy(trip => trip.StartDate).ToListAsync()
        ).WithName("GetTrips");

        app.MapGet("/api/trips/{id:guid}", async (Guid id, TravelAssistantDbContext database) =>
        {
            var trip = await database.Trips.FindAsync(id);
            return trip is null ? Results.NotFound() : Results.Ok(trip);
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
                Destination = request.Destination.Trim(),
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                ArrivalTime = request.ArrivalTime,
                Type = request.Type,
                Budget = request.Budget,
                GettingThereCost = request.GettingThereCost,
                Currency = request.Currency.Trim().ToUpperInvariant()
            };

            database.Trips.Add(trip);
            await database.SaveChangesAsync();

            return Results.Created($"/api/trips/{trip.Id}", trip);
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

            trip.Destination = request.Destination.Trim();
            trip.StartDate = request.StartDate;
            trip.EndDate = request.EndDate;
            trip.ArrivalTime = request.ArrivalTime;
            trip.Type = request.Type;
            trip.Budget = request.Budget;
            trip.GettingThereCost = request.GettingThereCost;
            trip.Currency = request.Currency.Trim().ToUpperInvariant();

            await database.SaveChangesAsync();
            return Results.Ok(trip);
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
}
