// The expected-cost details sent to the API from a form. This is a request
// shape, not the PlannedCost record stored in the database.
using TravelAssistant.Models;

namespace TravelAssistant.Contracts;

/// <summary>Payload accepted when creating or updating a planned trip cost.</summary>
public record CreatePlannedCostRequest(
    string? Name,
    PlannedCostCategory? Category,
    decimal Amount
);
