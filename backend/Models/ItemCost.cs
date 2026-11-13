namespace TravelAssistant.Models;

/// <summary>Stores the expected or confirmed total cost of an item.</summary>
public class ItemCost
{
    public Guid ItemCoreId { get; set; }
    public ItemCore ItemCore { get; set; } = null!;
    public decimal? Cost { get; set; }
    public PlannedCost? PlannedCost { get; set; }
}
