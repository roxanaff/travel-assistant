using Microsoft.AspNetCore.DataProtection;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TravelAssistant.Data;
using Xunit;

namespace TravelAssistant.Tests;

public sealed class DataProtectionPersistenceTests
{
    [Fact]
    public async Task RecreatedProviderCanReadPayloadUsingDatabaseKeys()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        string protectedPayload;

        await using (var firstProvider = CreateProvider(connection))
        {
            await using var scope = firstProvider.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<TravelAssistantDbContext>();
            await database.Database.EnsureCreatedAsync();

            var protector = firstProvider.GetRequiredService<IDataProtectionProvider>()
                .CreateProtector("cookie-persistence-regression");
            protectedPayload = protector.Protect("saved session payload");
            Assert.True(await database.DataProtectionKeys.AnyAsync());
        }

        await using var secondProvider = CreateProvider(connection);
        var restoredProtector = secondProvider.GetRequiredService<IDataProtectionProvider>()
            .CreateProtector("cookie-persistence-regression");

        Assert.Equal("saved session payload", restoredProtector.Unprotect(protectedPayload));
    }

    private static ServiceProvider CreateProvider(SqliteConnection connection)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDbContext<TravelAssistantDbContext>(options => options.UseSqlite(connection));
        services.AddDataProtection()
            .PersistKeysToDbContext<TravelAssistantDbContext>()
            .SetApplicationName("TravelAssistant");

        return services.BuildServiceProvider();
    }
}
