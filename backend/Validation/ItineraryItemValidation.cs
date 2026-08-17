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

        if (trip.StartDate is null || trip.EndDate is null || request.Date < trip.StartDate || request.Date > trip.EndDate)
        {
            return "The itinerary date must fall within the trip dates.";
        }

        if (request.StartTime is not null && request.EndTime is not null && request.EndTime < request.StartTime)
        {
            return "End time must be later than the start time.";
        }

        if (request.Cost < 0)
        {
            return "Cost cannot be negative.";
        }

        return null;
    }
}
