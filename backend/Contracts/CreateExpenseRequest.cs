using TravelAssistant.Models;

namespace TravelAssistant.Contracts;

/// <summary>Payload accepted when the frontend creates or updates an actual trip expense.</summary>
public record CreateExpenseRequest(
    string? Name,
    ExpenseCategory? Category,
    decimal Amount,
    DateOnly? ExpenseDate,
    Guid? PlannedCostId
);
