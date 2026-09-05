using TravelAssistant.Models;

namespace TravelAssistant.Contracts;

/// <summary>Payload for creating one manual to-do checklist task.</summary>
public record CreateTodoItemRequest(
    string Name,
    TodoCategory? Category,
    DateOnly? Deadline
);

/// <summary>Payload for changing a task's editable details without changing its order or completion state.</summary>
public record UpdateTodoItemRequest(
    string Name,
    TodoCategory? Category,
    DateOnly? Deadline
);

/// <summary>Payload for marking a task done or reopening it.</summary>
public record UpdateTodoItemCompletedStateRequest(bool IsCompleted);

/// <summary>Ordered list of every task ID used to persist a drag-and-drop reorder operation.</summary>
public record ReorderTodoItemsRequest(IReadOnlyList<Guid> ItemIds);
