// Handles requests for money actually spent. It checks that an optional
// planned-cost link is valid before saving an expense.
using Microsoft.EntityFrameworkCore;
using TravelAssistant.Contracts;
using TravelAssistant.Data;
using TravelAssistant.Models;
using TravelAssistant.Validation;
using TravelAssistant.Services;

namespace TravelAssistant.Endpoints;

/// <summary>
/// Defines the API workflow for actual expenses: list a trip's expenses, create one, edit it, or delete it.
/// </summary>
public static class ExpenseEndpoints
{
    /// <summary>Maps all routes whose resource is an actual expense recorded for a trip.</summary>
    public static IEndpointRouteBuilder MapExpenseEndpoints(this IEndpointRouteBuilder app)
    {
        var routes = app.MapOwnedTripGroup();
        routes.MapGet("/expenses", async (Guid tripId, TravelAssistantDbContext database) =>
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

            return Results.Ok(expenses.Select(ToResponse));
        }).WithName("GetExpenses");

        routes.MapPost("/expenses", async (Guid tripId, CreateExpenseRequest request, TravelAssistantDbContext database) =>
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
            PlannedCost? plan = null;
            if (request.PlannedCostId is Guid planId)
            {
                plan = await database.PlannedCosts.Include(cost => cost.ItemCore)
                    .SingleOrDefaultAsync(cost => cost.Id == planId && cost.TripId == tripId);
                var expenseAlreadyAdded = await database.Expenses.AnyAsync(item =>
                    item.TripId == tripId && item.PlannedCostId == planId);
                if (plan is null || expenseAlreadyAdded)
                {
                    return Results.Conflict("This planned cost has already been added to expenses.");
                }
            }

            var core = plan?.ItemCore ?? new ItemCore { TripId = tripId };
            if (plan is not null)
            {
                core.Revision = Guid.NewGuid();
            }
            var expense = new Expense
            {
                TripId = tripId,
                Name = NormalizeName(request.Name),
                PlannedCostId = request.PlannedCostId,
                Category = request.Category,
                ItemCore = core,
                PaymentTotals = new ItemPaymentTotals { ItemCore = core, Paid = request.Amount },
                ExpenseDate = request.ExpenseDate
            };

            database.Expenses.Add(expense);
            if (plan is not null)
            {
                await LinkedRecordReviews.InitialiseExpenseLinkAsync(database, plan, expense);
            }
            try
            {
                await database.SaveChangesAsync();
            }
            catch (DbUpdateException exception) when (
                plan is not null && BudgetRelationshipConstraintErrors.IsPlannedCostExpenseViolation(exception))
            {
                return Results.Conflict("This planned cost has already been added to expenses.");
            }
            catch (DbUpdateException exception) when (
                plan is not null && (BudgetRelationshipConstraintErrors.IsFinancialItemWriteConflict(exception)
                    || BudgetRelationshipConstraintErrors.IsMissingExpensePlanViolation(exception)))
            {
                return Results.Conflict("The related planned cost changed. Refresh before adding an expense.");
            }

            return Results.Created($"/api/trips/{tripId}/expenses/{expense.Id}", ToResponse(expense));
        }).WithName("CreateExpense");

        routes.MapPut("/expenses/{id:guid}", async (Guid tripId, Guid id, CreateExpenseRequest request, TravelAssistantDbContext database) =>
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
            expense.PaymentTotals.Paid = request.Amount;
            expense.ExpenseDate = request.ExpenseDate;

            await LinkedRecordReviews.TrackAsync(database, expense);
            await database.SaveChangesAsync();
            return Results.Ok(ToResponse(expense));
        }).WithName("UpdateExpense");

        routes.MapDelete("/expenses/{id:guid}", async (Guid tripId, Guid id, TravelAssistantDbContext database) =>
        {
            var expense = await database.Expenses
                .Include(item => item.Booking)
                .Include(item => item.ItemCore)
                .SingleOrDefaultAsync(item => item.Id == id && item.TripId == tripId);
            if (expense is null)
            {
                return Results.NotFound();
            }

            if (expense.Booking is not null)
            {
                expense.Booking.HasPendingDeletedExpenseNotice = true;
            }

            database.Expenses.Remove(expense);
            var hasPlan = await database.PlannedCosts.AnyAsync(item => item.ItemCoreId == expense.ItemCoreId);
            if (hasPlan)
            {
                expense.ItemCore.Revision = Guid.NewGuid();
                database.ItemPaymentTotals.Remove(expense.PaymentTotals);
            }
            else
            {
                database.ItemCores.Remove(expense.ItemCore);
            }
            await LinkedRecordReviews.ClearRecordAsync(database, tripId, id);
            try
            {
                await database.SaveChangesAsync();
            }
            catch (DbUpdateException exception) when (BudgetRelationshipConstraintErrors.IsFinancialItemWriteConflict(exception))
            {
                return Results.Conflict("The expense or a related record changed. Refresh before deleting it.");
            }
            return Results.NoContent();
        }).WithName("DeleteExpense");

        routes.MapPost("/expenses/{id:guid}/dismiss-deleted-booking-notice", async (
            Guid tripId,
            Guid id,
            TravelAssistantDbContext database) =>
        {
            var expense = await database.Expenses.SingleOrDefaultAsync(item => item.Id == id && item.TripId == tripId);
            if (expense is null)
            {
                return Results.NotFound();
            }

            expense.HasPendingDeletedBookingNotice = false;
            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("DismissExpenseDeletedBookingNotice");

        return app;
    }

    /// <summary>Provides a consistent display name when an optional expense name is omitted.</summary>
    private static object ToResponse(Expense expense) => new
    {
        expense.Id,
        expense.TripId,
        expense.Name,
        expense.Category,
        expense.Amount,
        expense.ExpenseDate,
        expense.PlannedCostId,
        expense.BookingId,
        expense.HasPendingDeletedBookingNotice,
        expense.CreatedAtUtc
    };

    private static string NormalizeName(string? name) =>
        string.IsNullOrWhiteSpace(name) ? "Cost item" : name.Trim();
}
