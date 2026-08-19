using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;
using TravelAssistant.Data;
using TravelAssistant.Endpoints;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddCors(options =>
    options.AddPolicy("frontend", policy =>
        policy.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod())
    );
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
app.UseCors("frontend");

app.MapTripEndpoints();
app.MapBudgetItemEndpoints();
app.MapPlannedCostEndpoints();
app.MapItineraryEndpoints();

app.Run();
