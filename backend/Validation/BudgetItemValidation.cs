using TravelAssistant.Contracts;

namespace TravelAssistant.Validation;

public static class BudgetItemValidation
{
    public static string? Validate(CreateBudgetItemRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return "Budget item name is required.";
        }

        if (request.Amount <= 0)
        {
            return "Budget item amount must be greater than zero.";
        }

        if (request.ExpenseDate is null)
        {
            return "Expense date is required.";
        }

        return null;
    }
}
