// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Itinerary } from "../../../src/features/itinerary/Itinerary";
import type { Trip } from "../../../src/types/trip";

const api = vi.hoisted(() => ({
    createItineraryItem: vi.fn(),
    deleteItineraryItem: vi.fn(),
    getItineraryItems: vi.fn(),
    updateItineraryItem: vi.fn(),
}));
vi.mock("../../../src/api/itineraryApi", () => api);

const trip: Trip = {
    id: "trip-1",
    name: "Rome",
    destination: "Rome",
    startDate: "2026-09-01",
    endDate: "2026-09-03",
    arrivalTime: null,
    type: null,
    budget: 500,
    currency: "EUR",
    note: null,
    hasStartedPackingList: true,
    createdAtUtc: "2026-01-01T00:00:00Z",
    status: "Upcoming",
    unscheduledActivityCount: 0,
};

const museum = {
    id: "item-1",
    tripId: trip.id,
    name: "Museum",
    date: "2026-09-02",
    startTime: "17:30:00",
    durationMinutes: 45,
    openingTime: null,
    closingTime: "18:00:00",
    category: null,
    cost: 20,
    location: null,
    externalLink: null,
    priority: "Optional",
    note: null,
    createdAtUtc: "2026-01-01T00:00:00Z",
};

describe("Itinerary", () => {
    afterEach(cleanup);

    beforeEach(() => {
        vi.clearAllMocks();
        api.getItineraryItems.mockResolvedValue([]);
    });

    it("creates a dated activity with the expected API payload", async () => {
        const user = userEvent.setup();
        api.createItineraryItem.mockResolvedValue({
            ...museum,
            name: "Colosseum",
            date: "2026-09-02",
            startTime: "10:00:00",
            durationMinutes: 90,
        });
        render(<Itinerary trip={trip} setHasUnsavedForm={vi.fn()} />);
        await screen.findByText("Add item");
        await user.click(screen.getByRole("button", { name: "Add item" }));
        await user.type(screen.getByLabelText("Name"), "Colosseum");
        fireEvent.change(screen.getByLabelText(/^Date/), {
            target: { value: "2026-09-02" },
        });
        fireEvent.change(screen.getByLabelText(/^Time/), {
            target: { value: "10:00" },
        });
        fireEvent.change(screen.getByLabelText(/^Duration/), {
            target: { value: "01:30" },
        });
        await user.click(screen.getByRole("button", { name: "Save" }));
        await waitFor(() =>
            expect(api.createItineraryItem).toHaveBeenCalledWith(
                trip.id,
                expect.objectContaining({
                    name: "Colosseum",
                    date: "2026-09-02",
                    startTime: "10:00",
                    durationMinutes: 90,
                }),
            ),
        );
        expect(await screen.findByText("Colosseum")).toBeTruthy();
    });

    it("shows client-side validation errors without calling the API", async () => {
        const user = userEvent.setup();
        render(<Itinerary trip={trip} setHasUnsavedForm={vi.fn()} />);
        await user.click(
            await screen.findByRole("button", { name: "Add item" }),
        );
        fireEvent.submit(
            screen.getByRole("button", { name: "Save" }).closest("form")!,
        );
        expect(await screen.findByText("Enter an activity name.")).toBeTruthy();
        expect(api.createItineraryItem).not.toHaveBeenCalled();
    });

    it("displays an opening-hours conflict warning", async () => {
        api.getItineraryItems.mockResolvedValue([museum]);
        render(<Itinerary trip={trip} setHasUnsavedForm={vi.fn()} />);
        expect(
            await screen.findByText(
                "This activity ends after the entered closing time.",
            ),
        ).toBeTruthy();
    });

    it("restores a deleted activity when Undo is selected", async () => {
        const user = userEvent.setup();
        api.getItineraryItems.mockResolvedValue([museum]);
        render(<Itinerary trip={trip} setHasUnsavedForm={vi.fn()} />);
        await screen.findByRole("button", { name: "Delete Museum" });
        await user.click(screen.getByRole("button", { name: "Delete Museum" }));
        expect(
            screen.queryByRole("button", { name: "Delete Museum" }),
        ).toBeNull();
        await user.click(screen.getByRole("button", { name: /Undo/ }));
        expect(
            await screen.findByRole("button", { name: "Delete Museum" }),
        ).toBeTruthy();
        expect(api.deleteItineraryItem).not.toHaveBeenCalled();
    });
});
