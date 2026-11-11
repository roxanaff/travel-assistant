// Database model for an expected trip cost and its optional actual expense.
namespace TravelAssistant.Models;

/// <summary>
/// Represents a budgeted cost before it has been spent; it may later link to one actual expense.
/// </summary>
public class PlannedCost
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TripId { get; set; }

    public Trip Trip { get; set; } = null!;

    public Guid ItemCoreId { get; set; }

    public ItemCore ItemCore { get; set; } = null!;

    public ItemCost ItemCost { get; set; } = null!;

    public string Name { get; set; } = "Cost item";

    public PlannedCostCategory? Category { get; set; }

    public decimal Amount => ItemCost.Cost ?? throw new InvalidOperationException("A planned cost requires an item cost amount.");

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
