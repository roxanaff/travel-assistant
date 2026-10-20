namespace TravelAssistant.Models;

public enum LinkedRecordKind
{
    Booking,
    Activity,
    Expense,
    PlannedCost
}

/// <summary>A directional, explicitly reviewed change between two independent records.</summary>
public class LinkedRecordReview
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TripId { get; set; }
    public Trip Trip { get; set; } = null!;
    public LinkedRecordKind SourceKind { get; set; }
    public Guid SourceId { get; set; }
    public LinkedRecordKind TargetKind { get; set; }
    public Guid TargetId { get; set; }
    public string ChangesJson { get; set; } = "[]";
    public string TargetSnapshotJson { get; set; } = "{}";
    public Guid Revision { get; set; } = Guid.NewGuid();
    public bool IsMismatch { get; set; }
}
