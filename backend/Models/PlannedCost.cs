namespace TravelAssistant.Models;

/// <summary>
/// Represents a budgeted cost before it has been spent; it may later link to one actual expense.
/// </summary>
public class PlannedCost
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TripId { get; set; }

    public Trip Trip { get; set; } = null!;

    public string Name { get; set; } = "Cost item";

    public PlannedCostCategory Category { get; set; }

    public decimal Amount { get; set; }

    public Expense? Expense { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}

/// <summary>Categories used when planning a trip's expected costs.</summary>
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
