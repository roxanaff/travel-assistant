using TravelAssistant.Contracts;
using TravelAssistant.Models;

namespace TravelAssistant.Validation;

public static class ItineraryItemValidation
{
    public static string? Validate(CreateItineraryItemRequest request, Trip trip)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return "Itinerary item name is required.";
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

        return null;
    }
}
