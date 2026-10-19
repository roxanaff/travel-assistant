// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Bookings } from "../../../src/components/bookings/Bookings";
import type { Booking } from "../../../src/types/booking";
import type { PlannedCost } from "../../../src/types/plannedCost";
import type { Trip } from "../../../src/types/trip";
import { suggestedBudgetCategory } from "../../../src/utils/bookingBudget";

const bookingsApi = vi.hoisted(() => ({
    createBooking: vi.fn(),
    createBookingPlannedCost: vi.fn(),
    deleteBooking: vi.fn(),
    dismissBookingActivityUpdateReview: vi.fn(),
    dismissBookingDeletedLinkNotices: vi.fn(),
    getBookings: vi.fn(),
    linkBookingActivity: vi.fn(),
    linkBookingPlannedCost: vi.fn(),
    unlinkBookingActivity: vi.fn(),
    unlinkBookingPlannedCost: vi.fn(),
    updateBooking: vi.fn(),
}));
const itineraryApi = vi.hoisted(() => ({
    createItineraryItem: vi.fn(),
    getItineraryItems: vi.fn(),
}));
const plannedCostsApi = vi.hoisted(() => ({
    getPlannedCosts: vi.fn(),
}));
const expensesApi = vi.hoisted(() => ({
    getExpenses: vi.fn(),
}));

vi.mock("../../../src/api/bookingsApi", () => bookingsApi);
vi.mock("../../../src/api/itineraryApi", () => itineraryApi);
vi.mock("../../../src/api/plannedCostsApi", () => plannedCostsApi);
vi.mock("../../../src/api/expensesApi", () => expensesApi);

const trip: Trip = {
    id: "trip-1",
    name: "Rome",
    destination: "Rome",
    startDate: "2027-04-01",
    endDate: "2027-04-05",
    arrivalTime: null,
    type: null,
    budget: 500,
    currency: "EUR",
    note: null,
    hasStartedPackingList: false,
    hasStartedTodoList: false,
    hasPendingTodoDeadlineReview: false,
    createdAtUtc: "2026-01-01T00:00:00Z",
    status: "Upcoming",
    unscheduledActivityCount: 0,
};

const hotel: Booking = {
    id: "booking-1",
    tripId: trip.id,
    name: "Hotel Rome",
    category: "Accommodation",
    status: "Confirmed",
    provider: null,
    confirmationNumber: null,
    startDate: "2027-04-01",
    startTime: null,
    endDate: null,
    endTime: null,
    location: null,
    startLocation: null,
    endLocation: null,
    returnStartDate: null,
    returnStartTime: null,
    returnStartLocation: null,
    returnEndDate: null,
    returnEndTime: null,
    returnEndLocation: null,
    externalLink: null,
    note: null,
    totalCost: 200,
    amountPaid: 0,
    amountRefunded: null,
    financialStatus: "Unpaid",
    netCost: 0,
    activityLinks: [],
    plannedCostId: null,
    expenseId: null,
    hasPendingDeletedActivityNotice: false,
    hasPendingDeletedPlannedCostNotice: false,
    hasPendingDeletedExpenseNotice: false,
    createdAtUtc: "2026-01-01T00:00:00Z",
};

const existingPlan: PlannedCost = {
    id: "plan-1",
    tripId: trip.id,
    bookingId: null,
    name: "Rome hotel plan",
    category: "Accommodation",
    amount: 220,
    createdAtUtc: "2026-01-01T00:00:00Z",
    expenseAdded: true,
    expenseId: "expense-1",
};

function renderBookings() {
    return render(
        <MemoryRouter>
            <Bookings trip={trip} setHasUnsavedForm={vi.fn()} />
            <LocationProbe />
        </MemoryRouter>,
    );
}

function LocationProbe() {
    const location = useLocation();
    return <output data-testid="location">{location.pathname}</output>;
}

