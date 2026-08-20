using TravelAssistant.Contracts;

namespace TravelAssistant.Validation;

/// <summary>Validates the editable trip setup before an endpoint saves it.</summary>
public static class TripValidation
{
    /// <summary>Returns a user-facing validation message, or <c>null</c> when the request is valid.</summary>
    public static string? Validate(CreateTripRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return "Trip name is required.";
        }

        if (request.Name.Trim().Length > 150)
        {
            return "Trip name must be 150 characters or fewer.";
        }

        if ((request.StartDate is null) != (request.EndDate is null))
        {
            return "Enter both a start date and an end date, or leave both blank.";
        }

        if (request.StartDate is not null && request.EndDate < request.StartDate)
        {
            return "End date must be on or after the start date.";
        }

        if (request.Budget is < 0)
        {
            return "Target budget cannot be negative.";
        }

        if (string.IsNullOrWhiteSpace(request.Currency) || request.Currency.Trim().Length != 3)
        {
            return "Currency must be a three-letter code, such as EUR.";
        }

        return null;
    }
}
