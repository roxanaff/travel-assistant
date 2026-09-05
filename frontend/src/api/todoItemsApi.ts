import type { TodoItem, TodoItemForm } from "../types/todoItem";

import {
    apiBaseUrl,
    apiFetch,
    throwIfApiError,
} from "./travelAssistantApi";

/** Builds the common nested resource route for one trip's to-do tasks. */
const todoItemsUrl = (tripId: string) =>
    `${apiBaseUrl}/api/trips/${tripId}/todo-items`;

/** Loads the manual to-do checklist stored for a trip. */
export async function getTodoItems(tripId: string): Promise<TodoItem[]> {
    const response = await apiFetch(todoItemsUrl(tripId));
    await throwIfApiError(response, "Could not load to-do tasks.");

    return response.json();
}

/** Records that the user wants a blank manual to-do checklist. */
export async function startEmptyTodoList(tripId: string): Promise<void> {
    const response = await apiFetch(`${todoItemsUrl(tripId)}/start-empty`, {
        method: "POST",
    });
    await throwIfApiError(response, "Could not start an empty to-do checklist.");
}

/** Creates editable copies of the agreed standard to-do tasks. */
export async function createDefaultTodoList(
    tripId: string,
): Promise<TodoItem[]> {
    const response = await apiFetch(`${todoItemsUrl(tripId)}/default-list`, {
        method: "POST",
    });
    await throwIfApiError(response, "Could not create the default to-do list.");

    return response.json();
}

/** Saves a task's completion state without changing its manual order. */
export async function updateTodoItemCompletedState(
    tripId: string,
    itemId: string,
    isCompleted: boolean,
): Promise<TodoItem> {
    const response = await apiFetch(
        `${todoItemsUrl(tripId)}/${itemId}/completed`,
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isCompleted }),
        },
    );
    await throwIfApiError(response, "Could not update this to-do task.");

    return response.json();
}

/** Creates one task at the end of a trip's manual to-do checklist. */
export async function createTodoItem(
    tripId: string,
    item: TodoItemForm,
): Promise<TodoItem> {
    const response = await apiFetch(todoItemsUrl(tripId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: item.name.trim(),
            category: item.category || null,
            deadline: item.deadline || null,
        }),
    });
    await throwIfApiError(response, "Could not save this to-do task.");

    return response.json();
}

/** Updates an existing task without changing its completion state or order. */
export async function updateTodoItem(
    tripId: string,
    itemId: string,
    item: TodoItemForm,
): Promise<TodoItem> {
    const response = await apiFetch(`${todoItemsUrl(tripId)}/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: item.name.trim(),
            category: item.category || null,
            deadline: item.deadline || null,
        }),
    });
    await throwIfApiError(response, "Could not save these changes.");

    return response.json();
}

/** Permanently removes one task after its Undo period ends. */
export async function deleteTodoItem(
    tripId: string,
    itemId: string,
): Promise<void> {
    const response = await apiFetch(`${todoItemsUrl(tripId)}/${itemId}`, {
        method: "DELETE",
    });
    await throwIfApiError(response, "Could not delete this to-do task.");
}

/** Clears every task and makes the initial setup choice available again. */
export async function resetTodoList(tripId: string): Promise<void> {
    const response = await apiFetch(`${todoItemsUrl(tripId)}/reset`, {
        method: "DELETE",
    });
    await throwIfApiError(response, "Could not reset the to-do checklist.");
}

/** Persists the manual order of all tasks in a trip's to-do checklist. */
export async function reorderTodoItems(
    tripId: string,
    itemIds: string[],
): Promise<void> {
    const response = await apiFetch(`${todoItemsUrl(tripId)}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds }),
    });
    await throwIfApiError(response, "Could not reorder to-do tasks.");
}

/** Hides the persisted date-change reminder until the trip dates change again. */
export async function dismissTodoDeadlineReviewNotice(
    tripId: string,
): Promise<void> {
    const response = await apiFetch(
        `${todoItemsUrl(tripId)}/dismiss-deadline-review-notice`,
        { method: "POST" },
    );
    await throwIfApiError(response, "Could not dismiss the deadline review notice.");
}
