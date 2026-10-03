namespace TravelAssistant.Models;

/// <summary>Represents one reservation recorded for a trip.</summary>
public class Booking
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TripId { get; set; }

    public Trip Trip { get; set; } = null!;

    public string Name { get; set; } = string.Empty;

    public BookingCategory? Category { get; set; }

    public BookingStatus? Status { get; set; }

    public string? Provider { get; set; }

    public string? ConfirmationNumber { get; set; }

    public DateOnly StartDate { get; set; }

    public TimeOnly? StartTime { get; set; }

    public DateOnly? EndDate { get; set; }

    public TimeOnly? EndTime { get; set; }

    public string? Location { get; set; }

    public string? StartLocation { get; set; }

    public string? EndLocation { get; set; }

    public DateOnly? ReturnStartDate { get; set; }

    public TimeOnly? ReturnStartTime { get; set; }

    public string? ReturnStartLocation { get; set; }

    public DateOnly? ReturnEndDate { get; set; }

    public TimeOnly? ReturnEndTime { get; set; }

    public string? ReturnEndLocation { get; set; }

    public string? ExternalLink { get; set; }

    public string? Note { get; set; }

    /// <summary><c>null</c> means unknown, zero means explicitly free, and a positive value means paid or payable.</summary>
    public decimal? TotalCost { get; set; }

    public decimal AmountPaid { get; set; }

    public decimal? AmountRefunded { get; set; }

    public bool HasPendingDeletedActivityNotice { get; set; }

    public bool HasPendingDeletedPlannedCostNotice { get; set; }

    public bool HasPendingDeletedExpenseNotice { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;

    public List<ItineraryItem> Activities { get; set; } = [];

    public PlannedCost? PlannedCost { get; set; }
}

public enum BookingCategory
{
    Accommodation,
    Flight,
    RailBusFerry,
    LocalTransport,
    CarHire,
    MuseumAttraction,
    TourActivity,
    ConcertEvent,
    Restaurant,
    Other
}

public enum BookingStatus
{
    Requested,
    Confirmed,
    Cancelled
}

public enum BookingActivityRole
{
    General,
    Outbound,
    Return
}
