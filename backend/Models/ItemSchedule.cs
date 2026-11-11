namespace TravelAssistant.Models;

public enum ItemScheduleKind
{
    Event,
    Journey,
    Stay,
    Rental,
    Validity,
    Visit
}

public enum ItemScheduleSlot
{
    Primary,
    Outbound,
    Return
}

/// <summary>Stores the shared schedule facts for one event, span or journey.</summary>
public class ItemSchedule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ItemCoreId { get; set; }
    public ItemCore ItemCore { get; set; } = null!;
    public ItemScheduleKind Kind { get; set; }
    public ItemScheduleSlot? FixedSlot { get; set; }
    public DateOnly? StartDate { get; set; }
    public TimeOnly? StartTime { get; set; }
    public DateOnly? EndDate { get; set; }
    public TimeOnly? EndTime { get; set; }
    public int? DurationMinutes { get; set; }
    public string? Location { get; set; }
    public string? StartLocation { get; set; }
    public string? EndLocation { get; set; }
}
