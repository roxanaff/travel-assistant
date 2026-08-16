using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;
using TravelAssistant.Contracts;
using TravelAssistant.Data;
using TravelAssistant.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddDbContext<TravelAssistantDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("TravelAssistant")
        ?? throw new InvalidOperationException("Connection string 'TravelAssistant' was not found.")));

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.MapGet("/api/trips", async (TravelAssistantDbContext database) =>
    await database.Trips
        .OrderBy(trip => trip.StartDate)
        .ToListAsync())
    .WithName("GetTrips");

app.MapGet("/api/trips/{id:guid}", async (Guid id, TravelAssistantDbContext database) =>
{
    var trip = await database.Trips.FindAsync(id);
    return trip is null ? Results.NotFound() : Results.Ok(trip);
})
    .WithName("GetTrip");

app.MapPost("/api/trips", async (CreateTripRequest request, TravelAssistantDbContext database) =>
{
    var validationError = ValidateTripRequest(request);
    if (validationError is not null)
    {
        return Results.BadRequest(validationError);
    }

    var trip = new Trip
    {
        Destination = request.Destination.Trim(),
        StartDate = request.StartDate,
        EndDate = request.EndDate,
        Type = request.Type,
        Budget = request.Budget,
        Currency = request.Currency.Trim().ToUpperInvariant()
    };

    database.Trips.Add(trip);
    await database.SaveChangesAsync();

    return Results.Created($"/api/trips/{trip.Id}", trip);
})
    .WithName("CreateTrip");

app.MapPut("/api/trips/{id:guid}", async (Guid id, CreateTripRequest request, TravelAssistantDbContext database) =>
{
    var validationError = ValidateTripRequest(request);
    if (validationError is not null)
    {
        return Results.BadRequest(validationError);
    }

    var trip = await database.Trips.FindAsync(id);
    if (trip is null)
    {
        return Results.NotFound();
    }

    trip.Destination = request.Destination.Trim();
    trip.StartDate = request.StartDate;
    trip.EndDate = request.EndDate;
    trip.Type = request.Type;
    trip.Budget = request.Budget;
    trip.Currency = request.Currency.Trim().ToUpperInvariant();

    await database.SaveChangesAsync();
    return Results.Ok(trip);
})
    .WithName("UpdateTrip");

app.MapDelete("/api/trips/{id:guid}", async (Guid id, TravelAssistantDbContext database) =>
{
    var trip = await database.Trips.FindAsync(id);
    if (trip is null)
    {
        return Results.NotFound();
    }

    database.Trips.Remove(trip);
    await database.SaveChangesAsync();
    return Results.NoContent();
})
    .WithName("DeleteTrip");

app.Run();

static string? ValidateTripRequest(CreateTripRequest request)
{
    if (string.IsNullOrWhiteSpace(request.Destination))
    {
        return "Destination is required.";
    }

    if (request.EndDate < request.StartDate)
    {
        return "End date must be on or after the start date.";
    }

    if (request.Budget < 0)
    {
        return "Budget cannot be negative.";
    }

    if (string.IsNullOrWhiteSpace(request.Currency) || request.Currency.Trim().Length != 3)
    {
        return "Currency must be a three-letter code, such as EUR.";
    }

    return null;
}
