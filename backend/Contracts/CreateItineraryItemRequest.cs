using TravelAssistant.Models;

namespace TravelAssistant.Contracts;

public record CreateItineraryItemRequest(
    string Name,
    DateOnly Date,
    TimeOnly? StartTime,
    TimeOnly? EndTime,
    ItineraryCategory Category,
    decimal? Cost,
    string? Note
);
