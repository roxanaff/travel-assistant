using TravelAssistant.Contracts;
using TravelAssistant.Models;
using TravelAssistant.Validation;
using Xunit;

namespace TravelAssistant.Tests;

public class ItineraryItemValidationTests
{
    private static readonly Trip DatedTrip = new() { StartDate = new DateOnly(2026, 9, 1), EndDate = new DateOnly(2026, 9, 7) };

    [Fact]
    public void Validate_ReturnsError_WhenNameIsBlank() =>
        Assert.Equal("Itinerary item name is required.", ItineraryItemValidation.Validate(CreateRequest(name: " "), DatedTrip));

    [Fact]
    public void Validate_ReturnsError_WhenTextExceedsDatabaseLimits()
    {
        Assert.Equal(
            "Activity name cannot exceed 150 characters.",
            ItineraryItemValidation.Validate(CreateRequest(name: new string('a', 151)), DatedTrip));
        Assert.Equal(
            "Location cannot exceed 300 characters.",
            ItineraryItemValidation.Validate(CreateRequest(location: new string('a', 301)), DatedTrip));
        Assert.Equal(
            "Link cannot exceed 2000 characters.",
            ItineraryItemValidation.Validate(CreateRequest(externalLink: new string('a', 2001)), DatedTrip));
        Assert.Equal(
            "Notes cannot exceed 1000 characters.",
            ItineraryItemValidation.Validate(CreateRequest(note: new string('a', 1001)), DatedTrip));
    }

    [Fact]
    public void Validate_ReturnsError_WhenTimeHasNoDate() =>
        Assert.Equal("A start time requires a date.", ItineraryItemValidation.Validate(CreateRequest(startTime: new TimeOnly(9, 0)), DatedTrip));

    [Theory]
    [InlineData(2026, 8, 31)]
    [InlineData(2026, 9, 8)]
    public void Validate_ReturnsError_WhenDateFallsOutsideTrip(int year, int month, int day) =>
        Assert.Equal("The itinerary date must fall within the trip dates.",
            ItineraryItemValidation.Validate(CreateRequest(date: new DateOnly(year, month, day)), DatedTrip));

    [Theory]
    [InlineData(0)]
    [InlineData(-30)]
    public void Validate_ReturnsError_WhenDurationIsNotPositive(int duration) =>
        Assert.Equal("Duration must be greater than zero.", ItineraryItemValidation.Validate(CreateRequest(duration: duration), DatedTrip));

    [Fact]
    public void Validate_ReturnsError_WhenCostIsNegative() =>
        Assert.Equal("Cost cannot be negative.", ItineraryItemValidation.Validate(CreateRequest(cost: -0.01m), DatedTrip));

    [Fact]
    public void Validate_ReturnsError_WhenCostExceedsSupportedMaximum() =>
        Assert.Equal("Cost exceeds the supported maximum.",
            ItineraryItemValidation.Validate(CreateRequest(cost: 1_000_000_000m), DatedTrip));

    [Fact]
    public void Validate_ReturnsNull_ForValidScheduledItem() =>
        Assert.Null(ItineraryItemValidation.Validate(CreateRequest(new DateOnly(2026, 9, 3), new TimeOnly(9, 0), 90, 20), DatedTrip));

    [Fact]
    public void Validate_ReturnsNull_ForValidUnscheduledItem() =>
        Assert.Null(ItineraryItemValidation.Validate(CreateRequest(), DatedTrip));

    private static CreateItineraryItemRequest CreateRequest(
        DateOnly? date = null,
        TimeOnly? startTime = null,
        int? duration = null,
        decimal? cost = null,
        string name = "Museum",
        string? location = null,
        string? externalLink = null,
        string? note = null) =>
        new(
            name,
            date,
            startTime,
            duration,
            null,
            null,
            null,
            cost,
            location,
            externalLink,
            ItineraryPriority.Optional,
            note);
}
