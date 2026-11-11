namespace TravelAssistant.Models;

/// <summary>Identifies an independent item or a group of related entries within one trip.</summary>
public class ItemCore
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TripId { get; set; }
    public Trip Trip { get; set; } = null!;
    public Guid Revision { get; set; } = Guid.NewGuid();
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
