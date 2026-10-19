// Database model for money actually spent on a trip. It may point to a
// planned cost and a booking independently, but remains its own record.
namespace TravelAssistant.Models;

/// <summary>
/// Represents one actual expense recorded against a trip, optionally linked to the plan it fulfils.
/// </summary>
public class Expense
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TripId { get; set; }

    public Trip Trip { get; set; } = null!;

    public string Name { get; set; } = "Cost item";

    public Guid? PlannedCostId { get; set; }

    public PlannedCost? PlannedCost { get; set; }

    public Guid? BookingId { get; set; }

    public Booking? Booking { get; set; }

    public bool HasPendingDeletedBookingNotice { get; set; }

    public ExpenseCategory? Category { get; set; }

    public decimal Amount { get; set; }

    public DateOnly? ExpenseDate { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
