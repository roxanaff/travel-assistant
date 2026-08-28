// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TripSetup } from "../../../src/features/setup/TripSetup";
import type { Trip } from "../../../src/types/trip";

const api = vi.hoisted(() => ({
    deleteTrip: vi.fn(),
    updateTrip: vi.fn(),
}));
vi.mock("../../../src/api/tripsApi", () => api);

const trip: Trip = {
    id: "trip-1",
    name: "Rome",
    destination: "Rome",
    startDate: "2026-09-01",
    endDate: "2026-09-05",
    arrivalTime: null,
    type: "CityBreak",
    budget: 500,
    currency: "EUR",
    note: "Walk everywhere.",
    hasStartedPackingList: false,
    createdAtUtc: "2026-01-01T00:00:00Z",
    status: "Upcoming",
    unscheduledActivityCount: 0,
};

const renderTripSetup = (setTrip = vi.fn()) =>
    render(
        <MemoryRouter>
            <TripSetup
                trip={trip}
                setTrip={setTrip}
                setHasUnsavedForm={vi.fn()}
            />
        </MemoryRouter>,
    );

describe("TripSetup", () => {
    afterEach(cleanup);

    beforeEach(() => vi.clearAllMocks());

    it("shows inline trip details with the budget currency and no separate currency row", () => {
        renderTripSetup();

        expect(screen.getByText("Destination").parentElement?.textContent).toContain(
            "Rome",
        );
        expect(screen.getByText("Target budget").parentElement?.textContent).toContain(
            "€500",
        );
        expect(screen.queryByText("Currency")).toBeNull();
    });

    it("opens the edit form and saves the revised trip", async () => {
        const user = userEvent.setup();
        const setTrip = vi.fn();
        const updatedTrip = { ...trip, destination: "Florence" };
        api.updateTrip.mockResolvedValue(updatedTrip);
        renderTripSetup(setTrip);

        await user.click(screen.getByRole("button", { name: "Trip actions" }));
        await user.click(screen.getByRole("button", { name: "Edit trip" }));
        const destination = screen.getByLabelText("Destination");
        await user.clear(destination);
        await user.type(destination, "Florence");
        await user.click(screen.getByRole("button", { name: "Save changes" }));

        expect(api.updateTrip).toHaveBeenCalledWith(
            trip.id,
            expect.objectContaining({ destination: "Florence" }),
        );
        expect(setTrip).toHaveBeenCalledWith(updatedTrip);
        expect(screen.getByText("Rome")).toBeTruthy();
    });
});
