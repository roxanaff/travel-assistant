namespace TravelAssistant.Models;

public class BudgetItem
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TripId { get; set; }

    public Trip Trip { get; set; } = null!;

    public string Name { get; set; } = string.Empty;

    public BudgetCategory Category { get; set; } = BudgetCategory.Other;

    public decimal Amount { get; set; }

    public DateOnly? ExpenseDate { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
