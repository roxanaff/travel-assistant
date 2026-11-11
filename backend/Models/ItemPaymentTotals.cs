namespace TravelAssistant.Models;

/// <summary>Stores the aggregate amounts paid and refunded for an item.</summary>
public class ItemPaymentTotals
{
    public Guid ItemCoreId { get; set; }
    public ItemCore ItemCore { get; set; } = null!;
    public decimal Paid { get; set; }
    public decimal Refunded { get; set; }
}
