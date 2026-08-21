import type { ItineraryItem } from "../../types/itineraryItem";
import type { Trip } from "../../types/trip";

export const formatTime = (time: string | null) =>
    time ? time.slice(0, 5) : "Any time";

export const formatDuration = (durationMinutes: number) => {
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    return `${hours}:${minutes.toString().padStart(2, "0")}`;
};

export const formatCategory = (category: string) =>
    category.replace(/([a-z])([A-Z])/g, "$1 $2");

export const formatPriority = (priority: string) =>
    ({
        MustDo: "Must do",
        WouldLikeToDo: "Would like to do",
        Optional: "Optional",
    })[priority] ?? priority;

export const formatOpeningHours = (item: ItineraryItem) => {
    if (!item.openingTime && !item.closingTime) return null;
    if (!item.closingTime) return `From ${formatTime(item.openingTime)}`;
    if (!item.openingTime) return `Until ${formatTime(item.closingTime)}`;

    return `${formatTime(item.openingTime)} – ${formatTime(item.closingTime)}`;
};

const getMinutesSinceMidnight = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
};

/** Gives a non-blocking warning when an entered schedule conflicts with stated opening hours. */
export const getOpeningHoursWarning = (item: ItineraryItem) => {
    if (!item.startTime || !item.closingTime) return null;

    const startMinutes = getMinutesSinceMidnight(item.startTime);
    let closingMinutes = getMinutesSinceMidnight(item.closingTime);

    if (closingMinutes <= startMinutes) closingMinutes += 24 * 60;

    if (item.durationMinutes !== null && startMinutes + item.durationMinutes > closingMinutes) {
        return "This activity ends after the entered closing time.";
    }

    if (item.durationMinutes === null && closingMinutes - startMinutes <= 60) {
        return "This activity starts within one hour of closing.";
    }

    return null;
};

/** Builds each calendar date used to create the dated itinerary sections. */
export const getTripDays = (trip: Trip) => {
    if (!trip.startDate || !trip.endDate) return [];

    const days: string[] = [];
    const current = new Date(`${trip.startDate}T00:00:00`);
    const lastDay = new Date(`${trip.endDate}T00:00:00`);

    while (current <= lastDay) {
        const year = current.getFullYear();
        const month = (current.getMonth() + 1).toString().padStart(2, "0");
        const day = current.getDate().toString().padStart(2, "0");
        days.push(`${year}-${month}-${day}`);
        current.setDate(current.getDate() + 1);
    }

    return days;
};

/** Shows timed activities before untimed ones within a day. */
export const sortDatedItems = (items: ItineraryItem[]) =>
    [...items].sort(
        (first, second) =>
            Number(Boolean(second.startTime)) - Number(Boolean(first.startTime)) ||
            (first.startTime ?? "").localeCompare(second.startTime ?? "") ||
            first.createdAtUtc.localeCompare(second.createdAtUtc),
    );

const priorityOrder: Record<string, number> = {
    MustDo: 0,
    WouldLikeToDo: 1,
    Optional: 2,
};

/** Keeps unscheduled ideas ordered by their importance rather than creation date alone. */
export const sortUnscheduledItems = (items: ItineraryItem[]) =>
    [...items].sort(
        (first, second) =>
            (priorityOrder[first.priority] ?? 3) - (priorityOrder[second.priority] ?? 3) ||
            first.createdAtUtc.localeCompare(second.createdAtUtc),
    );
