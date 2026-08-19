namespace TravelAssistant.Models;

public class ItineraryItem
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TripId { get; set; }

    public Trip Trip { get; set; } = null!;

    public string Name { get; set; } = string.Empty;

    public DateOnly? Date { get; set; }

    public TimeOnly? StartTime { get; set; }

    public int? DurationMinutes { get; set; }

    public TimeOnly? OpeningTime { get; set; }

    public TimeOnly? ClosingTime { get; set; }

    public ItineraryCategory? Category { get; set; }

    public decimal? Cost { get; set; }

    public string? Location { get; set; }

    public string? ExternalLink { get; set; }

    public ItineraryPriority Priority { get; set; } = ItineraryPriority.WouldLikeToDo;

    public string? Note { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}

public enum ItineraryCategory
{
    Museum,
    Tour,
    Event,
    Food,
    Beach,
    Bar,
    Attraction,
    Other
}

public enum ItineraryPriority
{
    MustDo,
    WouldLikeToDo,
    Optional
}
