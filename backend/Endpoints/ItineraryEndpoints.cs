using Microsoft.EntityFrameworkCore;
using TravelAssistant.Contracts;
using TravelAssistant.Data;
using TravelAssistant.Models;
using TravelAssistant.Validation;

namespace TravelAssistant.Endpoints;

public static class ItineraryEndpoints
{
    public static IEndpointRouteBuilder MapItineraryEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/trips/{tripId:guid}/itinerary-items", async (Guid tripId, TravelAssistantDbContext database) =>
        {
            var tripExists = await database.Trips.AnyAsync(trip => trip.Id == tripId);
            if (!tripExists)
            {
                return Results.NotFound();
            }

            var itineraryItems = await database.ItineraryItems
                .Where(item => item.TripId == tripId)
                .OrderBy(item => item.Date == null)
                .ThenBy(item => item.Date)
                .ThenBy(item => item.StartTime)
                .ThenBy(item => item.CreatedAtUtc)
                .ToListAsync();

            return Results.Ok(itineraryItems.Select(ToResponse));
        }).WithName("GetItineraryItems");

        app.MapPost("/api/trips/{tripId:guid}/itinerary-items", async (Guid tripId, CreateItineraryItemRequest request, TravelAssistantDbContext database) =>
        {
            var trip = await database.Trips.FindAsync(tripId);
            if (trip is null)
            {
                return Results.NotFound();
            }

            var validationError = ItineraryItemValidation.Validate(request, trip);
            if (validationError is not null)
            {
                return Results.BadRequest(validationError);
            }

            var itineraryItem = new ItineraryItem
            {
                TripId = tripId,
                Name = request.Name.Trim(),
                Date = request.Date,
                StartTime = request.StartTime,
                DurationMinutes = request.DurationMinutes,
                OpeningTime = request.OpeningTime,
                ClosingTime = request.ClosingTime,
                Category = request.Category,
                Cost = request.Cost,
                Location = NormalizeOptionalText(request.Location),
                ExternalLink = NormalizeOptionalText(request.ExternalLink),
                Priority = request.Priority,
                Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim()
            };

            database.ItineraryItems.Add(itineraryItem);
            await database.SaveChangesAsync();
            return Results.Created($"/api/trips/{tripId}/itinerary-items/{itineraryItem.Id}", ToResponse(itineraryItem));
        }).WithName("CreateItineraryItem");

        app.MapPut("/api/trips/{tripId:guid}/itinerary-items/{id:guid}", async (Guid tripId, Guid id, CreateItineraryItemRequest request, TravelAssistantDbContext database) =>
        {
            var trip = await database.Trips.FindAsync(tripId);
            if (trip is null)
            {
                return Results.NotFound();
            }

            var validationError = ItineraryItemValidation.Validate(request, trip);
            if (validationError is not null)
            {
                return Results.BadRequest(validationError);
            }

            var itineraryItem = await database.ItineraryItems.SingleOrDefaultAsync(item => item.Id == id && item.TripId == tripId);
            if (itineraryItem is null)
            {
                return Results.NotFound();
            }

            itineraryItem.Name = request.Name.Trim();
            itineraryItem.Date = request.Date;
            itineraryItem.StartTime = request.StartTime;
            itineraryItem.DurationMinutes = request.DurationMinutes;
            itineraryItem.OpeningTime = request.OpeningTime;
            itineraryItem.ClosingTime = request.ClosingTime;
            itineraryItem.Category = request.Category;
            itineraryItem.Cost = request.Cost;
            itineraryItem.Location = NormalizeOptionalText(request.Location);
            itineraryItem.ExternalLink = NormalizeOptionalText(request.ExternalLink);
            itineraryItem.Priority = request.Priority;
            itineraryItem.Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();

            await database.SaveChangesAsync();
            return Results.Ok(ToResponse(itineraryItem));
        }).WithName("UpdateItineraryItem");

        app.MapDelete("/api/trips/{tripId:guid}/itinerary-items/{id:guid}", async (Guid tripId, Guid id, TravelAssistantDbContext database) =>
        {
            var itineraryItem = await database.ItineraryItems.SingleOrDefaultAsync(item => item.Id == id && item.TripId == tripId);
            if (itineraryItem is null)
            {
                return Results.NotFound();
            }

            database.ItineraryItems.Remove(itineraryItem);
            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("DeleteItineraryItem");

        return app;
    }

    private static string? NormalizeOptionalText(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static object ToResponse(ItineraryItem item) => new
    {
        item.Id,
        item.TripId,
        item.Name,
        item.Date,
        item.StartTime,
        item.DurationMinutes,
        item.OpeningTime,
        item.ClosingTime,
        item.Category,
        item.Cost,
        item.Location,
        item.ExternalLink,
        item.Priority,
        item.Note,
        item.CreatedAtUtc
    };
}
