using System.Security.Cryptography;
using System.Text.Json;
using TravelAssistant.Models;

namespace TravelAssistant.Services;

public sealed record OutsideBookingDate(string Field, DateOnly Date);
public sealed record OutsideBookingDates(string Key, List<OutsideBookingDate> Dates);

public static class BookingDateWarnings
{
    public static OutsideBookingDates? Get(Booking booking)
    {
        var trip = booking.Trip;
        if (trip.StartDate is null || trip.EndDate is null) return null;
        var dates = new Dictionary<string, DateOnly?>
        {
            ["StartDate"] = booking.StartDate,
            ["EndDate"] = booking.EndDate,
            ["ReturnStartDate"] = booking.ReturnStartDate,
            ["ReturnEndDate"] = booking.ReturnEndDate,
        };
        var outside = dates
            .Where(pair => pair.Value is not null
                && (pair.Value < trip.StartDate || pair.Value > trip.EndDate))
            .Select(pair => new OutsideBookingDate(pair.Key, pair.Value!.Value))
            .ToList();
        if (outside.Count == 0) return null;
        var key = Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(new
        {
            trip.StartDate,
            trip.EndDate,
            Dates = dates,
        })));
        return new OutsideBookingDates(key, outside);
    }
}
