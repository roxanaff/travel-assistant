using TravelAssistant.Contracts;

namespace TravelAssistant.Validation;

public static class TripValidation
{
    public static string? Validate(CreateTripRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Destination))
        {
            return "Destination is required.";
        }

        if (request.EndDate < request.StartDate)
        {
            return "End date must be on or after the start date.";
        }

        if (request.Budget < 0)
        {
            return "Budget cannot be negative.";
        }

        if (request.GettingThereCost < 0)
        {
            return "Getting-there cost cannot be negative.";
        }

        if (string.IsNullOrWhiteSpace(request.Currency) || request.Currency.Trim().Length != 3)
        {
            return "Currency must be a three-letter code, such as EUR.";
        }

        return null;
    }
}
