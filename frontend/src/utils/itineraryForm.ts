// Form helpers for activities: convert editable values into API requests,
// check basic input mistakes, and prefill an activity from a booking.
import type { ItineraryItemRequest } from "../api/itineraryApi";
import type { Booking } from "../types/booking";
import type { ItineraryItemForm } from "../types/itineraryItem";
import type { Trip } from "../types/trip";
import type { BookingActivityRole } from "../api/bookingsApi";

export type ItineraryFormErrors = Partial<Record<keyof ItineraryItemForm, string>>;

export function getDurationInMinutes(item: ItineraryItemForm) {
    if (!item.duration) return null;

    const [hours, minutes] = item.duration.split(":").map(Number);
    return hours === 0 && minutes === 0 ? null : hours * 60 + minutes;
}

/** Converts activity form values into the request sent to the backend. */
export function itineraryFormToRequest(
    item: ItineraryItemForm,
    trip: Trip,
): ItineraryItemRequest {
    return {
        name: item.name.trim(),
        date: trip.startDate && trip.endDate ? item.date || null : null,
        startTime: trip.startDate && trip.endDate && item.date ? item.startTime || null : null,
        durationMinutes: getDurationInMinutes(item),
        openingTime: item.openingTime || null,
        closingTime: item.closingTime || null,
        category: item.category || null,
        cost: item.cost === "" ? null : Number(item.cost),
        location: item.location.trim() || null,
        externalLink: item.externalLink.trim() || null,
        priority: item.priority,
        note: item.note.trim() || null,
        bookingRequired: item.bookingRequired,
    };
}

/** Catches common input mistakes immediately; the backend still checks saved data. */
export function validateItineraryForm(
    item: ItineraryItemForm,
    trip: Trip,
): ItineraryFormErrors {
    const errors: ItineraryFormErrors = {};

    if (!item.name.trim()) {
        errors.name = "Enter an activity name.";
    } else if (item.name.trim().length > 150) {
        errors.name = "Activity name cannot exceed 150 characters.";
    }
    if (item.startTime && !item.date) {
        errors.startTime = "Choose a date before setting a start time.";
    }
    if (
        item.date
        && trip.startDate
        && trip.endDate
        && (item.date < trip.startDate || item.date > trip.endDate)
    ) {
        errors.date = "Choose a date within the trip dates.";
    }
    if (item.cost && Number(item.cost) < 0) {
        errors.cost = "Cost cannot be negative.";
    }

    return errors;
}

export function getItineraryResponseFormErrors(message: string): ItineraryFormErrors {
    if (message.toLowerCase().includes("name")) return { name: message };
    if (message.includes("start time requires")) return { startTime: message };
    if (message.includes("date must fall")) return { date: message };
    if (message.includes("Duration")) return { duration: message };
    if (message.includes("Cost")) return { cost: message };

    return {};
}

const categoryForBooking = (booking: Booking) => {
    if (booking.category === "MuseumAttraction") return "Attraction";
    if (booking.category === "TourActivity") return "Tour";
    if (booking.category === "ConcertEvent") return "Event";
    if (booking.category === "Restaurant") return "Food";
    if (!booking.category) return "";
    return "Other";
};

const durationBetween = (
    startDate: string | null,
    startTime: string | null,
    endDate: string | null,
    endTime: string | null,
) => {
    if (!startDate || !startTime || !endDate || !endTime) return "";

    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    if (minutes <= 0 || minutes >= 24 * 60) return "";

    return `${Math.floor(minutes / 60).toString().padStart(2, "0")}:${(minutes % 60)
        .toString()
        .padStart(2, "0")}`;
};

/** Prefills an activity from a booking without creating or linking it yet. */
export function createActivityFormFromBooking(
    booking: Booking,
    role: BookingActivityRole,
    trip: Trip,
): ItineraryItemForm {
    const isReturn = role === "Return";
    const date = isReturn ? booking.returnStartDate : booking.startDate;
    const startTime = isReturn ? booking.returnStartTime : booking.startTime;
    const endDate = isReturn ? booking.returnEndDate : booking.endDate;
    const endTime = isReturn ? booking.returnEndTime : booking.endTime;
    const location = isReturn
        ? booking.returnStartLocation
        : booking.startLocation ?? booking.location;
    const isWithinTrip = Boolean(
        date
        && trip.startDate
        && trip.endDate
        && date >= trip.startDate
        && date <= trip.endDate,
    );
    const canCopyCost = role === "General"
        && booking.returnStartDate === null
        && booking.activityLinks.length === 0
        && booking.totalCost !== null
        && booking.totalCost > 0;

    return {
        name: booking.name,
        date: isWithinTrip ? date ?? "" : "",
        startTime: isWithinTrip ? startTime?.slice(0, 5) ?? "" : "",
        duration: durationBetween(date, startTime, endDate, endTime),
        openingTime: "",
        closingTime: "",
        category: categoryForBooking(booking),
        cost: canCopyCost ? booking.totalCost?.toString() ?? "" : "",
        location: location ?? "",
        externalLink: booking.externalLink ?? "",
        priority: "WouldLikeToDo",
        note: booking.note ?? "",
        bookingRequired: true,
    };
}
