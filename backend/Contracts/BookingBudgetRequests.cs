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

public record LinkBookingExpenseRequest(BookingExpensePaymentUpdate? PaymentUpdate);
