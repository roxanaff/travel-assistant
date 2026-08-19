using Microsoft.EntityFrameworkCore;
using TravelAssistant.Contracts;
using TravelAssistant.Data;
using TravelAssistant.Models;
using TravelAssistant.Validation;

namespace TravelAssistant.Endpoints;

public static class PlannedCostEndpoints
{
    public static IEndpointRouteBuilder MapPlannedCostEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/trips/{tripId:guid}/planned-costs", async (Guid tripId, TravelAssistantDbContext database) =>
        {
            var tripExists = await database.Trips.AnyAsync(trip => trip.Id == tripId);
            if (!tripExists)
            {
                return Results.NotFound();
            }

            var plannedCosts = await database.PlannedCosts
                .Where(cost => cost.TripId == tripId)
                .OrderBy(cost => cost.CreatedAtUtc)
                .ToListAsync();

            return Results.Ok(plannedCosts);
        }).WithName("GetPlannedCosts");

        app.MapPost("/api/trips/{tripId:guid}/planned-costs", async (Guid tripId, CreatePlannedCostRequest request, TravelAssistantDbContext database) =>
        {
            var validationError = PlannedCostValidation.Validate(request);
            if (validationError is not null)
            {
                return Results.BadRequest(validationError);
            }

            var tripExists = await database.Trips.AnyAsync(trip => trip.Id == tripId);
            if (!tripExists)
            {
                return Results.NotFound();
            }

            var plannedCost = new PlannedCost
            {
                TripId = tripId,
                Name = NormalizeName(request.Name),
                Category = request.Category!.Value,
                Amount = request.Amount
            };

            database.PlannedCosts.Add(plannedCost);
            await database.SaveChangesAsync();
            return Results.Created($"/api/trips/{tripId}/planned-costs/{plannedCost.Id}", plannedCost);
        }).WithName("CreatePlannedCost");

        app.MapPut("/api/trips/{tripId:guid}/planned-costs/{id:guid}", async (Guid tripId, Guid id, CreatePlannedCostRequest request, TravelAssistantDbContext database) =>
        {
            var validationError = PlannedCostValidation.Validate(request);
            if (validationError is not null)
            {
                return Results.BadRequest(validationError);
            }

            var plannedCost = await database.PlannedCosts
                .SingleOrDefaultAsync(cost => cost.Id == id && cost.TripId == tripId);
            if (plannedCost is null)
            {
                return Results.NotFound();
            }

            plannedCost.Name = NormalizeName(request.Name);
            plannedCost.Category = request.Category!.Value;
            plannedCost.Amount = request.Amount;

            await database.SaveChangesAsync();
            return Results.Ok(plannedCost);
        }).WithName("UpdatePlannedCost");

        app.MapDelete("/api/trips/{tripId:guid}/planned-costs/{id:guid}", async (Guid tripId, Guid id, TravelAssistantDbContext database) =>
        {
            var plannedCost = await database.PlannedCosts
                .SingleOrDefaultAsync(cost => cost.Id == id && cost.TripId == tripId);
            if (plannedCost is null)
            {
                return Results.NotFound();
            }

            database.PlannedCosts.Remove(plannedCost);
            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("DeletePlannedCost");

        return app;
    }

    private static string NormalizeName(string? name) =>
        string.IsNullOrWhiteSpace(name) ? "Cost item" : name.Trim();
}
