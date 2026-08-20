using TravelAssistant.Models;

namespace TravelAssistant.Contracts;

/// <summary>Payload accepted when creating or updating a planned trip cost.</summary>
public record CreatePlannedCostRequest(
    string? Name,
    PlannedCostCategory? Category,
    decimal Amount
);