describe("booking planned-cost actions", () => {
    afterEach(cleanup);

    beforeEach(() => {
        vi.clearAllMocks();
        bookingsApi.getBookings.mockResolvedValue([hotel]);
        itineraryApi.getItineraryItems.mockResolvedValue([]);
        plannedCostsApi.getPlannedCosts.mockResolvedValue([]);
        expensesApi.getExpenses.mockResolvedValue([]);
    });

    it("prefills and creates a linked planned cost from the booking", async () => {
        const user = userEvent.setup();
        bookingsApi.createBookingPlannedCost.mockResolvedValue({
            ...existingPlan,
            name: "Hotel Rome",
            amount: 210,
            bookingId: hotel.id,
            expenseAdded: false,
            expenseId: null,
        });

        renderBookings();
        await user.click(await screen.findByRole("button", { name: "Expand Hotel Rome details" }));
        await user.click(screen.getByRole("button", { name: "Add to planned costs" }));

        const budget = screen.getByRole("region", { name: "Budget for Hotel Rome" });
        expect(within(budget).getByLabelText("Name")).toHaveProperty("value", "Hotel Rome");
        expect(within(budget).getByLabelText("Amount (EUR)"))
            .toHaveProperty("value", "200");
        expect(within(budget).getByLabelText("Category"))
            .toHaveProperty("value", "Accommodation");

        await user.clear(within(budget).getByLabelText("Amount (EUR)"));
        await user.type(within(budget).getByLabelText("Amount (EUR)"), "210");
        await user.click(within(budget).getByRole("button", { name: "Add planned cost" }));

        await waitFor(() => expect(bookingsApi.createBookingPlannedCost).toHaveBeenCalledWith(
            trip.id,
            hotel.id,
            {
                name: "Hotel Rome",
                category: "Accommodation",
                amount: 210,
            },
        ));
        expect(await within(budget).findByRole("link", { name: "Hotel Rome" })).toBeTruthy();
        expect(within(budget).queryByRole("button", { name: "Add to planned costs" })).toBeNull();
    });

    it("links an existing planned cost, shows its expense, and unlinks without deleting either", async () => {
        const user = userEvent.setup();
        plannedCostsApi.getPlannedCosts.mockResolvedValue([existingPlan]);
        expensesApi.getExpenses.mockResolvedValue([{
            id: "expense-1",
            tripId: trip.id,
            plannedCostId: existingPlan.id,
            name: "Hotel deposit",
            category: "Accommodation",
            amount: 100,
            expenseDate: "2027-03-01",
            createdAtUtc: "2026-01-01T00:00:00Z",
        }]);
        bookingsApi.linkBookingPlannedCost.mockResolvedValue(undefined);
        bookingsApi.unlinkBookingPlannedCost.mockResolvedValue(undefined);

        renderBookings();
        await user.click(await screen.findByRole("button", { name: "Expand Hotel Rome details" }));
        await user.click(await screen.findByRole("button", { name: "Link existing planned cost" }));

        const budget = screen.getByRole("region", { name: "Budget for Hotel Rome" });
        await user.selectOptions(within(budget).getByLabelText("Planned cost"), existingPlan.id);
        await user.click(within(budget).getByRole("button", { name: "Link planned cost" }));

        await waitFor(() => expect(bookingsApi.linkBookingPlannedCost).toHaveBeenCalledWith(
            trip.id,
            hotel.id,
            existingPlan.id,
        ));
        expect(await within(budget).findByRole("link", { name: "Rome hotel plan" })).toBeTruthy();
        expect(within(budget).getByRole("link", { name: "Hotel deposit" })).toBeTruthy();

        await user.click(within(budget).getByRole("button", { name: "Unlink" }));
        await waitFor(() => expect(bookingsApi.unlinkBookingPlannedCost).toHaveBeenCalledWith(
            trip.id,
            hotel.id,
            existingPlan.id,
        ));
        expect(await within(budget).findByRole("button", { name: "Link existing planned cost" }))
            .toBeTruthy();
    });

    it("suggests the agreed financial categories", () => {
        expect(suggestedBudgetCategory(null)).toBeNull();
        expect(suggestedBudgetCategory("Flight")).toBe("TravelToFrom");
        expect(suggestedBudgetCategory("CarHire")).toBe("LocalTransport");
        expect(suggestedBudgetCategory("ConcertEvent")).toBe("ActivitiesAndMuseums");
        expect(suggestedBudgetCategory("Restaurant")).toBe("Food");
    });

    it("does not offer budget actions when cost is unknown or free", async () => {
        const user = userEvent.setup();
        bookingsApi.getBookings.mockResolvedValue([
            { ...hotel, totalCost: null, financialStatus: null },
            {
                ...hotel,
                id: "booking-2",
                name: "Free museum",
                totalCost: 0,
                financialStatus: "Free",
            },
        ]);

        renderBookings();
        await user.click(await screen.findByRole("button", { name: "Expand Hotel Rome details" }));
        await user.click(screen.getByRole("button", { name: "Expand Free museum details" }));

        expect(screen.queryByRole("button", { name: "Add to planned costs" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Link existing planned cost" })).toBeNull();
    });

    it("confirms before switching away from a changed planned-cost form", async () => {
        const user = userEvent.setup();
        renderBookings();

        await user.click(await screen.findByRole("button", { name: "Expand Hotel Rome details" }));
        await user.click(screen.getByRole("button", { name: "Add to planned costs" }));
        const budget = screen.getByRole("region", { name: "Budget for Hotel Rome" });
        await user.clear(within(budget).getByLabelText("Name"));
        await user.type(within(budget).getByLabelText("Name"), "Different plan");
        await user.click(screen.getByRole("button", { name: "Add booking" }));

        expect(screen.getByText("Your changes will be lost.")).toBeTruthy();
        await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" }));
        expect(within(budget).getByLabelText("Name")).toHaveProperty("value", "Different plan");
        expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
    });

    it("rejects an invalid decimal before calling the planned-cost API", async () => {
        const user = userEvent.setup();
        renderBookings();

        await user.click(await screen.findByRole("button", { name: "Expand Hotel Rome details" }));
        await user.click(screen.getByRole("button", { name: "Add to planned costs" }));
        const amount = screen.getByLabelText("Amount (EUR)");
        await user.clear(amount);
        await user.type(amount, ".");
        await user.click(screen.getByRole("button", { name: "Add planned cost" }));

        expect(screen.getByText("Enter an amount greater than zero.")).toBeTruthy();
        expect(bookingsApi.createBookingPlannedCost).not.toHaveBeenCalled();
    });

    it("confirms before leaving a changed plan draft through another booking's budget link", async () => {
        const user = userEvent.setup();
        bookingsApi.getBookings.mockResolvedValue([
            hotel,
            {
                ...hotel,
                id: "booking-2",
                name: "Second hotel",
                plannedCostId: existingPlan.id,
            },
        ]);
        plannedCostsApi.getPlannedCosts.mockResolvedValue([{
            ...existingPlan,
            bookingId: "booking-2",
        }]);
        renderBookings();

        await user.click(await screen.findByRole("button", { name: "Expand Hotel Rome details" }));
        await user.click(screen.getByRole("button", { name: "Expand Second hotel details" }));
        await user.click(screen.getByRole("button", { name: "Add to planned costs" }));
        await user.clear(screen.getByLabelText("Name"));
        await user.type(screen.getByLabelText("Name"), "Changed plan");
        await user.click(screen.getByRole("link", { name: "Rome hotel plan" }));

        expect(screen.getByTestId("location")).toHaveProperty("value", "/");
        const dialog = screen.getByRole("alertdialog");
        await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
        expect(screen.getByLabelText("Name")).toHaveProperty("value", "Changed plan");

        await user.click(screen.getByRole("link", { name: "Rome hotel plan" }));
        await user.click(within(screen.getByRole("alertdialog")).getByRole("button", {
            name: "Discard changes",
        }));
        expect(screen.getByTestId("location")).toHaveProperty("value", "/trips/trip-1/budget");
    });

    it("confirms before leaving a changed plan draft through a linked activity", async () => {
        const user = userEvent.setup();
        bookingsApi.getBookings.mockResolvedValue([{
            ...hotel,
            activityLinks: [{
                id: "activity-1",
                name: "Hotel check-in",
                date: "2027-04-01",
                startTime: null,
                role: "General",
                hasPendingBookingUpdateReview: false,
                hasPendingActivityUpdateReview: false,
                pendingBookingChangeFields: null,
                pendingActivityChangeFields: null,
            }],
        }]);
        renderBookings();

        await user.click(await screen.findByRole("button", { name: "Expand Hotel Rome details" }));
        await user.click(screen.getByRole("button", { name: "Add to planned costs" }));
        await user.clear(screen.getByLabelText("Name"));
        await user.type(screen.getByLabelText("Name"), "Changed plan");
        await user.click(screen.getByRole("link", { name: "Hotel check-in" }));

        expect(screen.getByTestId("location")).toHaveProperty("value", "/");
        await user.click(within(screen.getByRole("alertdialog")).getByRole("button", {
            name: "Discard changes",
        }));
        expect(screen.getByTestId("location")).toHaveProperty("value", "/trips/trip-1/itinerary");
    });
});
