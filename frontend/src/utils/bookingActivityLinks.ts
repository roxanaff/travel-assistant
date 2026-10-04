import type { Booking, BookingCategory, BookingForm } from "../types/booking";
import { createEmptyBookingForm } from "../types/booking";
import type { ItineraryItem } from "../types/itineraryItem";
import type { BookingActivityRole } from "../api/bookingsApi";

export function getAvailableBookingRoles(booking: Booking | undefined): BookingActivityRole[] {
    if (!booking || (booking.category !== "Flight" && booking.category !== "RailBusFerry")) {
        return ["General"];
    }

    return [
        "General",
        "Outbound",
        ...(booking.returnStartDate ? ["Return" as const] : []),
    ];
}

export function formatBookingRole(role: BookingActivityRole) {
    if (role === "Outbound") return "Outbound journey";
    if (role === "Return") return "Return journey";
    return "Other activity";
}

const bookingCategoryForActivity = (category: string | null): BookingCategory | "" => {
    if (category === "Museum" || category === "Attraction") return "MuseumAttraction";
    if (category === "Tour") return "TourActivity";
    if (category === "Event") return "ConcertEvent";
    if (category === "Food" || category === "Bar") return "Restaurant";
    if (category) return "Other";
    return "";
};

const getActivityEnd = (activity: ItineraryItem) => {
    if (!activity.date || !activity.startTime || !activity.durationMinutes) {
        return { endDate: "", endTime: "" };
    }

    const end = new Date(`${activity.date}T${activity.startTime}`);
    end.setMinutes(end.getMinutes() + activity.durationMinutes);
    const endDate = [
        end.getFullYear(),
        (end.getMonth() + 1).toString().padStart(2, "0"),
        end.getDate().toString().padStart(2, "0"),
    ].join("-");
    const endTime = `${end.getHours().toString().padStart(2, "0")}:${end
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

    return { endDate, endTime };
};

export function createBookingFormFromActivity(activity: ItineraryItem): BookingForm {
    const { endDate, endTime } = getActivityEnd(activity);
    const costState = activity.cost === null
        ? "NotEntered"
        : activity.cost === 0
            ? "Free"
            : "HasCost";

    return {
        ...createEmptyBookingForm(),
        name: activity.name,
        category: bookingCategoryForActivity(activity.category),
        startDate: activity.date ?? "",
        startTime: activity.startTime?.slice(0, 5) ?? "",
        endDate,
        endTime,
        location: activity.location ?? "",
        externalLink: activity.externalLink ?? "",
        note: activity.note ?? "",
        costState,
        totalCost: activity.cost !== null && activity.cost > 0
            ? activity.cost.toString()
            : "",
    };
}

export const bookingToForm = (booking: Booking): BookingForm => ({
    name: booking.name,
    category: booking.category ?? "",
    status: booking.status ?? "",
    provider: booking.provider ?? "",
    confirmationNumber: booking.confirmationNumber ?? "",
    startDate: booking.startDate,
    startTime: booking.startTime?.slice(0, 5) ?? "",
    endDate: booking.endDate ?? "",
    endTime: booking.endTime?.slice(0, 5) ?? "",
    location: booking.location ?? "",
    startLocation: booking.startLocation ?? "",
    endLocation: booking.endLocation ?? "",
    hasReturnJourney: booking.returnStartDate !== null,
    returnStartDate: booking.returnStartDate ?? "",
    returnStartTime: booking.returnStartTime?.slice(0, 5) ?? "",
    returnStartLocation: booking.returnStartLocation ?? "",
    returnEndDate: booking.returnEndDate ?? "",
    returnEndTime: booking.returnEndTime?.slice(0, 5) ?? "",
    returnEndLocation: booking.returnEndLocation ?? "",
    externalLink: booking.externalLink ?? "",
    note: booking.note ?? "",
    costState: booking.totalCost === 0
        ? "Free"
        : booking.totalCost === null
            ? "NotEntered"
            : "HasCost",
    totalCost: booking.totalCost && booking.totalCost > 0
        ? booking.totalCost.toString()
        : "",
    amountPaid: booking.amountPaid ? booking.amountPaid.toString() : "",
    isRefunded: booking.amountRefunded !== null && booking.amountRefunded > 0,
    amountRefunded: booking.amountRefunded?.toString() ?? "",
});

