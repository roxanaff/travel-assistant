using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using TravelAssistant.Data;
using Xunit;

namespace TravelAssistant.Tests;

public class BudgetRelationshipConstraintErrorsTests
{
    [Fact]
    public void BookingExpenseMatcherAcceptsOnlyItsUniqueIndex()
    {
        var matching = CreateSqliteException(
            2067,
            "UNIQUE constraint failed: Expenses.BookingId");
        var wrongColumn = CreateSqliteException(
            2067,
            "UNIQUE constraint failed: Expenses.PlannedCostId");
        var foreignKey = CreateSqliteException(
            787,
            "FOREIGN KEY constraint failed");

        Assert.True(BudgetRelationshipConstraintErrors.IsBookingExpenseViolation(matching));
        Assert.False(BudgetRelationshipConstraintErrors.IsBookingExpenseViolation(wrongColumn));
        Assert.False(BudgetRelationshipConstraintErrors.IsBookingExpenseViolation(foreignKey));
    }

    [Theory]
    [InlineData(2067, "Expenses.PlannedCostId")]
    [InlineData(2067, "Expenses.ItemCoreId")]
    [InlineData(1555, "ItemPaymentTotals.ItemCoreId")]
    public void PlannedCostExpenseMatcherRecognizesDuplicateStorage(int extendedErrorCode, string column)
    {
        var matching = CreateSqliteException(
            extendedErrorCode,
            $"UNIQUE constraint failed: {column}");
        var notNull = CreateSqliteException(
            1299,
            "NOT NULL constraint failed: Expenses.Name");

        Assert.True(BudgetRelationshipConstraintErrors.IsPlannedCostExpenseViolation(matching));
        Assert.False(BudgetRelationshipConstraintErrors.IsPlannedCostExpenseViolation(notNull));
    }

    private static DbUpdateException CreateSqliteException(
        int extendedErrorCode,
        string message) => new(
            "Could not save changes.",
            new SqliteException(message, 19, extendedErrorCode));
}
