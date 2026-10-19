// Recognizes database errors caused by trying to create budget links that
// must be one-to-one, so endpoints can return a useful response.
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace TravelAssistant.Data;

/// <summary>
/// Identifies the two database constraints that keep booking budget relationships one-to-one.
/// </summary>
public static class BudgetRelationshipConstraintErrors
{
    private const string BookingExpenseIndex = "IX_Expenses_BookingId";
    private const string PlannedCostExpenseIndex = "IX_Expenses_PlannedCostId";

    public static bool IsBookingExpenseViolation(Exception exception) =>
        IsUniqueViolation(
            exception,
            BookingExpenseIndex,
            "Expenses.BookingId");

    public static bool IsPlannedCostExpenseViolation(DbUpdateException exception) =>
        IsUniqueViolation(
            exception,
            PlannedCostExpenseIndex,
            "Expenses.PlannedCostId");

    private static bool IsUniqueViolation(
        Exception exception,
        string postgresConstraintName,
        string sqliteColumnName)
    {
        var databaseException = exception is DbUpdateException ? exception.InnerException : exception;
        if (databaseException is PostgresException postgresException)
        {
            return postgresException.SqlState == PostgresErrorCodes.UniqueViolation
                && postgresException.ConstraintName == postgresConstraintName;
        }

        if (databaseException is SqliteException sqliteException)
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
