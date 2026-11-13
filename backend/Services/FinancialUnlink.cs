using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using TravelAssistant.Data;
using TravelAssistant.Models;

namespace TravelAssistant.Services;

public static class FinancialUnlink
{
    public static async Task DetachExpenseAsync(
        TravelAssistantDbContext database, Expense expense, bool keepBookingCostAndPayment)
    {
        var originalPayment = expense.PaymentTotals;
        var core = new ItemCore { TripId = expense.TripId };
        var payment = new ItemPaymentTotals
        {
            ItemCore = core,
            Paid = originalPayment.Paid,
            Refunded = originalPayment.Refunded
        };
        database.ItemPaymentTotals.Add(payment);
        expense.ItemCore.Revision = Guid.NewGuid();
        expense.ItemCore = core;
        expense.PaymentTotals = payment;
        if (expense.PlannedCostId is Guid planId)
        {
            expense.PlannedCostId = null;
            await LinkedRecordReviews.ClearPairAsync(database, planId, expense.Id);
        }
        if (keepBookingCostAndPayment)
        {
            await ClearBookingLinkAsync(database, expense);
        }
        else
        {
            database.ChangeTracker.DetectChanges();
            database.ItemPaymentTotals.Remove(originalPayment);
        }
    }

    public static async Task DetachPlanAsync(
        TravelAssistantDbContext database, PlannedCost plan, Expense? expense, bool keepBookingCost)
    {
        var originalCost = plan.ItemCost;
        var originalCore = plan.ItemCore;
        originalCore.Revision = Guid.NewGuid();
        var core = new ItemCore { TripId = plan.TripId };
        var cost = new ItemCost { ItemCore = core, Cost = plan.Amount };
        database.ItemCosts.Add(cost);
        plan.ItemCore = core;
        plan.ItemCost = cost;
        if (expense is not null)
        {
            if (expense.ItemCoreId != originalCore.Id)
            {
                expense.ItemCore.Revision = Guid.NewGuid();
            }
            expense.PlannedCostId = null;
            await LinkedRecordReviews.ClearPairAsync(database, plan.Id, expense.Id);
        }
        if (!keepBookingCost)
        {
            database.ChangeTracker.DetectChanges();
            database.ItemCosts.Remove(originalCost);
        }
    }

    public static async Task ClearBookingLinkAsync(TravelAssistantDbContext database, Expense expense)
    {
        if (expense.BookingId is not Guid bookingId) return;
        expense.BookingId = null;
        await LinkedRecordReviews.ClearPairAsync(database, bookingId, expense.Id);
    }

    public static async Task<IResult> SaveAsync(
        TravelAssistantDbContext database, IDbContextTransaction? transaction)
    {
        try
        {
            await database.SaveChangesAsync();
            if (transaction is not null) await transaction.CommitAsync();
        }
        catch (Exception exception) when (BudgetRelationshipConstraintErrors.IsFinancialItemWriteConflict(exception))
        {
            return Results.Conflict("The linked entries changed. Refresh before unlinking.");
        }
        return Results.NoContent();
    }
}
