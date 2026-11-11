using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using TravelAssistant.Data;
using TravelAssistant.Models;
using Xunit;

namespace TravelAssistant.Tests;

public class SharedItemStorageTests
{
    [Fact]
    public async Task AnItemAllowsMultipleVisitsButOnlyOneSchedulePerFixedSlot()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:;Foreign Keys=True");
        await using var database = await CreateDatabaseAsync(connection);
        var item = await CreateItemAsync(database);

        database.ItemSchedules.AddRange(
            new ItemSchedule { ItemCoreId = item.Id, Kind = ItemScheduleKind.Visit },
            new ItemSchedule { ItemCoreId = item.Id, Kind = ItemScheduleKind.Visit },
            new ItemSchedule
            {
                ItemCoreId = item.Id,
                Kind = ItemScheduleKind.Validity,
                FixedSlot = ItemScheduleSlot.Primary
            });
        await database.SaveChangesAsync();

        database.ItemSchedules.Add(new ItemSchedule
        {
            ItemCoreId = item.Id,
            Kind = ItemScheduleKind.Validity,
            FixedSlot = ItemScheduleSlot.Primary
        });
        var exception = await Assert.ThrowsAsync<DbUpdateException>(() => database.SaveChangesAsync());
        var databaseError = Assert.IsType<SqliteException>(exception.InnerException);
        Assert.Equal(2067, databaseError.SqliteExtendedErrorCode);
    }

    [Fact]
    public async Task PaymentTotalsAllowAFullRefundButRejectARefundGreaterThanPaid()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:;Foreign Keys=True");
        await using var database = await CreateDatabaseAsync(connection);
        var item = await CreateItemAsync(database);
        var totals = new ItemPaymentTotals { ItemCoreId = item.Id, Paid = 9.99m, Refunded = 9.99m };
        database.ItemPaymentTotals.Add(totals);
        await database.SaveChangesAsync();

        totals.Refunded = 10.00m;
        var exception = await Assert.ThrowsAsync<DbUpdateException>(() => database.SaveChangesAsync());
        Assert.Contains("CK_ItemPaymentTotals_RefundedRange", exception.InnerException?.Message);
    }

    private static async Task<TravelAssistantDbContext> CreateDatabaseAsync(SqliteConnection connection)
    {
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<TravelAssistantDbContext>()
            .UseSqlite(connection)
            .Options;
        var database = new TravelAssistantDbContext(options);
        await database.Database.EnsureCreatedAsync();
        return database;
    }

    private static async Task<ItemCore> CreateItemAsync(TravelAssistantDbContext database)
    {
        var item = new ItemCore
        {
            Trip = new Trip
            {
                Name = "Shared item storage test",
                User = new User { Id = Guid.NewGuid(), DisplayName = "Test traveller" }
            }
        };
        database.ItemCores.Add(item);
        await database.SaveChangesAsync();
        return item;
    }
}
