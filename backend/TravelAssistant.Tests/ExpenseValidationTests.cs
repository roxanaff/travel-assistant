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
    public void ExpenseValidate_ReturnsError_WhenAmountIsNotPositive(decimal amount) =>
        Assert.Equal("Expense amount must be greater than zero.",
            ExpenseValidation.Validate(new CreateExpenseRequest(null, null, amount, null, null)));

    [Fact]
    public void ExpenseValidate_ReturnsNull_WhenAmountIsPositive() =>
        Assert.Null(ExpenseValidation.Validate(new CreateExpenseRequest("Hotel", ExpenseCategory.Accommodation, 1, null, null)));

    [Fact]
    public void ExpenseValidate_ReturnsError_WhenAmountExceedsSupportedMaximum() =>
        Assert.Equal("Expense amount exceeds the supported maximum.",
            ExpenseValidation.Validate(new CreateExpenseRequest("Hotel", ExpenseCategory.Accommodation, 1_000_000_000m, null, null)));

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

    [Fact]
    public void PlannedCostValidate_ReturnsError_WhenAmountExceedsSupportedMaximum() =>
        Assert.Equal("Planned cost amount exceeds the supported maximum.",
            PlannedCostValidation.Validate(new CreatePlannedCostRequest("Hotel", PlannedCostCategory.Accommodation, 1_000_000_000m)));
}
