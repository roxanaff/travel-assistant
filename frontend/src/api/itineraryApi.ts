// Handles browser requests for a trip's activities. It sends and receives
// activity data; the backend saves it and checks the rules.
import type { ItineraryItem } from "../types/itineraryItem";
import { apiBaseUrl, apiFetch, throwIfApiError } from "./travelAssistantApi";

/** Payload accepted by the itinerary endpoints when creating or editing an activity. */
export type ItineraryItemRequest = {
    name: string;
    date: string | null;
    startTime: string | null;
    durationMinutes: number | null;
    openingTime: string | null;
    closingTime: string | null;
    category: string | null;
    cost: number | null;
    location: string | null;
    externalLink: string | null;
    priority: string;
    note: string | null;
    bookingRequired: boolean;
};

const itineraryUrl = (tripId: string) =>
    `${apiBaseUrl}/api/trips/${tripId}/itinerary-items`;

/** Loads every itinerary activity for one trip. */
export async function getItineraryItems(
    tripId: string,
): Promise<ItineraryItem[]> {
    const response = await apiFetch(itineraryUrl(tripId));
    if (!response.ok) 
        throw new Error("Could not load itinerary items.");

    return response.json();
}

/** Creates an activity and returns its stored API representation. */
export async function createItineraryItem(
    tripId: string,
    request: ItineraryItemRequest,
): Promise<ItineraryItem> {
    const response = await apiFetch(itineraryUrl(tripId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    await throwIfApiError(response, "Could not save this itinerary item.");

    return response.json();
}

/** Updates an activity and returns its stored API representation. */
export async function updateItineraryItem(
    tripId: string,
    itemId: string,
    request: ItineraryItemRequest,
): Promise<ItineraryItem> {
    const response = await apiFetch(`${itineraryUrl(tripId)}/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    await throwIfApiError(response, "Could not save these changes.");

    return response.json();
}

/** Permanently deletes one itinerary activity. */
export async function deleteItineraryItem(
    tripId: string,
    itemId: string,
): Promise<void> {
    const response = await apiFetch(`${itineraryUrl(tripId)}/${itemId}`, {
        method: "DELETE",
    });
    if (!response.ok) 
        throw new Error("Could not delete this itinerary item.");
}

export async function dismissActivityDeletedBookingNotice(
    tripId: string,
    itemId: string,
): Promise<void> {
    const response = await apiFetch(
        `${itineraryUrl(tripId)}/${itemId}/dismiss-deleted-booking-notice`,
        { method: "POST" },
    );
    await throwIfApiError(response, "Could not dismiss this message.");
}
