using TravelAssistant.Contracts;

namespace TravelAssistant.Validation;

public static class BudgetItemValidation
{
    public static string? Validate(CreateBudgetItemRequest request)
    {
        if (request.Amount <= 0)
        {
            return "Budget item amount must be greater than zero.";
        }

        return null;
    }
}
