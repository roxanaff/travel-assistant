import type { BookingCategory } from "../types/booking";
import type { PlannedCostCategory } from "../types/plannedCost";

/** Suggests a budget category without forcing the traveller to keep it. */
export function suggestedBudgetCategory(
    bookingCategory: BookingCategory | null,
): PlannedCostCategory | null {
    switch (bookingCategory) {
        case "Accommodation":
            return "Accommodation";
        case "Flight":
        case "RailBusFerry":
            return "TravelToFrom";
        case "LocalTransport":
        case "CarHire":
            return "LocalTransport";
        case "MuseumAttraction":
        case "TourActivity":
        case "ConcertEvent":
            return "ActivitiesAndMuseums";
        case "Restaurant":
            return "Food";
        case "Other":
            return "Other";
        default:
            return null;
    }
}
