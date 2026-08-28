import type { PackingItem, PackingItemForm } from "../types/packingItem";

import {
    apiBaseUrl,
    apiFetch,
    throwIfApiError,
} from "./travelAssistantApi";

/** Builds the common nested resource route for one trip's packing items. */
const packingItemsUrl = (tripId: string) =>
    `${apiBaseUrl}/api/trips/${tripId}/packing-items`;

/** Loads the manual checklist stored for a trip. */
export async function getPackingItems(tripId: string): Promise<PackingItem[]> {
    const response = await apiFetch(packingItemsUrl(tripId));
    await throwIfApiError(response, "Could not load packing items.");

    return response.json();
}

/** Records that the user wants a blank manual checklist. */
export async function startEmptyPackingList(tripId: string): Promise<void> {
    const response = await apiFetch(`${packingItemsUrl(tripId)}/start-empty`, {
        method: "POST",
    });
    await throwIfApiError(response, "Could not start an empty packing list.");
}

/** Creates editable copies of the agreed standard packing items. */
export async function createDefaultPackingList(
    tripId: string,
): Promise<PackingItem[]> {
    const response = await apiFetch(`${packingItemsUrl(tripId)}/default-list`, {
        method: "POST",
    });
    await throwIfApiError(response, "Could not create the default packing list.");

    return response.json();
}

/** Saves an item's packed state without changing its manual order. */
export async function updatePackingItemPackedState(
    tripId: string,
    itemId: string,
    isPacked: boolean,
): Promise<PackingItem> {
    const response = await apiFetch(
        `${packingItemsUrl(tripId)}/${itemId}/packed`,
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isPacked }),
        },
    );
    await throwIfApiError(response, "Could not update this packing item.");

    return response.json();
}

/** Creates one item at the end of a trip's manual checklist. */
export async function createPackingItem(
    tripId: string,
    item: PackingItemForm,
): Promise<PackingItem> {
    const response = await apiFetch(packingItemsUrl(tripId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: item.name.trim(),
            category: item.category || null,
            quantity: item.quantity ? Number(item.quantity) : null,
        }),
    });
    await throwIfApiError(response, "Could not save this packing item.");

    return response.json();
}

/** Updates an existing item without changing its packed state or order. */
export async function updatePackingItem(
    tripId: string,
    itemId: string,
    item: PackingItemForm,
): Promise<PackingItem> {
    const response = await apiFetch(`${packingItemsUrl(tripId)}/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: item.name.trim(),
            category: item.category || null,
            quantity: item.quantity ? Number(item.quantity) : null,
        }),
    });
    await throwIfApiError(response, "Could not save these changes.");

    return response.json();
}

/** Permanently removes one checklist item after its Undo period ends. */
export async function deletePackingItem(
    tripId: string,
    itemId: string,
): Promise<void> {
    const response = await apiFetch(`${packingItemsUrl(tripId)}/${itemId}`, {
        method: "DELETE",
    });
    await throwIfApiError(response, "Could not delete this packing item.");
}

/** Clears every checklist item and makes the initial setup choice available again. */
export async function resetPackingList(tripId: string): Promise<void> {
    const response = await apiFetch(`${packingItemsUrl(tripId)}/reset`, {
        method: "DELETE",
    });
    await throwIfApiError(response, "Could not reset the packing list.");
}

/** Persists the manual order of all items in a trip's checklist. */
export async function reorderPackingItems(
    tripId: string,
    itemIds: string[],
): Promise<void> {
    const response = await apiFetch(`${packingItemsUrl(tripId)}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds }),
    });
    await throwIfApiError(response, "Could not reorder packing items.");
}
