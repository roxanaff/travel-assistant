namespace TravelAssistant.Models;

/// <summary>
/// The aggregate root for a journey. Its child collections hold the itinerary, packing, planned-cost,
/// and actual-expense data that belongs to it.
/// </summary>
public class Trip
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>The account that owns this trip.</summary>
    public Guid UserId { get; set; }

    public User User { get; set; } = null!;
    
    public string Name { get; set; } = string.Empty;

    public string? Destination { get; set; }

    public DateOnly? StartDate { get; set; }

    public DateOnly? EndDate { get; set; }

    public TimeOnly? ArrivalTime { get; set; }

    public TripType? Type { get; set; }

    public decimal? Budget { get; set; }

    public string Currency { get; set; } = "EUR";
    
    public string? Note { get; set; }

    /// <summary>
    /// Records that the user has chosen either the default list or an empty checklist.
    /// </summary>
    public bool HasStartedPackingList { get; set; }

    /// <summary>
    /// Records that the user has chosen either the default list or an empty to-do checklist.
    /// </summary>
    public bool HasStartedTodoList { get; set; }

    /// <summary>
    /// Indicates that complete trip dates changed and task deadlines should be reviewed.
    /// </summary>
    public bool HasPendingTodoDeadlineReview { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;

    public List<Expense> Expenses { get; set; } = [];

    public List<PlannedCost> PlannedCosts { get; set; } = [];

    public List<ItineraryItem> ItineraryItems { get; set; } = [];

    public List<PackingItem> PackingItems { get; set; } = [];

    public List<TodoItem> TodoItems { get; set; } = [];
}

/// <summary>High-level trip styles selected during setup.</summary>
public enum TripType
{
    CityBreak,
    Beach,
    Hiking,
    Skiing,
    WorkTrip,
    VisitingFriendsAndFamily,
    RoadTrip,
    CabinStay,
    Camping,
    Cruise,
    AllInclusiveResort,
    MountaineeringAndClimbing,
    FestivalOrEvent,
    Other
}

/// <summary>Categories used when recording actual expenses.</summary>
public enum ExpenseCategory
{
    TravelToFrom,
    Accommodation,
    LocalTransport,
    Food,
    ActivitiesAndMuseums,
    BarsAndNightlife,
    Shopping,
    Other
}
