using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using TravelAssistant.Data;

namespace TravelAssistant.Tests;

/// <summary>Runs the API against a short-lived SQLite database instead of the production PostgreSQL database.</summary>
public sealed class ApiTestFixture : WebApplicationFactory<Program>, IDisposable
{
    private readonly SqliteConnection connection = new("Data Source=:memory:");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        connection.Open();
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:TravelAssistant", "Host=unused;Database=unused");
        builder.UseSetting("Cors:AllowedOrigins:0", "http://localhost:5173");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<TravelAssistantDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<TravelAssistantDbContext>>();
            services.RemoveAll<TravelAssistantDbContext>();
            services.AddDbContext<TravelAssistantDbContext>(options =>
                options.UseSqlite(connection));
            services.AddDataProtection().UseEphemeralDataProtectionProvider();
        });
    }

    public async Task InitializeDatabaseAsync()
    {
        await using var scope = Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<TravelAssistantDbContext>();
        await database.Database.EnsureCreatedAsync();
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing) connection.Dispose();
    }
}
