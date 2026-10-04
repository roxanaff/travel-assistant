using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace TravelAssistant.Data;

/// <summary>
/// Identifies the two database constraints that keep booking budget relationships one-to-one.
/// </summary>
public static class BudgetRelationshipConstraintErrors
{
    private const string BookingPlannedCostIndex = "IX_PlannedCosts_BookingId";
    private const string PlannedCostExpenseIndex = "IX_Expenses_PlannedCostId";

    public static bool IsBookingPlannedCostViolation(DbUpdateException exception) =>
        IsUniqueViolation(
            exception,
            BookingPlannedCostIndex,
            "PlannedCosts.BookingId");

    public static bool IsPlannedCostExpenseViolation(DbUpdateException exception) =>
        IsUniqueViolation(
            exception,
            PlannedCostExpenseIndex,
            "Expenses.PlannedCostId");

    private static bool IsUniqueViolation(
        DbUpdateException exception,
        string postgresConstraintName,
        string sqliteColumnName)
    {
        if (exception.InnerException is PostgresException postgresException)
        {
            return postgresException.SqlState == PostgresErrorCodes.UniqueViolation
                && postgresException.ConstraintName == postgresConstraintName;
        }

        if (exception.InnerException is SqliteException sqliteException)
        {
            const int sqliteUniqueConstraint = 2067;
            return sqliteException.SqliteExtendedErrorCode == sqliteUniqueConstraint
                && sqliteException.Message.Contains(
                    sqliteColumnName,
                    StringComparison.OrdinalIgnoreCase);
        }

        return false;
    }
}
