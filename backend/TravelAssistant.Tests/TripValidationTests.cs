using TravelAssistant.Contracts;
using TravelAssistant.Validation;
using Xunit;

namespace TravelAssistant.Tests;

public class TripValidationTests
{
    [Fact]
    public void Validate_ReturnsError_WhenNameIsBlank() =>
        Assert.Equal("Trip name is required.", TripValidation.Validate(CreateRequest(name: "  ")));

    [Fact]
    public void Validate_ReturnsError_WhenNameExceeds150Characters() =>
        Assert.Equal("Trip name must be 150 characters or fewer.", TripValidation.Validate(CreateRequest(name: new string('a', 151))));

    [Fact]
    public void Validate_ReturnsError_WhenOnlyOneDateIsProvided() =>
        Assert.Equal("Enter both a start date and an end date, or leave both blank.",
            TripValidation.Validate(CreateRequest(startDate: new DateOnly(2026, 9, 1))));

    [Fact]
    public void Validate_ReturnsError_WhenEndDatePrecedesStartDate() =>
        Assert.Equal("End date must be on or after the start date.",
            TripValidation.Validate(CreateRequest(new DateOnly(2026, 9, 2), new DateOnly(2026, 9, 1))));

    [Fact]
    public void Validate_ReturnsError_WhenBudgetIsNegative() =>
        Assert.Equal("Target budget cannot be negative.", TripValidation.Validate(CreateRequest(budget: -1)));

    [Theory]
    [InlineData("")]
    [InlineData("EU")]
    [InlineData("EURO")]
    public void Validate_ReturnsError_WhenCurrencyIsNotThreeLetters(string currency) =>
        Assert.Equal("Currency must be a three-letter code, such as EUR.",
            TripValidation.Validate(CreateRequest(currency: currency)));

    [Fact]
    public void Validate_ReturnsNull_ForAValidTrip() =>
        Assert.Null(TripValidation.Validate(CreateRequest(new DateOnly(2026, 9, 1), new DateOnly(2026, 9, 7), 1200, "eur")));

    private static CreateTripRequest CreateRequest(
        DateOnly? startDate = null, DateOnly? endDate = null, decimal? budget = 100, string currency = "EUR", string name = "Summer holiday") =>
        new(name, "Rome", startDate, endDate, null, null, budget, currency, null);
}
