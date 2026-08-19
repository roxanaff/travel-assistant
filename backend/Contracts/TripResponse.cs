using TravelAssistant.Models;

namespace TravelAssistant.Contracts;

public record TripResponse(
    Guid Id,
    string Name,
    string? Destination,
    DateOnly? StartDate,
    DateOnly? EndDate,
    TimeOnly? ArrivalTime,
    TripType? Type,
    decimal? Budget,
    string Currency,
    string? Note,
    bool HasStartedPackingList,
    DateTimeOffset CreatedAtUtc,
    TripLifecycleStatus Status,
    int UnscheduledActivityCount
);
