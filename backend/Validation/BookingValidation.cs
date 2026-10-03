using TravelAssistant.Contracts;
using TravelAssistant.Models;

namespace TravelAssistant.Validation;

public static class BookingValidation
{
    public static string? Validate(SaveBookingRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return "Booking name is required.";
        }

        if (request.Name.Trim().Length > 150)
        {
            return "Booking name cannot exceed 150 characters.";
        }

        var textLengthError = ValidateTextLengths(request);
        if (textLengthError is not null)
        {
            return textLengthError;
        }

        if (request.TotalCost < 0 || request.AmountPaid < 0 || request.AmountRefunded < 0)
        {
            return "Booking amounts cannot be negative.";
        }

        if (request.TotalCost > MoneyValidation.MaximumAmount
            || request.AmountPaid > MoneyValidation.MaximumAmount
            || request.AmountRefunded > MoneyValidation.MaximumAmount)
        {
            return "A booking amount exceeds the supported maximum.";
        }

        if (request.TotalCost is null && request.AmountPaid > 0)
        {
            return "Enter the total cost before entering an amount paid.";
        }

        if (request.TotalCost == 0 && (request.AmountPaid > 0 || request.AmountRefunded > 0))
        {
            return "A free booking cannot have payment or refund amounts.";
        }

        if (request.TotalCost is not null && request.AmountPaid > request.TotalCost)
        {
            return "Amount paid cannot exceed the total cost.";
        }

        if (request.AmountRefunded > request.AmountPaid)
        {
            return "Amount refunded cannot exceed the amount paid.";
        }

        if (request.AmountRefunded > 0 && request.Status != BookingStatus.Cancelled)
        {
            return "Refunds can be recorded only for a cancelled booking.";
        }

        var endError = ValidateRange(
            request.StartDate,
            request.StartTime,
            request.EndDate,
            request.EndTime,
            "Booking end cannot be before its start.");
        if (endError is not null)
        {
            return endError;
        }

        return ValidateReturnJourney(request);
    }

    private static string? ValidateReturnJourney(SaveBookingRequest request)
    {
        var hasReturnDetails = request.ReturnStartDate is not null
            || request.ReturnStartTime is not null
            || request.ReturnStartLocation is not null
            || request.ReturnEndDate is not null
            || request.ReturnEndTime is not null
            || request.ReturnEndLocation is not null;

        if (!hasReturnDetails)
        {
            return null;
        }

        if (request.Category is not BookingCategory.Flight and not BookingCategory.RailBusFerry)
        {
            return "Return journeys are available only for flight, train, bus, or ferry bookings.";
        }

        if (request.ReturnStartDate is null)
        {
            return "A return journey requires a departure date.";
        }

        if (request.ReturnStartDate < request.StartDate)
        {
            return "Return departure cannot be before outbound departure.";
        }

        if (request.ReturnStartDate == request.StartDate
            && request.StartTime is not null
            && request.ReturnStartTime is not null
            && request.ReturnStartTime < request.StartTime)
        {
            return "Return departure cannot be before outbound departure.";
        }

        return ValidateRange(
            request.ReturnStartDate.Value,
            request.ReturnStartTime,
            request.ReturnEndDate,
            request.ReturnEndTime,
            "Return arrival cannot be before return departure.");
    }

    private static string? ValidateRange(
        DateOnly startDate,
        TimeOnly? startTime,
        DateOnly? endDate,
        TimeOnly? endTime,
        string message)
    {
        var effectiveEndDate = endDate ?? (endTime is not null ? startDate : null);
        if (effectiveEndDate is null)
        {
            return null;
        }

        if (effectiveEndDate < startDate)
        {
            return message;
        }

        if (effectiveEndDate == startDate
            && startTime is not null
            && endTime is not null
            && endTime < startTime)
        {
            return message;
        }

        return null;
    }

    private static string? ValidateTextLengths(SaveBookingRequest request)
    {
        if (request.Provider?.Trim().Length > 200)
        {
            return "Provider cannot exceed 200 characters.";
        }

        if (request.ConfirmationNumber?.Trim().Length > 100)
        {
            return "Confirmation number cannot exceed 100 characters.";
        }

        if (new[]
            {
                request.Location,
                request.StartLocation,
                request.EndLocation,
                request.ReturnStartLocation,
                request.ReturnEndLocation
            }.Any(value => value?.Trim().Length > 300))
        {
            return "A booking location cannot exceed 300 characters.";
        }

        if (request.ExternalLink?.Trim().Length > 2000)
        {
            return "Booking link cannot exceed 2000 characters.";
        }

        if (!string.IsNullOrWhiteSpace(request.ExternalLink)
            && (!Uri.TryCreate(request.ExternalLink.Trim(), UriKind.Absolute, out var link)
                || link.Scheme is not "http" and not "https"))
        {
            return "Enter a valid booking link.";
        }

        if (request.Note?.Trim().Length > 1000)
        {
            return "Booking notes cannot exceed 1000 characters.";
        }

        return null;
    }
}
