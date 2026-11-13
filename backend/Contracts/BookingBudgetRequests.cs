// Details for recording spending directly from a booking.
using TravelAssistant.Models;

namespace TravelAssistant.Contracts;

/// <summary>
/// Creates an actual expense linked directly to a booking, without creating a plan.
/// </summary>
public record CreateBookingExpenseRequest(
    string? Name,
    ExpenseCategory? Category,
    decimal Amount,
    DateOnly? ExpenseDate,
    BookingExpensePaymentUpdate? PaymentUpdate = null
);

public record BookingExpensePaymentUpdate(
    decimal ExpectedPaid,
    decimal ExpectedTotalCost,
    decimal? ExpectedRefunded,
    BookingStatus? ExpectedStatus,
    decimal ExpectedExpenseAmount);

public record LinkBookingExpenseRequest(BookingExpenseLinkSelection? Selection = null);

public record BookingExpenseLinkSelection(
    Guid BookingRevision,
    Guid ExpenseRevision,
    BookingExpensePaymentSource? PaymentSource,
    BookingExpenseTotalSource? TotalSource = null);

public enum BookingExpenseTotalSource
{
    Booking,
    PlannedCost
}

public enum BookingExpensePaymentSource
{
    Booking,
    Expense
}
