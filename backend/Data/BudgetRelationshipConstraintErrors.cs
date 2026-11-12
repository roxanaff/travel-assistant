// Recognizes database errors caused by trying to create budget links that
// must be one-to-one, so endpoints can return a useful response.
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace TravelAssistant.Data;

/// <summary>
/// Identifies storage conflicts for booking and budget relationships.
/// </summary>
public static class BudgetRelationshipConstraintErrors
{
    private const string BookingExpenseIndex = "IX_Expenses_BookingId";
    private const string PlannedCostExpenseIndex = "IX_Expenses_PlannedCostId";

    public static bool IsBookingExpenseViolation(Exception exception) =>
        IsUniqueViolation(
            exception,
            BookingExpenseIndex,
            "Expenses.BookingId")
        || IsUniqueViolation(exception, "IX_Expenses_ItemCoreId", "Expenses.ItemCoreId");

    public static bool IsPlannedCostExpenseViolation(DbUpdateException exception) =>
        IsUniqueViolation(
            exception,
            PlannedCostExpenseIndex,
            "Expenses.PlannedCostId")
        || IsUniqueViolation(exception, "IX_Expenses_ItemCoreId", "Expenses.ItemCoreId")
        || IsUniqueViolation(exception, "PK_ItemPaymentTotals", "ItemPaymentTotals.ItemCoreId");

    public static bool IsFinancialItemWriteConflict(Exception exception) =>
        exception is DbUpdateConcurrencyException
        || (exception is DbUpdateException ? exception.InnerException : exception) is PostgresException
        {
            SqlState: PostgresErrorCodes.SerializationFailure or PostgresErrorCodes.DeadlockDetected
        };

    public static bool IsMissingExpensePlanViolation(DbUpdateException exception) =>
        exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.ForeignKeyViolation,
            ConstraintName: "FK_Expenses_PlannedCosts_PlannedCostId"
                or "FK_Expenses_ItemCores_TripId_ItemCoreId"
                or "FK_ItemPaymentTotals_ItemCores_ItemCoreId"
        }
        || exception.InnerException is SqliteException { SqliteExtendedErrorCode: 787 };

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
            const int sqlitePrimaryKeyConstraint = 1555;
            return sqliteException.SqliteExtendedErrorCode is sqliteUniqueConstraint or sqlitePrimaryKeyConstraint
                && sqliteException.Message.Contains(
                    sqliteColumnName,
                    StringComparison.OrdinalIgnoreCase);
        }

        return false;
    }
}
