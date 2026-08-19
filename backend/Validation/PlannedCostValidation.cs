using TravelAssistant.Contracts;

namespace TravelAssistant.Validation;

public static class PlannedCostValidation
{
    public static string? Validate(CreatePlannedCostRequest request)
    {
        if (request.Category is null)
        {
            return "A planned cost category is required.";
        }

        if (request.Amount <= 0)
        {
            return "Planned cost amount must be greater than zero.";
        }

        return null;
    }
}
