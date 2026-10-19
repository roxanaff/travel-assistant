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

    [Fact]
    public void PlannedCostExpenseMatcherAcceptsOnlyItsUniqueIndex()
    {
        var matching = CreateSqliteException(
            2067,
            "UNIQUE constraint failed: Expenses.PlannedCostId");
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
