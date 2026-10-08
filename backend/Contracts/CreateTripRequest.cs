// The editable trip details a browser sends when creating or updating a trip.
// This request is checked before the Trip database model is changed.
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
