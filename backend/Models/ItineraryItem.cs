namespace TravelAssistant.Models;

public class ItineraryItem
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TripId { get; set; }

    public Trip Trip { get; set; } = null!;

    public string Name { get; set; } = string.Empty;

    public DateOnly Date { get; set; }

    public TimeOnly? StartTime { get; set; }

    public TimeOnly? EndTime { get; set; }

    public ItineraryCategory Category { get; set; } = ItineraryCategory.Other;

    public decimal? Cost { get; set; }

    public string? Note { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}

public enum ItineraryCategory
{
    Sightseeing,
    FoodAndDrink,
    Transport,
    Event,
    Activity,
    Other
}
