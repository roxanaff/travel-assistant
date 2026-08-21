using TravelAssistant.Validation;
using Xunit;

namespace TravelAssistant.Tests;

public class PackingItemValidationTests
{
    [Fact]
    public void Validate_ReturnsError_WhenNameIsBlank() =>
        Assert.Equal("A packing item name is required.", PackingItemValidation.Validate(" ", 1));

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Validate_ReturnsError_WhenQuantityIsNotPositive(int quantity) =>
        Assert.Equal("Packing item quantity must be greater than zero.", PackingItemValidation.Validate("Passport", quantity));

    [Fact]
    public void Validate_ReturnsNull_WhenQuantityIsNotProvided() =>
        Assert.Null(PackingItemValidation.Validate("Passport", null));

    [Fact]
    public void Validate_ReturnsNull_ForValidItem() =>
        Assert.Null(PackingItemValidation.Validate("Passport", 1));
}
