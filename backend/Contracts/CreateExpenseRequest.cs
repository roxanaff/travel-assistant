// The actual-spending details sent to the API from the budget page. This is
// an incoming request; Models/Expense.cs describes the stored record.
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
