namespace TravelAssistant.Models;

/// <summary>
/// A manually managed item in one trip's packing checklist.
/// </summary>
public class PackingItem
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TripId { get; set; }

    public Trip Trip { get; set; } = null!;

    public string Name { get; set; } = string.Empty;

    public PackingCategory? Category { get; set; }

    public int Quantity { get; set; } = 1;

    public bool IsPacked { get; set; }

    /// <summary>
    /// Stores the user's manual checklist order independently of packed state.
    /// </summary>
    public int SortOrder { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}

/// <summary>Groups packing items into the checklist sections shown by the frontend.</summary>
public enum PackingCategory
{
    DocumentsAndMoney,
    Toiletries,
    Clothing,
    Electronics,
    Health,
    Other
}
