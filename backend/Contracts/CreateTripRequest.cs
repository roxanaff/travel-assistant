using TravelAssistant.Models;

namespace TravelAssistant.Contracts;

/// <summary>Payload accepted for creating a trip or replacing its editable setup details.</summary>
public record CreateTripRequest(
    string Name,
    string? Destination,
    DateOnly? StartDate,
    DateOnly? EndDate,
    TimeOnly? ArrivalTime,
    TripType? Type,
    decimal? Budget,
    string Currency,
    string? Note
);
