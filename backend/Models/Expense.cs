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

    public Guid ItemCoreId { get; set; }

    public ItemCore ItemCore { get; set; } = null!;

    public ItemPaymentTotals PaymentTotals { get; set; } = null!;

    public string Name { get; set; } = "Cost item";

    public Guid? PlannedCostId { get; set; }

    public PlannedCost? PlannedCost { get; set; }

    public Guid? BookingId { get; set; }

    public Booking? Booking { get; set; }

    public bool HasPendingDeletedBookingNotice { get; set; }

    public ExpenseCategory? Category { get; set; }

    public decimal Amount => new PaymentAmounts(PaymentTotals.Paid, PaymentTotals.Refunded).Net;

    public DateOnly? ExpenseDate { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
