// Checks actual-expense details, including amount limits, before saving.
// The endpoint separately checks any link to a planned cost.
using TravelAssistant.Contracts;

namespace TravelAssistant.Validation;

/// <summary>Validates actual-expense input before an endpoint changes the database.</summary>
public static class ExpenseValidation
{
    /// <summary>Returns a user-facing validation message, or <c>null</c> when the request is valid.</summary>
    public static string? Validate(CreateExpenseRequest request)
    {
        if (request.Name?.Trim().Length > 150)
        {
            return "Expense name cannot be longer than 150 characters.";
        }

        if ((request.Amount is not null && (request.Paid is not null || request.Refunded is not null))
            || (request.Refunded is not null && request.Paid is null))
        {
            return "Enter either an expense amount or paid and refunded amounts.";
        }

        var paid = request.Paid ?? request.Amount;
        if (paid is null or <= 0)
        {
            return request.Paid is null
                ? "Expense amount must be greater than zero."
                : "Paid must be greater than zero.";
        }

        if (paid > MoneyValidation.MaximumAmount)
        {
            return "Expense amount exceeds the supported maximum.";
        }

        if (request.Refunded < 0 || request.Refunded > paid)
        {
            return "Refunded must be between zero and the amount paid.";
        }

        if ((request.Paid is decimal gross && decimal.Round(gross, 2) != gross)
            || (request.Refunded is decimal refund && decimal.Round(refund, 2) != refund))
        {
            return "Use up to two decimal places for expense payments and refunds.";
        }

        return null;
    }
}
