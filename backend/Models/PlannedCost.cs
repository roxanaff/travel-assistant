namespace TravelAssistant.Models;

public class PlannedCost
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TripId { get; set; }

    public Trip Trip { get; set; } = null!;

    public string Name { get; set; } = "Cost item";

    public PlannedCostCategory Category { get; set; }

    public decimal Amount { get; set; }

    public BudgetItem? Expense { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}

public enum PlannedCostCategory
{
    TravelToFrom,
    Accommodation,
    LocalTransport,
    Food,
    ActivitiesAndMuseums,
    BarsAndNightlife,
    Shopping,
    EmergencyBuffer,
    Other
}
