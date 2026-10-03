using TravelAssistant.Contracts;
using TravelAssistant.Models;
using TravelAssistant.Validation;
using Xunit;

namespace TravelAssistant.Tests;

public class BookingValidationTests
{
    [Fact]
    public void Validate_RejectsPaymentAboveTotalCost()
    {
        var request = ValidRequest(totalCost: 100, amountPaid: 101);

        Assert.Equal("Amount paid cannot exceed the total cost.", BookingValidation.Validate(request));
    }

    [Fact]
    public void Validate_RejectsRefundForActiveBooking()
    {
        var request = ValidRequest(totalCost: 100, amountPaid: 100, amountRefunded: 20);

        Assert.Equal("Refunds can be recorded only for a cancelled booking.", BookingValidation.Validate(request));
    }

    [Fact]
    public void Validate_RejectsEndBeforeStart()
    {
        var request = ValidRequest(
            endDate: new DateOnly(2027, 4, 1),
            endTime: new TimeOnly(12, 0));

        Assert.Equal("Booking end cannot be before its start.", BookingValidation.Validate(request));
    }

    [Fact]
    public void Validate_RejectsReturnJourneyForRestaurant()
    {
        var request = ValidRequest(
            category: BookingCategory.Restaurant,
            returnStartDate: new DateOnly(2027, 4, 4));

        Assert.Equal(
            "Return journeys are available only for flight, train, bus, or ferry bookings.",
            BookingValidation.Validate(request));
    }

    [Fact]
    public void Validate_AcceptsPartiallyRefundedCancelledBooking()
    {
        var request = ValidRequest(
            status: BookingStatus.Cancelled,
            totalCost: 100,
            amountPaid: 100,
            amountRefunded: 80);

        Assert.Null(BookingValidation.Validate(request));
    }

    [Fact]
    public void Validate_AcceptsEndTimeWithoutStartTime()
    {
        var request = ValidRequest(endTime: new TimeOnly(12, 0)) with
        {
            StartTime = null
        };

        Assert.Null(BookingValidation.Validate(request));
    }

    [Fact]
    public void Validate_AcceptsReturnArrivalTimeWithoutReturnDepartureTime()
    {
        var request = ValidRequest(returnStartDate: new DateOnly(2027, 4, 4)) with
        {
            ReturnEndTime = new TimeOnly(12, 0)
        };

        Assert.Null(BookingValidation.Validate(request));
    }

    private static SaveBookingRequest ValidRequest(
        BookingCategory? category = BookingCategory.Flight,
        BookingStatus? status = BookingStatus.Confirmed,
        DateOnly? endDate = null,
        TimeOnly? endTime = null,
        DateOnly? returnStartDate = null,
        decimal? totalCost = null,
        decimal amountPaid = 0,
        decimal? amountRefunded = null) => new(
            "Flight to Rome",
            category,
            status,
            "Airline",
            "ABC123",
            new DateOnly(2027, 4, 2),
            new TimeOnly(9, 0),
            endDate,
            endTime,
            null,
            "Berlin",
            "Rome",
            returnStartDate,
            null,
            null,
            null,
            null,
            null,
            "https://example.com/booking",
            null,
            totalCost,
            amountPaid,
            amountRefunded);
}
