using Microsoft.EntityFrameworkCore;
using TravelAssistant.Contracts;
using TravelAssistant.Data;
using TravelAssistant.Models;
using TravelAssistant.Validation;

namespace TravelAssistant.Endpoints;

/// <summary>
/// Defines the API used to manage one trip's manual packing checklist.
/// </summary>
public static class PackingItemEndpoints
{
    // The starter checklist is copied into the database so users can edit it without changing this template.
    private static readonly (string Name, PackingCategory Category)[] DefaultItems =
    [
        ("Passport/ID", PackingCategory.DocumentsAndMoney),
        ("Wallet/cards/cash", PackingCategory.DocumentsAndMoney),
        ("Tickets/reservations", PackingCategory.DocumentsAndMoney),
        ("Keys", PackingCategory.DocumentsAndMoney),
        ("Toothbrush", PackingCategory.Toiletries),
        ("Toothpaste", PackingCategory.Toiletries),
        ("Deodorant", PackingCategory.Toiletries),
        ("Underwear", PackingCategory.Clothing),
        ("Socks", PackingCategory.Clothing),
        ("Sleepwear", PackingCategory.Clothing),
        ("Phone charger", PackingCategory.Electronics),
        ("Regular medication", PackingCategory.Health)
    ];

    /// <summary>Maps routes for starting, editing, ordering, and resetting a trip's packing checklist.</summary>
    public static IEndpointRouteBuilder MapPackingItemEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/trips/{tripId:guid}/packing-items", async (Guid tripId, TravelAssistantDbContext database) =>
        {
            var tripExists = await database.Trips.AnyAsync(trip => trip.Id == tripId);
            if (!tripExists)
            {
                return Results.NotFound();
            }

            var packingItems = await database.PackingItems
                .Where(item => item.TripId == tripId)
                .OrderBy(item => item.SortOrder)
                .ThenBy(item => item.CreatedAtUtc)
                .ToListAsync();

            return Results.Ok(packingItems.Select(ToResponse));
        }).WithName("GetPackingItems");

        app.MapPost("/api/trips/{tripId:guid}/packing-items/start-empty", async (Guid tripId, TravelAssistantDbContext database) =>
        {
            var trip = await database.Trips.FindAsync(tripId);
            if (trip is null)
            {
                return Results.NotFound();
            }

            // A trip must make exactly one initial checklist choice: blank or the standard template.
            if (trip.HasStartedPackingList || await database.PackingItems.AnyAsync(item => item.TripId == tripId))
            {
                return Results.Conflict("This packing checklist has already been started.");
            }

            trip.HasStartedPackingList = true;
            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("StartEmptyPackingList");

        app.MapPost("/api/trips/{tripId:guid}/packing-items/default-list", async (Guid tripId, TravelAssistantDbContext database) =>
        {
            var trip = await database.Trips.FindAsync(tripId);
            if (trip is null)
            {
                return Results.NotFound();
            }

            if (trip.HasStartedPackingList || await database.PackingItems.AnyAsync(item => item.TripId == tripId))
            {
                return Results.Conflict("This packing checklist has already been started.");
            }

            var packingItems = DefaultItems.Select((item, index) => new PackingItem
            {
                TripId = tripId,
                Name = item.Name,
                Category = item.Category,
                Quantity = 1,
                SortOrder = index
            }).ToList();

            trip.HasStartedPackingList = true;
            database.PackingItems.AddRange(packingItems);
            await database.SaveChangesAsync();
            return Results.Ok(packingItems.Select(ToResponse));
        }).WithName("CreateDefaultPackingList");

        app.MapPost("/api/trips/{tripId:guid}/packing-items", async (Guid tripId, CreatePackingItemRequest request, TravelAssistantDbContext database) =>
        {
            var validationError = PackingItemValidation.Validate(request.Name, request.Quantity);
            if (validationError is not null)
            {
                return Results.BadRequest(validationError);
            }

            var tripExists = await database.Trips.AnyAsync(trip => trip.Id == tripId);
            if (!tripExists)
            {
                return Results.NotFound();
            }

            // New manual items are appended without disturbing the user's current custom order.
            var lastSortOrder = await database.PackingItems
                .Where(item => item.TripId == tripId)
                .Select(item => (int?)item.SortOrder)
                .MaxAsync() ?? -1;

            var packingItem = new PackingItem
            {
                TripId = tripId,
                Name = request.Name.Trim(),
                Category = request.Category,
                Quantity = request.Quantity ?? 1,
                SortOrder = lastSortOrder + 1
            };

            database.PackingItems.Add(packingItem);
            await database.SaveChangesAsync();
            return Results.Created($"/api/trips/{tripId}/packing-items/{packingItem.Id}", ToResponse(packingItem));
        }).WithName("CreatePackingItem");

        app.MapPut("/api/trips/{tripId:guid}/packing-items/{id:guid}", async (Guid tripId, Guid id, UpdatePackingItemRequest request, TravelAssistantDbContext database) =>
        {
            var validationError = PackingItemValidation.Validate(request.Name, request.Quantity);
            if (validationError is not null)
            {
                return Results.BadRequest(validationError);
            }

            var packingItem = await FindPackingItem(tripId, id, database);
            if (packingItem is null)
            {
                return Results.NotFound();
            }

            packingItem.Name = request.Name.Trim();
            packingItem.Category = request.Category;
            packingItem.Quantity = request.Quantity ?? 1;

            await database.SaveChangesAsync();
            return Results.Ok(ToResponse(packingItem));
        }).WithName("UpdatePackingItem");

        app.MapPut("/api/trips/{tripId:guid}/packing-items/{id:guid}/packed", async (Guid tripId, Guid id, UpdatePackingItemPackedStateRequest request, TravelAssistantDbContext database) =>
        {
            var packingItem = await FindPackingItem(tripId, id, database);
            if (packingItem is null)
            {
                return Results.NotFound();
            }

            packingItem.IsPacked = request.IsPacked;
            await database.SaveChangesAsync();
            return Results.Ok(ToResponse(packingItem));
        }).WithName("UpdatePackingItemPackedState");

        app.MapPut("/api/trips/{tripId:guid}/packing-items/reorder", async (Guid tripId, ReorderPackingItemsRequest request, TravelAssistantDbContext database) =>
        {
            var tripExists = await database.Trips.AnyAsync(trip => trip.Id == tripId);
            if (!tripExists)
            {
                return Results.NotFound();
            }

            // Reject duplicates and IDs from another trip before changing any stored ordering.
            if (request.ItemIds.Count != request.ItemIds.Distinct().Count())
            {
                return Results.BadRequest("Each packing item can only appear once in a reorder request.");
            }

            var packingItems = await database.PackingItems
                .Where(item => item.TripId == tripId && request.ItemIds.Contains(item.Id))
                .ToListAsync();

            if (packingItems.Count != request.ItemIds.Count)
            {
                return Results.BadRequest("One or more packing items do not belong to this trip.");
            }

            var itemsById = packingItems.ToDictionary(item => item.Id);
            for (var index = 0; index < request.ItemIds.Count; index++)
            {
                itemsById[request.ItemIds[index]].SortOrder = index;
            }

            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("ReorderPackingItems");

        app.MapDelete("/api/trips/{tripId:guid}/packing-items/reset", async (Guid tripId, TravelAssistantDbContext database) =>
        {
            var trip = await database.Trips.FindAsync(tripId);
            if (trip is null)
            {
                return Results.NotFound();
            }

            var packingItems = await database.PackingItems
                .Where(item => item.TripId == tripId)
                .ToListAsync();

            database.PackingItems.RemoveRange(packingItems);
            trip.HasStartedPackingList = false;
            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("ResetPackingList");

        app.MapDelete("/api/trips/{tripId:guid}/packing-items/{id:guid}", async (Guid tripId, Guid id, TravelAssistantDbContext database) =>
        {
            var packingItem = await FindPackingItem(tripId, id, database);
            if (packingItem is null)
            {
                return Results.NotFound();
            }

            database.PackingItems.Remove(packingItem);
            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("DeletePackingItem");

        return app;
    }

    /// <summary>Finds an item only when it belongs to the trip named in the route.</summary>
    private static Task<PackingItem?> FindPackingItem(Guid tripId, Guid id, TravelAssistantDbContext database) =>
        database.PackingItems.SingleOrDefaultAsync(item => item.Id == id && item.TripId == tripId);

    /// <summary>Chooses the stable API shape returned to the React frontend.</summary>
    private static object ToResponse(PackingItem item) => new
    {
        item.Id,
        item.TripId,
        item.Name,
        item.Category,
        item.Quantity,
        item.IsPacked,
        item.SortOrder,
        item.CreatedAtUtc
    };
}
