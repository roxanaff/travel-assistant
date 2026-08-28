using TravelAssistant.Contracts;

namespace TravelAssistant.Validation;

/// <summary>Validates actual-expense input before an endpoint changes the database.</summary>
public static class ExpenseValidation
{
    /// <summary>Returns a user-facing validation message, or <c>null</c> when the request is valid.</summary>
    public static string? Validate(CreateExpenseRequest request)
    {
        if (request.Amount <= 0)
        {
            return "Expense amount must be greater than zero.";
        }

        if (request.Amount > MoneyValidation.MaximumAmount)
        {
            return "Expense amount exceeds the supported maximum.";
        }

        return null;
    }
}
