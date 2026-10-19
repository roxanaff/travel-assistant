using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Operations;
using TravelAssistant.Migrations;
using Xunit;

namespace TravelAssistant.Tests;

public class BookingExpenseMigrationTests
{
    [Fact]
    public async Task BackfillPreservesExistingRecordsAndCopiesOnlyActualExpenseLinks()
    {
        var builder = new MigrationBuilder("Npgsql.EntityFrameworkCore.PostgreSQL");
        new TestMigration().BuildUp(builder);
        var backfill = Assert.Single(builder.Operations.OfType<SqlOperation>());
        var backfillIndex = builder.Operations.IndexOf(backfill);
        var dropOldLinkIndex = builder.Operations.FindIndex(operation =>
            operation is DropColumnOperation { Table: "PlannedCosts", Name: "BookingId" });
        Assert.True(backfillIndex < dropOldLinkIndex);

        // Run the data-transfer SQL against the relevant old-schema columns, including an unspent plan.
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        await ExecuteAsync(connection, """
            CREATE TABLE "PlannedCosts" ("Id" TEXT PRIMARY KEY, "BookingId" TEXT, "Amount" INTEGER);
            CREATE TABLE "Expenses" (
                "Id" TEXT PRIMARY KEY, "PlannedCostId" TEXT, "BookingId" TEXT, "Amount" INTEGER);
            INSERT INTO "PlannedCosts" VALUES ('plan-paid', 'booking-paid', 200);
            INSERT INTO "PlannedCosts" VALUES ('plan-unpaid', 'booking-unpaid', 300);
            INSERT INTO "PlannedCosts" VALUES ('plan-unlinked', NULL, 50);
            INSERT INTO "Expenses" VALUES ('paid', 'plan-paid', NULL, 100);
            INSERT INTO "Expenses" VALUES ('unlinked', 'plan-unlinked', NULL, 50);
            INSERT INTO "Expenses" VALUES ('standalone', NULL, NULL, 40);
            """);
        await ExecuteAsync(connection, backfill.Sql);

        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT "Id", "PlannedCostId", "BookingId", "Amount" FROM "Expenses" ORDER BY "Id";
            """;
        await using var reader = await command.ExecuteReaderAsync();
        Assert.True(await reader.ReadAsync());
        Assert.Equal("paid", reader.GetString(0));
        Assert.Equal("plan-paid", reader.GetString(1));
        Assert.Equal("booking-paid", reader.GetString(2));
        Assert.Equal(100, reader.GetInt32(3));
        Assert.True(await reader.ReadAsync());
        Assert.Equal("standalone", reader.GetString(0));
        Assert.True(reader.IsDBNull(1));
        Assert.True(reader.IsDBNull(2));
        Assert.True(await reader.ReadAsync());
        Assert.Equal("unlinked", reader.GetString(0));
        Assert.True(reader.IsDBNull(2));
        Assert.False(await reader.ReadAsync());
        await reader.CloseAsync();

        command.CommandText = "SELECT COUNT(*), SUM(\"Amount\") FROM \"PlannedCosts\";";
        await using var plans = await command.ExecuteReaderAsync();
        Assert.True(await plans.ReadAsync());
        Assert.Equal(3, plans.GetInt32(0));
        Assert.Equal(550, plans.GetInt32(1));
    }

    private static async Task ExecuteAsync(SqliteConnection connection, string sql)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        await command.ExecuteNonQueryAsync();
    }

    private sealed class TestMigration : LinkBookingsDirectlyToExpenses
    {
        public void BuildUp(MigrationBuilder builder) => Up(builder);
    }
}
