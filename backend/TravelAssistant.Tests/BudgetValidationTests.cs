using TravelAssistant.Contracts;
using TravelAssistant.Models;
using TravelAssistant.Validation;
using Xunit;

namespace TravelAssistant.Tests;

public class BudgetValidationTests
{
    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void BudgetItemValidate_ReturnsError_WhenAmountIsNotPositive(decimal amount) =>
        Assert.Equal("Budget item amount must be greater than zero.",
            BudgetItemValidation.Validate(new CreateBudgetItemRequest(null, null, amount, null, null)));

    [Fact]
    public void BudgetItemValidate_ReturnsNull_WhenAmountIsPositive() =>
        Assert.Null(BudgetItemValidation.Validate(new CreateBudgetItemRequest("Hotel", BudgetCategory.Accommodation, 1, null, null)));

    [Fact]
    public void PlannedCostValidate_ReturnsError_WhenCategoryIsMissing() =>
        Assert.Equal("A planned cost category is required.",
            PlannedCostValidation.Validate(new CreatePlannedCostRequest("Hotel", null, 100)));

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void PlannedCostValidate_ReturnsError_WhenAmountIsNotPositive(decimal amount) =>
        Assert.Equal("Planned cost amount must be greater than zero.",
            PlannedCostValidation.Validate(new CreatePlannedCostRequest("Hotel", PlannedCostCategory.Accommodation, amount)));

    [Fact]
    public void PlannedCostValidate_ReturnsNull_WhenRequestIsValid() =>
        Assert.Null(PlannedCostValidation.Validate(new CreatePlannedCostRequest("Hotel", PlannedCostCategory.Accommodation, 100)));
}
