// Handles booking requests and turns editable form values into API data.
// The backend remains responsible for saving bookings and checking their rules.
import type { Booking, BookingForm } from "../types/booking";
import { apiBaseUrl, apiFetch, throwIfApiError } from "./travelAssistantApi";

export type BookingActivityRole = "General" | "Outbound" | "Return";

const bookingsUrl = (tripId: string) =>
    `${apiBaseUrl}/api/trips/${tripId}/bookings`;

const optional = (value: string) => value.trim() || null;

/** Converts form text into the values the API expects, including empty values and payment amounts. */
export const toBookingRequest = (form: BookingForm) => ({
    name: form.name.trim(),
    category: form.category || null,
    status: form.status || null,
    provider: optional(form.provider),
    confirmationNumber: optional(form.confirmationNumber),
    startDate: form.startDate,
    startTime: form.startTime || null,
    endDate: form.endDate || null,
    endTime: form.endTime || null,
    location: optional(form.location),
    startLocation: optional(form.startLocation),
    endLocation: optional(form.endLocation),
    returnStartDate: form.hasReturnJourney ? form.returnStartDate || null : null,
    returnStartTime: form.hasReturnJourney ? form.returnStartTime || null : null,
    returnStartLocation: form.hasReturnJourney ? optional(form.returnStartLocation) : null,
    returnEndDate: form.hasReturnJourney ? form.returnEndDate || null : null,
    returnEndTime: form.hasReturnJourney ? form.returnEndTime || null : null,
    returnEndLocation: form.hasReturnJourney ? optional(form.returnEndLocation) : null,
    externalLink: optional(form.externalLink),
    note: optional(form.note),
    totalCost:
        form.costState === "Free"
            ? 0
            : form.costState === "NotEntered" || form.totalCost === ""
              ? null
              : Number(form.totalCost),
    amountPaid:
        form.costState !== "HasCost" || form.amountPaid === ""
            ? 0
            : Number(form.amountPaid),
    amountRefunded:
        form.costState !== "HasCost" || !form.isRefunded || form.amountRefunded === ""
            ? null
            : Number(form.amountRefunded),
});

export async function getBookings(tripId: string): Promise<Booking[]> {
    const response = await apiFetch(bookingsUrl(tripId));
    await throwIfApiError(response, "Could not load bookings.");
    return response.json();
}

export async function createBooking(tripId: string, form: BookingForm): Promise<Booking> {
    const response = await apiFetch(bookingsUrl(tripId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toBookingRequest(form)),
    });
    await throwIfApiError(response, "Could not save this booking.");
    return response.json();
}

export async function updateBooking(
    tripId: string,
    bookingId: string,
    form: BookingForm,
): Promise<Booking> {
    const response = await apiFetch(`${bookingsUrl(tripId)}/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toBookingRequest(form)),
    });
    await throwIfApiError(response, "Could not save these changes.");
    return response.json();
}

export async function deleteBooking(tripId: string, bookingId: string): Promise<void> {
    const response = await apiFetch(`${bookingsUrl(tripId)}/${bookingId}`, {
        method: "DELETE",
    });
    await throwIfApiError(response, "Could not delete this booking.");
}

export async function dismissBookingDeletedLinkNotices(
    tripId: string,
    bookingId: string,
): Promise<void> {
    const response = await apiFetch(
        `${bookingsUrl(tripId)}/${bookingId}/dismiss-deleted-link-notices`,
        { method: "POST" },
    );
    await throwIfApiError(response, "Could not dismiss this message.");
}

export async function linkBookingActivity(
    tripId: string,
    bookingId: string,
    activityId: string,
    role: BookingActivityRole,
): Promise<void> {
    const response = await apiFetch(`${bookingsUrl(tripId)}/${bookingId}/activities/${activityId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
    });
    await throwIfApiError(response, "Could not link this booking.");
}

export async function unlinkBookingActivity(
    tripId: string,
    bookingId: string,
    activityId: string,
): Promise<void> {
    const response = await apiFetch(`${bookingsUrl(tripId)}/${bookingId}/activities/${activityId}`, {
        method: "DELETE",
    });
    await throwIfApiError(response, "Could not unlink this booking.");
}

export async function dismissBookingActivityUpdateReview(
    tripId: string,
    bookingId: string,
    activityId: string,
    target: "booking" | "activity",
): Promise<void> {
    const response = await apiFetch(
        `${bookingsUrl(tripId)}/${bookingId}/activities/${activityId}/dismiss-${target}-update-review`,
        { method: "POST" },
    );
    await throwIfApiError(response, "Could not dismiss this review.");
}

