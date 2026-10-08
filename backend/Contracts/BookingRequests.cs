// Booking details and activity-link choices received from the frontend.
// Endpoints check these requests before changing stored bookings or links.
using TravelAssistant.Models;

namespace TravelAssistant.Contracts;

public record SaveBookingRequest(
    string Name,
    BookingCategory? Category,
    BookingStatus? Status,
    string? Provider,
    string? ConfirmationNumber,
    DateOnly StartDate,
    TimeOnly? StartTime,
    DateOnly? EndDate,
    TimeOnly? EndTime,
    string? Location,
    string? StartLocation,
    string? EndLocation,
    DateOnly? ReturnStartDate,
    TimeOnly? ReturnStartTime,
    string? ReturnStartLocation,
    DateOnly? ReturnEndDate,
    TimeOnly? ReturnEndTime,
    string? ReturnEndLocation,
    string? ExternalLink,
    string? Note,
    decimal? TotalCost,
    decimal AmountPaid,
    decimal? AmountRefunded
);

public record LinkBookingActivityRequest(BookingActivityRole Role);
