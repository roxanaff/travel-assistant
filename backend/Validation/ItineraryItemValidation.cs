// Checks activity details before saving, including whether a chosen date
// fits within the trip. It reports a readable message when something is wrong.
using TravelAssistant.Contracts;
using TravelAssistant.Models;

namespace TravelAssistant.Validation;

/// <summary>
/// Validates itinerary input, including rules that depend on the dates configured for its parent trip.
/// </summary>
public static class ItineraryItemValidation
{
    /// <summary>Returns a user-facing validation message, or <c>null</c> when the request is valid.</summary>
    public static string? Validate(CreateItineraryItemRequest request, Trip trip)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return "Itinerary item name is required.";
        }

        if (request.Name.Trim().Length > 150)
        {
            return "Activity name cannot exceed 150 characters.";
        }

        if (request.Location?.Trim().Length > 300)
        {
            return "Location cannot exceed 300 characters.";
        }

        if (request.ExternalLink?.Trim().Length > 2000)
        {
            return "Link cannot exceed 2000 characters.";
        }

        if (request.Note?.Trim().Length > 1000)
        {
            return "Notes cannot exceed 1000 characters.";
        }

        if (request.StartTime is not null && request.Date is null)
        {
            return "A start time requires a date.";
        }

        if (request.Date is not null && (trip.StartDate is null || trip.EndDate is null || request.Date < trip.StartDate || request.Date > trip.EndDate))
        {
            return "The itinerary date must fall within the trip dates.";
        }

        if (request.DurationMinutes is <= 0)
        {
            return "Duration must be greater than zero.";
        }

        if (request.Cost < 0)
        {
            return "Cost cannot be negative.";
        }

        if (request.Cost > MoneyValidation.MaximumAmount)
        {
            return "Cost exceeds the supported maximum.";
        }

        return null;
    }
}
