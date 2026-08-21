import type { Trip, TripRequest } from "../types/trip";
import { apiBaseUrl } from "./travelAssistantApi";

// HTTP client for the top-level trip resource. 
// Pages use these named operations instead of owning URLs.
const tripsUrl = `${apiBaseUrl}/api/trips`;

/** Loads every trip shown on the dashboard. */
export async function getTrips(): Promise<Trip[]> {
    const response = await fetch(tripsUrl);
    if (!response.ok) {
        throw new Error("Could not load trips.");
    }

    return response.json();
}

/** Loads one trip for its workspace, returning <c>null</c> when it no longer exists. */
export async function getTrip(id: string): Promise<Trip | null> {
    const response = await fetch(`${tripsUrl}/${id}`);
    if (response.status === 404) {
        return null;
    }
    if (!response.ok) {
        throw new Error("Could not load this trip.");
    }

    return response.json();
}

/** Creates a trip from the dashboard form. */
export async function createTrip(request: TripRequest): Promise<Trip> {
    const response = await fetch(tripsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    if (!response.ok) {
        throw new Error((await response.text()) || "Unable to save this trip.");
    }

    return response.json();
}

/** Updates an existing trip and returns its recalculated status and itinerary warning count. */
export async function updateTrip(id: string, request: TripRequest): Promise<Trip> {
    const response = await fetch(`${tripsUrl}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    if (!response.ok) {
        throw new Error((await response.text()) || "Unable to save this trip.");
    }

    return response.json();
}

/** Deletes a trip and all backend records that belong to it. */
export async function deleteTrip(id: string): Promise<void> {
    const response = await fetch(`${tripsUrl}/${id}`, { method: "DELETE" });
    if (!response.ok) {
        throw new Error("Could not delete this trip.");
    }
}
