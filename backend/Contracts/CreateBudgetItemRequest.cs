using TravelAssistant.Models;

namespace TravelAssistant.Contracts;

/// <summary>Payload accepted when the frontend creates or updates an actual trip expense.</summary>
public record CreateBudgetItemRequest(
    string? Name,
    BudgetCategory? Category,
    decimal Amount,
    DateOnly? ExpenseDate,
    Guid? PlannedCostId
);
