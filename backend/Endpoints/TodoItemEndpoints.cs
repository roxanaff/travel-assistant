using Microsoft.EntityFrameworkCore;
using TravelAssistant.Contracts;
using TravelAssistant.Data;
using TravelAssistant.Models;
using TravelAssistant.Validation;

namespace TravelAssistant.Endpoints;

/// <summary>
/// Defines the API used to manage one trip's manual to-do checklist.
/// </summary>
public static class TodoItemEndpoints
{
    // The starter checklist is copied into the database so users can edit it without changing this template.
    private static readonly (string Name, TodoCategory Category)[] DefaultItems =
    [
        ("Book outbound travel", TodoCategory.TravelAndTransport),
        ("Book return travel", TodoCategory.TravelAndTransport),
        ("Check check-in requirements", TodoCategory.TravelAndTransport),
        ("Plan airport/station transfer", TodoCategory.TravelAndTransport),
        ("Book accommodation", TodoCategory.Accommodation),
        ("Pay for accommodation", TodoCategory.Accommodation),
        ("Save accommodation address and check-in details", TodoCategory.Accommodation),
        ("Check passport/ID validity", TodoCategory.DocumentsAndMoney),
        ("Check visa/entry requirements", TodoCategory.DocumentsAndMoney),
        ("Arrange travel insurance", TodoCategory.DocumentsAndMoney),
        ("Prepare payment method", TodoCategory.DocumentsAndMoney),
        ("Reserve priority activities", TodoCategory.BookingsAndActivities),
        ("Buy required tickets", TodoCategory.BookingsAndActivities),
        ("Check medication needs", TodoCategory.Health),
        ("Arrange roaming/eSIM", TodoCategory.Connectivity),
        ("Download offline maps", TodoCategory.Connectivity),
        ("Share itinerary/contact details", TodoCategory.BeforeLeaving),
        ("Check weather forecast", TodoCategory.BeforeLeaving),
        ("Complete packing", TodoCategory.BeforeLeaving)
    ];

