using Microsoft.EntityFrameworkCore;
using TravelAssistant.Contracts;
using TravelAssistant.Data;
using TravelAssistant.Models;
using TravelAssistant.Validation;

namespace TravelAssistant.Endpoints;

public static class BudgetItemEndpoints
{
    public static IEndpointRouteBuilder MapBudgetItemEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/trips/{tripId:guid}/budget-items", async (Guid tripId, TravelAssistantDbContext database) =>
        {
            var tripExists = await database.Trips.AnyAsync(trip => trip.Id == tripId);
            if (!tripExists)
            {
                return Results.NotFound();
            }

            var budgetItems = await database.BudgetItems
                .Where(item => item.TripId == tripId)
                .OrderBy(item => item.CreatedAtUtc)
                .ToListAsync();

            return Results.Ok(budgetItems);
        }).WithName("GetBudgetItems");

        app.MapPost("/api/trips/{tripId:guid}/budget-items", async (Guid tripId, CreateBudgetItemRequest request, TravelAssistantDbContext database) =>
        {
            var validationError = BudgetItemValidation.Validate(request);
            if (validationError is not null)
            {
                return Results.BadRequest(validationError);
            }

            var tripExists = await database.Trips.AnyAsync(trip => trip.Id == tripId);
            if (!tripExists)
            {
                return Results.NotFound();
            }

            if (request.PlannedCostId is not null)
            {
                var plannedCostExists = await database.PlannedCosts.AnyAsync(cost =>
                    cost.Id == request.PlannedCostId && cost.TripId == tripId);
                var expenseAlreadyAdded = await database.BudgetItems.AnyAsync(item =>
                    item.PlannedCostId == request.PlannedCostId);
                if (!plannedCostExists || expenseAlreadyAdded)
                {
                    return Results.BadRequest("This planned cost has already been added to expenses.");
                }
            }

            var budgetItem = new BudgetItem
            {
                TripId = tripId,
                Name = NormalizeName(request.Name),
                PlannedCostId = request.PlannedCostId,
                Category = request.Category,
                Amount = request.Amount,
                ExpenseDate = request.ExpenseDate
            };

            database.BudgetItems.Add(budgetItem);
            await database.SaveChangesAsync();
            return Results.Created($"/api/trips/{tripId}/budget-items/{budgetItem.Id}", budgetItem);
        }).WithName("CreateBudgetItem");

        app.MapPut("/api/trips/{tripId:guid}/budget-items/{id:guid}", async (Guid tripId, Guid id, CreateBudgetItemRequest request, TravelAssistantDbContext database) =>
        {
            var validationError = BudgetItemValidation.Validate(request);
            if (validationError is not null)
            {
                return Results.BadRequest(validationError);
            }

            var budgetItem = await database.BudgetItems.SingleOrDefaultAsync(item => item.Id == id && item.TripId == tripId);
            if (budgetItem is null)
            {
                return Results.NotFound();
            }

            if (request.PlannedCostId != budgetItem.PlannedCostId)
            {
                return Results.BadRequest("A linked planned cost cannot be changed.");
            }

            budgetItem.Name = NormalizeName(request.Name);
            budgetItem.Category = request.Category;
            budgetItem.Amount = request.Amount;
            budgetItem.ExpenseDate = request.ExpenseDate;

            await database.SaveChangesAsync();
            return Results.Ok(budgetItem);
        }).WithName("UpdateBudgetItem");

        app.MapDelete("/api/trips/{tripId:guid}/budget-items/{id:guid}", async (Guid tripId, Guid id, TravelAssistantDbContext database) =>
        {
            var budgetItem = await database.BudgetItems.SingleOrDefaultAsync(item => item.Id == id && item.TripId == tripId);
            if (budgetItem is null)
            {
                return Results.NotFound();
            }

            database.BudgetItems.Remove(budgetItem);
            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("DeleteBudgetItem");

        return app;
    }

    private static string NormalizeName(string? name) =>
        string.IsNullOrWhiteSpace(name) ? "Cost item" : name.Trim();
}
