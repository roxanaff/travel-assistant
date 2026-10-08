// The activity details sent to the API when an itinerary item is saved.
// Validation checks them before the stored ItineraryItem is changed.
using TravelAssistant.Models;

namespace TravelAssistant.Contracts;

/// <summary>Payload accepted when the frontend creates or updates an itinerary activity.</summary>
public record CreateItineraryItemRequest(
    string Name,
    DateOnly? Date,
    TimeOnly? StartTime,
    int? DurationMinutes,
    TimeOnly? OpeningTime,
    TimeOnly? ClosingTime,
    ItineraryCategory? Category,
    decimal? Cost,
    string? Location,
    string? ExternalLink,
    ItineraryPriority Priority,
    string? Note,
    bool BookingRequired = false
);
