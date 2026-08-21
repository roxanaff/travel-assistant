import { describe, expect, it } from "vitest";

import type { ItineraryItem } from "../../types/itineraryItem";
import type { Trip } from "../../types/trip";
import { getOpeningHoursWarning, getTripDays, sortDatedItems, sortUnscheduledItems } from "./itineraryUtils";

const trip = { startDate: "2026-09-01", endDate: "2026-09-03" } as Trip;

const item = (overrides: Partial<ItineraryItem>): ItineraryItem => ({
    id: crypto.randomUUID(), tripId: "trip", name: "Activity", date: null, startTime: null,
    durationMinutes: null, openingTime: null, closingTime: null, category: null, cost: null,
    location: null, externalLink: null, priority: "Optional", note: null,
    createdAtUtc: "2026-01-01T00:00:00Z", ...overrides,
});

describe("getTripDays", () => {
    it("returns every inclusive date in the trip", () => {
        expect(getTripDays(trip)).toEqual(["2026-09-01", "2026-09-02", "2026-09-03"]);
    });

    it("returns no days for an undated trip", () => {
        expect(getTripDays({ ...trip, startDate: null })).toEqual([]);
    });
});

describe("itinerary ordering", () => {
    it("puts timed entries first and orders them by start time", () => {
        const sorted = sortDatedItems([item({ name: "Untimed" }), item({ name: "Later", startTime: "14:00" }), item({ name: "Earlier", startTime: "09:00" })]);
        expect(sorted.map((entry) => entry.name)).toEqual(["Earlier", "Later", "Untimed"]);
    });

    it("orders unscheduled ideas by priority", () => {
        const sorted = sortUnscheduledItems([item({ name: "Optional" }), item({ name: "Must do", priority: "MustDo" }), item({ name: "Would like", priority: "WouldLikeToDo" })]);
        expect(sorted.map((entry) => entry.name)).toEqual(["Must do", "Would like", "Optional"]);
    });
});

describe("getOpeningHoursWarning", () => {
    it("warns when a scheduled activity would end after closing", () => {
        expect(getOpeningHoursWarning(item({ startTime: "17:30", closingTime: "18:00", durationMinutes: 45 }))).toBe("This activity ends after the entered closing time.");
    });

    it("warns about an untimed duration when it starts within an hour of closing", () => {
        expect(getOpeningHoursWarning(item({ startTime: "17:30", closingTime: "18:00" }))).toBe("This activity starts within one hour of closing.");
    });

    it("does not warn for a schedule that finishes before closing", () => {
        expect(getOpeningHoursWarning(item({ startTime: "17:00", closingTime: "18:00", durationMinutes: 30 }))).toBeNull();
    });
});
