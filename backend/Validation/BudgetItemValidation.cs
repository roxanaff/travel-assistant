using TravelAssistant.Contracts;

namespace TravelAssistant.Validation;

/// <summary>Validates actual-expense input before an endpoint changes the database.</summary>
public static class BudgetItemValidation
{
    /// <summary>Returns a user-facing validation message, or <c>null</c> when the request is valid.</summary>
    public static string? Validate(CreateBudgetItemRequest request)
    {
        if (request.Amount <= 0)
        {
            return "Budget item amount must be greater than zero.";
        }

        return null;
    }
}
