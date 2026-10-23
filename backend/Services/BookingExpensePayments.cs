using TravelAssistant.Contracts;
using TravelAssistant.Models;
using TravelAssistant.Validation;

namespace TravelAssistant.Services;

public static class BookingExpensePayments
{
    public static (decimal Paid, decimal TotalCost) Project(Booking booking, decimal expenseAmount)
    {
        var paid = expenseAmount + (booking.AmountRefunded ?? 0);
        return (paid, Math.Max(booking.TotalCost ?? 0, paid));
    }

    public static string? Apply(Booking booking, decimal expenseAmount, BookingExpensePaymentUpdate update)
    {
        if (booking.AmountPaid != update.ExpectedPaid || booking.TotalCost != update.ExpectedTotalCost
            || booking.AmountRefunded != update.ExpectedRefunded || booking.Status != update.ExpectedStatus
            || expenseAmount != update.ExpectedExpenseAmount)
        {
            return "The booking payment or expense changed. Refresh before recording this payment.";
        }
        var projected = Project(booking, expenseAmount);
        var error = BookingValidation.Validate(LinkedRecordReviews.ToRequest(booking) with
        {
            AmountPaid = projected.Paid,
            TotalCost = projected.TotalCost,
        });
        if (error is not null) return error;
        booking.AmountPaid = projected.Paid;
        booking.TotalCost = projected.TotalCost;
        return null;
    }
}
