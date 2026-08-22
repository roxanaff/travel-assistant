using Microsoft.EntityFrameworkCore;
using TravelAssistant.Contracts;
using TravelAssistant.Data;
using TravelAssistant.Models;
using TravelAssistant.Validation;

namespace TravelAssistant.Endpoints;

/// <summary>
/// Defines the API workflow for actual expenses: list a trip's expenses, create one, edit it, or delete it.
/// </summary>
public static class ExpenseEndpoints
{
    /// <summary>Maps all routes whose resource is an actual expense recorded for a trip.</summary>
    public static IEndpointRouteBuilder MapExpenseEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/trips/{tripId:guid}/expenses", async (Guid tripId, TravelAssistantDbContext database) =>
        {
            var tripExists = await database.Trips.AnyAsync(trip => trip.Id == tripId);
            if (!tripExists)
            {
                return Results.NotFound();
            }

            var expenses = await database.Expenses
                .Where(item => item.TripId == tripId)
                .OrderBy(item => item.CreatedAtUtc)
                .ToListAsync();

            return Results.Ok(expenses);
        }).WithName("GetExpenses");

        app.MapPost("/api/trips/{tripId:guid}/expenses", async (Guid tripId, CreateExpenseRequest request, TravelAssistantDbContext database) =>
        {
            var validationError = ExpenseValidation.Validate(request);
            if (validationError is not null)
            {
                return Results.BadRequest(validationError);
            }

            var tripExists = await database.Trips.AnyAsync(trip => trip.Id == tripId);
            if (!tripExists)
            {
                return Results.NotFound();
            }

            // A planned cost may be converted into only one actual expense for the same trip.
            if (request.PlannedCostId is not null)
            {
                var plannedCostExists = await database.PlannedCosts.AnyAsync(cost =>
                    cost.Id == request.PlannedCostId && cost.TripId == tripId);
                var expenseAlreadyAdded = await database.Expenses.AnyAsync(item =>
                    item.PlannedCostId == request.PlannedCostId);
                if (!plannedCostExists || expenseAlreadyAdded)
                {
                    return Results.BadRequest("This planned cost has already been added to expenses.");
                }
            }

            var expense = new Expense
            {
                TripId = tripId,
                Name = NormalizeName(request.Name),
                PlannedCostId = request.PlannedCostId,
                Category = request.Category,
                Amount = request.Amount,
                ExpenseDate = request.ExpenseDate
            };

            database.Expenses.Add(expense);
            await database.SaveChangesAsync();
            return Results.Created($"/api/trips/{tripId}/expenses/{expense.Id}", expense);
        }).WithName("CreateExpense");

        app.MapPut("/api/trips/{tripId:guid}/expenses/{id:guid}", async (Guid tripId, Guid id, CreateExpenseRequest request, TravelAssistantDbContext database) =>
        {
            var validationError = ExpenseValidation.Validate(request);
            if (validationError is not null)
            {
                return Results.BadRequest(validationError);
            }

            var expense = await database.Expenses.SingleOrDefaultAsync(item => item.Id == id && item.TripId == tripId);
            if (expense is null)
            {
                return Results.NotFound();
            }

            // Relinking would make expense/planned-cost tracking ambiguous; delete and recreate instead.
            if (request.PlannedCostId != expense.PlannedCostId)
            {
                return Results.BadRequest("A linked planned cost cannot be changed.");
            }

            expense.Name = NormalizeName(request.Name);
            expense.Category = request.Category;
            expense.Amount = request.Amount;
            expense.ExpenseDate = request.ExpenseDate;

            await database.SaveChangesAsync();
            return Results.Ok(expense);
        }).WithName("UpdateExpense");

        app.MapDelete("/api/trips/{tripId:guid}/expenses/{id:guid}", async (Guid tripId, Guid id, TravelAssistantDbContext database) =>
        {
            var expense = await database.Expenses.SingleOrDefaultAsync(item => item.Id == id && item.TripId == tripId);
            if (expense is null)
            {
                return Results.NotFound();
            }

            database.Expenses.Remove(expense);
            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("DeleteExpense");

        return app;
    }

    /// <summary>Provides a consistent display name when an optional expense name is omitted.</summary>
    private static string NormalizeName(string? name) =>
        string.IsNullOrWhiteSpace(name) ? "Cost item" : name.Trim();
}
