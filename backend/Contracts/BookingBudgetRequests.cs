// Details for recording spending from a booking. The request can include a
// new planned cost so the expense has a place in the trip budget.
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
