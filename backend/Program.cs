using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Text.Json.Serialization;
using TravelAssistant.Data;
using TravelAssistant.Endpoints;

// `builder` collects every service the API needs before the HTTP pipeline is created.
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// Keep enum values readable for the React app (for example, "Upcoming" rather than 1).
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter())
);

// Only the frontend's configured origins may call this API from a browser.
builder.Services.AddCors(options =>
    options.AddPolicy("frontend", policy =>
    {
        var allowedOrigins = builder.Configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>()
            ?? throw new InvalidOperationException("At least one CORS allowed origin must be configured.");

        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod();
    })
);

// Register one database context per request; the actual connection string comes from local
// configuration or Render's environment variables.
builder.Services.AddDbContext<TravelAssistantDbContext>(options =>
    options.UseNpgsql(
        NormalizeConnectionString(
            builder.Configuration.GetConnectionString("TravelAssistant")
            ?? throw new InvalidOperationException("Connection string 'TravelAssistant' was not found."))
    )
);

var app = builder.Build();

// Render terminates HTTPS before forwarding requests to this container.
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
    KnownIPNetworks = { },
    KnownProxies = { },
});

// Bring a newly-created Neon database up to the latest schema before serving any requests.
await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<TravelAssistantDbContext>();
    await db.Database.MigrateAsync();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("frontend");

// Hosting providers call this lightweight route to confirm that the API is running.
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

// Each feature owns its route definitions; prevents Program.cs growing into one large list of request handlers.
app.MapTripEndpoints();
app.MapBudgetItemEndpoints();
app.MapPlannedCostEndpoints();
app.MapItineraryEndpoints();
app.MapPackingItemEndpoints();

app.Run();

static string NormalizeConnectionString(string connectionString)
{
    if (!Uri.TryCreate(connectionString, UriKind.Absolute, out var uri)
        || (uri.Scheme is not "postgres" and not "postgresql"))
    {
        return connectionString;
    }

    var userInfoParts = uri.UserInfo.Split(':', 2);
    if (userInfoParts.Length != 2)
    {
        throw new InvalidOperationException("The PostgreSQL connection URL must include a username and password.");
    }

    return new NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.IsDefaultPort ? 5432 : uri.Port,
        Database = Uri.UnescapeDataString(uri.AbsolutePath.Trim('/')),
        Username = Uri.UnescapeDataString(userInfoParts[0]),
        Password = Uri.UnescapeDataString(userInfoParts[1]),
        SslMode = SslMode.Require,
    }.ConnectionString;
}
