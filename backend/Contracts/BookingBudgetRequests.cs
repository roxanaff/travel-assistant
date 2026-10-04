using TravelAssistant.Models;

namespace TravelAssistant.Contracts;

/// <summary>
/// Creates an expense for a booking and, when needed, the planned cost that connects it to the budget.
/// </summary>
public record CreateBookingExpenseRequest(
    CreatePlannedCostRequest? PlannedCost,
    string? Name,
    ExpenseCategory? Category,
    decimal Amount,
    DateOnly? ExpenseDate
);
