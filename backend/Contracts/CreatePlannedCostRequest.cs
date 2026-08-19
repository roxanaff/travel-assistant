using TravelAssistant.Models;

namespace TravelAssistant.Contracts;

public record CreatePlannedCostRequest(
    string? Name,
    PlannedCostCategory? Category,
    decimal Amount
);
