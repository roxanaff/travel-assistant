// Shape of a trip sent back to the frontend. It includes calculated display
// information as well as fields stored in the Trip database model.
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
    bool HasStartedTodoList,
    bool HasPendingTodoDeadlineReview,
    DateTimeOffset CreatedAtUtc,
    TripLifecycleStatus Status,
    int UnscheduledActivityCount
);
