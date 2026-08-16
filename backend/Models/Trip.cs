namespace TravelAssistant.Models;

public class Trip
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Destination { get; set; } = string.Empty;

    public DateOnly StartDate { get; set; }

    public DateOnly EndDate { get; set; }

    public TripType Type { get; set; } = TripType.Other;

    public decimal Budget { get; set; }

    public string Currency { get; set; } = "EUR";

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;

    public List<BudgetItem> BudgetItems { get; set; } = [];
}

public enum TripType
{
    CityBreak,
    Beach,
    Hiking,
    Skiing,
    Other
}

public enum BudgetCategory
{
    Accommodation,
    Transport,
    Food,
    Activities,
    Other
}
