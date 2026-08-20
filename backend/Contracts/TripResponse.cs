using TravelAssistant.Models;

namespace TravelAssistant.Contracts;

/// <summary>
/// Trip data returned to the frontend, including calculated information that is not stored on <c>Trip</c>.
/// </summary>
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
