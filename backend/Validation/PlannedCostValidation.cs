using TravelAssistant.Contracts;

namespace TravelAssistant.Validation;

/// <summary>Validates expected-cost input before an endpoint changes the database.</summary>
public static class PlannedCostValidation
{
    /// <summary>Returns a user-facing validation message, or <c>null</c> when the request is valid.</summary>
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