    /// <summary>Maps routes for starting, editing, ordering, and resetting a trip's to-do checklist.</summary>
    public static IEndpointRouteBuilder MapTodoItemEndpoints(this IEndpointRouteBuilder app)
    {
        var routes = app.MapOwnedTripGroup();
        routes.MapGet("/todo-items", async (Guid tripId, TravelAssistantDbContext database) =>
        {
            var todoItems = await database.TodoItems
                .Where(item => item.TripId == tripId)
                .OrderBy(item => item.SortOrder)
                .ToListAsync();

            return Results.Ok(todoItems.Select(ToResponse));
        }).WithName("GetTodoItems");

        routes.MapPost("/todo-items/start-empty", async (Guid tripId, TravelAssistantDbContext database) =>
        {
            var trip = await database.Trips.FindAsync(tripId);
            if (trip is null)
            {
                return Results.NotFound();
            }

            // A trip must make exactly one initial checklist choice: blank or the standard template.
            if (trip.HasStartedTodoList || await database.TodoItems.AnyAsync(item => item.TripId == tripId))
            {
                return Results.Conflict("This to-do checklist has already been started.");
            }

            trip.HasStartedTodoList = true;
            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("StartEmptyTodoList");

        routes.MapPost("/todo-items/default-list", async (Guid tripId, TravelAssistantDbContext database) =>
        {
            var trip = await database.Trips.FindAsync(tripId);
            if (trip is null)
            {
                return Results.NotFound();
            }

            if (trip.HasStartedTodoList || await database.TodoItems.AnyAsync(item => item.TripId == tripId))
            {
                return Results.Conflict("This to-do checklist has already been started.");
            }

            var todoItems = DefaultItems.Select((item, index) => new TodoItem
            {
                TripId = tripId,
                Name = item.Name,
                Category = item.Category,
                Deadline = trip.StartDate,
                SortOrder = index
            }).ToList();

            trip.HasStartedTodoList = true;
            database.TodoItems.AddRange(todoItems);
            await database.SaveChangesAsync();
            return Results.Ok(todoItems.Select(ToResponse));
        }).WithName("CreateDefaultTodoList");

        routes.MapPost("/todo-items/dismiss-deadline-review-notice", async (Guid tripId, TravelAssistantDbContext database) =>
        {
            var trip = await database.Trips.FindAsync(tripId);
            if (trip is null)
            {
                return Results.NotFound();
            }

            trip.HasPendingTodoDeadlineReview = false;
            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("DismissTodoDeadlineReviewNotice");

        routes.MapPost("/todo-items", async (Guid tripId, CreateTodoItemRequest request, TravelAssistantDbContext database) =>
        {
            var validationError = TodoItemValidation.Validate(request.Name);
            if (validationError is not null)
            {
                return Results.BadRequest(validationError);
            }

            var trip = await database.Trips.FindAsync(tripId);
            if (trip is null)
            {
                return Results.NotFound();
            }

            // New manual tasks are appended without disturbing the user's current custom order.
            var lastSortOrder = await database.TodoItems
                .Where(item => item.TripId == tripId)
                .Select(item => (int?)item.SortOrder)
                .MaxAsync() ?? -1;

            var todoItem = new TodoItem
            {
                TripId = tripId,
                Name = request.Name.Trim(),
                Category = request.Category,
                Deadline = request.Deadline ?? trip.StartDate,
                SortOrder = lastSortOrder + 1
            };

            database.TodoItems.Add(todoItem);
            await database.SaveChangesAsync();
            return Results.Created($"/api/trips/{tripId}/todo-items/{todoItem.Id}", ToResponse(todoItem));
        }).WithName("CreateTodoItem");

        routes.MapPut("/todo-items/{id:guid}", async (Guid tripId, Guid id, UpdateTodoItemRequest request, TravelAssistantDbContext database) =>
        {
            var validationError = TodoItemValidation.Validate(request.Name);
            if (validationError is not null)
            {
                return Results.BadRequest(validationError);
            }

            var todoItem = await FindTodoItem(tripId, id, database);
            if (todoItem is null)
            {
                return Results.NotFound();
            }

            todoItem.Name = request.Name.Trim();
            todoItem.Category = request.Category;
            todoItem.Deadline = request.Deadline;

            await database.SaveChangesAsync();
            return Results.Ok(ToResponse(todoItem));
        }).WithName("UpdateTodoItem");

        routes.MapPut("/todo-items/{id:guid}/completed", async (Guid tripId, Guid id, UpdateTodoItemCompletedStateRequest request, TravelAssistantDbContext database) =>
        {
            var todoItem = await FindTodoItem(tripId, id, database);
            if (todoItem is null)
            {
                return Results.NotFound();
            }

            todoItem.IsCompleted = request.IsCompleted;
            await database.SaveChangesAsync();
            return Results.Ok(ToResponse(todoItem));
        }).WithName("UpdateTodoItemCompletedState");

        routes.MapPut("/todo-items/reorder", async (Guid tripId, ReorderTodoItemsRequest request, TravelAssistantDbContext database) =>
        {
            if (request.ItemIds.Count != request.ItemIds.Distinct().Count())
            {
                return Results.BadRequest("Each to-do task can only appear once in a reorder request.");
            }

            var todoItems = await database.TodoItems
                .Where(item => item.TripId == tripId && request.ItemIds.Contains(item.Id))
                .ToListAsync();

            if (todoItems.Count != request.ItemIds.Count)
            {
                return Results.BadRequest("One or more to-do tasks do not belong to this trip.");
            }

            var itemsById = todoItems.ToDictionary(item => item.Id);
            for (var index = 0; index < request.ItemIds.Count; index++)
            {
                itemsById[request.ItemIds[index]].SortOrder = index;
            }

            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("ReorderTodoItems");

        routes.MapDelete("/todo-items/reset", async (Guid tripId, TravelAssistantDbContext database) =>
        {
            var trip = await database.Trips.FindAsync(tripId);
            if (trip is null)
            {
                return Results.NotFound();
            }

            var todoItems = await database.TodoItems
                .Where(item => item.TripId == tripId)
                .ToListAsync();

            database.TodoItems.RemoveRange(todoItems);
            trip.HasStartedTodoList = false;
            trip.HasPendingTodoDeadlineReview = false;
            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("ResetTodoList");

        routes.MapDelete("/todo-items/{id:guid}", async (Guid tripId, Guid id, TravelAssistantDbContext database) =>
        {
            var todoItem = await FindTodoItem(tripId, id, database);
            if (todoItem is null)
            {
                return Results.NotFound();
            }

            database.TodoItems.Remove(todoItem);
            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("DeleteTodoItem");

        return app;
    }

    /// <summary>Finds a task only when it belongs to the trip named in the route.</summary>
    private static Task<TodoItem?> FindTodoItem(Guid tripId, Guid id, TravelAssistantDbContext database) =>
        database.TodoItems.SingleOrDefaultAsync(item => item.Id == id && item.TripId == tripId);

    /// <summary>Chooses the stable API shape returned to the React frontend.</summary>
    private static object ToResponse(TodoItem item) => new
    {
        item.Id,
        item.TripId,
        item.Name,
        item.Category,
        item.Deadline,
        item.IsCompleted,
        item.SortOrder,
        item.CreatedAtUtc
    };
}
