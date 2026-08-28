using Microsoft.EntityFrameworkCore;
using TravelAssistant.Contracts;
using TravelAssistant.Data;
using TravelAssistant.Models;
using TravelAssistant.Validation;

namespace TravelAssistant.Endpoints;

/// <summary>
/// Defines the API workflow for estimated trip costs before they become actual expenses.
/// </summary>
public static class PlannedCostEndpoints
{
    /// <summary>Maps all routes that create, read, update, or delete a trip's planned costs.</summary>
    public static IEndpointRouteBuilder MapPlannedCostEndpoints(this IEndpointRouteBuilder app)
    {
        var routes = app.MapOwnedTripGroup();
        routes.MapGet("/planned-costs", async (Guid tripId, TravelAssistantDbContext database) =>
        {
            var tripExists = await database.Trips.AnyAsync(trip => trip.Id == tripId);
            if (!tripExists)
            {
                return Results.NotFound();
            }

            var plannedCosts = await database.PlannedCosts
                .Where(cost => cost.TripId == tripId)
                .OrderBy(cost => cost.CreatedAtUtc)
                .Select(cost => new
                {
                    cost.Id,
                    cost.TripId,
                    cost.Name,
                    cost.Category,
                    cost.Amount,
                    cost.CreatedAtUtc,
                    // The UI uses this derived flag to show whether a planned cost has been spent.
                    ExpenseAdded = cost.Expense != null,
                    ExpenseId = cost.Expense != null ? cost.Expense.Id : (Guid?)null
                })
                .ToListAsync();

            return Results.Ok(plannedCosts);
        }).WithName("GetPlannedCosts");

        routes.MapPost("/planned-costs", async (Guid tripId, CreatePlannedCostRequest request, TravelAssistantDbContext database) =>
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

        routes.MapPut("/planned-costs/{id:guid}", async (Guid tripId, Guid id, CreatePlannedCostRequest request, TravelAssistantDbContext database) =>
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

        routes.MapDelete("/planned-costs/{id:guid}", async (Guid tripId, Guid id, TravelAssistantDbContext database) =>
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

    /// <summary>Provides a consistent display name when an optional planned-cost name is omitted.</summary>
    private static string NormalizeName(string? name) =>
        string.IsNullOrWhiteSpace(name) ? "Cost item" : name.Trim();
}
