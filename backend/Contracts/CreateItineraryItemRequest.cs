using TravelAssistant.Models;

namespace TravelAssistant.Contracts;

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
    string? Note
);
