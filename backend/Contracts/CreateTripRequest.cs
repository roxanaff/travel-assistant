using TravelAssistant.Models;

namespace TravelAssistant.Contracts;

public record CreateTripRequest(
    string Destination,
    DateOnly StartDate,
    DateOnly EndDate,
    TimeOnly? ArrivalTime,
    TripType Type,
    decimal Budget,
    decimal? GettingThereCost,
    string Currency
);
