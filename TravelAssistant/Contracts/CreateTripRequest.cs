using TravelAssistant.Models;

namespace TravelAssistant.Contracts;

public record CreateTripRequest(
    string Destination,
    DateOnly StartDate,
    DateOnly EndDate,
    TripType Type,
    decimal Budget,
    string Currency);
