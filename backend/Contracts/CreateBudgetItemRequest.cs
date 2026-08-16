using TravelAssistant.Models;

namespace TravelAssistant.Contracts;

public record CreateBudgetItemRequest(
    string Name,
    BudgetCategory Category,
    decimal Amount);
