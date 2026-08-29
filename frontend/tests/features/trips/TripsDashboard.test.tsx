// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TripsDashboard } from "../../../src/components/trips/TripsDashboard";

const renderDashboard = () =>
    render(
        <MemoryRouter>
            <TripsDashboard />
        </MemoryRouter>,
    );

const api = vi.hoisted(() => ({
    getTrips: vi.fn(),
    createTrip: vi.fn(),
    updateTrip: vi.fn(),
    deleteTrip: vi.fn(),
}));
vi.mock("../../../src/api/tripsApi", () => api);

const trip = {
    id: "trip-1",
    name: "Rome",
    destination: "Rome",
    startDate: "2026-09-01",
    endDate: "2026-09-05",
    arrivalTime: null,
    type: "CityBreak",
    budget: 500,
    currency: "EUR",
    note: null,
    hasStartedPackingList: false,
    createdAtUtc: "2026-01-01T00:00:00Z",
    status: "Upcoming" as const,
    unscheduledActivityCount: 0,
};

describe("TripsDashboard", () => {
    afterEach(cleanup);

    beforeEach(() => {
        vi.clearAllMocks();
        api.getTrips.mockResolvedValue([]);
    });

    it("shows the empty state after loading no trips", async () => {
        renderDashboard();
        expect(await screen.findByText("No trips yet")).toBeTruthy();
    });

    it("shows a connection error when the trip index cannot load", async () => {
        api.getTrips.mockRejectedValue(new Error("offline"));
        renderDashboard();
        expect(
            await screen.findByText("Could not connect to the Travel Assistant API."),
        ).toBeTruthy();
    });

    it("renders the supplied lifecycle statuses", async () => {
        api.getTrips.mockResolvedValue([
            { ...trip, id: "draft", name: "Draft", status: "Draft" },
            { ...trip, id: "ongoing", name: "Ongoing", status: "Ongoing" },
            { ...trip, id: "past", name: "Past", status: "Past" },
        ]);
        renderDashboard();
        expect(await screen.findByRole("link", { name: /Draft/ })).toBeTruthy();
        expect(screen.getByRole("link", { name: /Ongoing/ })).toBeTruthy();
        expect(screen.getByRole("link", { name: /Past/ })).toBeTruthy();
    });

    it("opens a new-trip form and creates a trip", async () => {
        const user = userEvent.setup();
        api.createTrip.mockResolvedValue(trip);
        renderDashboard();
        await screen.findByText("No trips yet");
        await user.click(screen.getByRole("button", { name: /New trip/ }));
        await user.type(screen.getByLabelText("Trip name"), "Rome");
        await user.click(screen.getByRole("button", { name: "Save trip" }));

        expect(await screen.findByRole("heading", { name: "Rome" })).toBeTruthy();
        expect(api.createTrip).toHaveBeenCalledWith(
            expect.objectContaining({ name: "Rome" }),
        );
    });
});
