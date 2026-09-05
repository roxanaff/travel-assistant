namespace TravelAssistant.Models;

/// <summary>
/// A manually managed task in one trip's to-do checklist.
/// </summary>
public class TodoItem
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TripId { get; set; }

    public Trip Trip { get; set; } = null!;

    public string Name { get; set; } = string.Empty;

    public TodoCategory? Category { get; set; }

    /// <summary>
    /// The optional date by which the task should be completed.
    /// </summary>
    public DateOnly? Deadline { get; set; }

    public bool IsCompleted { get; set; }

    /// <summary>
    /// Stores the user's manual checklist order independently of completion state.
    /// </summary>
    public int SortOrder { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}

/// <summary>Groups to-do tasks into the fixed categories available in the first release.</summary>
public enum TodoCategory
{
    TravelAndTransport,
    Accommodation,
    DocumentsAndMoney,
    BookingsAndActivities,
    Health,
    Connectivity,
    BeforeLeaving,
    Other
}
