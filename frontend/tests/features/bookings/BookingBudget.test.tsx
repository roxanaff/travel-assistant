// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Bookings } from "../../../src/components/bookings/Bookings";
import type { Booking } from "../../../src/types/booking";
import type { Expense } from "../../../src/types/expense";
import { localToday } from "../../../src/utils/localToday";
import { notifyActivityDeleted } from "../../../src/utils/activityDeletionEvents";
import type { Trip } from "../../../src/types/trip";
import { suggestedBudgetCategory } from "../../../src/utils/bookingBudget";

const bookingsApi = vi.hoisted(() => ({
    createBooking: vi.fn(),
    createBookingExpense: vi.fn(),
    deleteBooking: vi.fn(),
    dismissBookingActivityUpdateReview: vi.fn(),
    dismissBookingDeletedLinkNotices: vi.fn(),
    dismissBookingOutsideTripWarning: vi.fn(),
    getBookings: vi.fn(),
    linkBookingActivity: vi.fn(),
    linkBookingExpense: vi.fn(),
    unlinkBookingActivity: vi.fn(),
    unlinkBookingExpense: vi.fn(),
    updateBooking: vi.fn(),
}));
const itineraryApi = vi.hoisted(() => ({
    createItineraryItem: vi.fn(),
    getItineraryItems: vi.fn(),
}));
const expensesApi = vi.hoisted(() => ({
    deleteExpense: vi.fn(),
    getExpenses: vi.fn(),
}));

vi.mock("../../../src/api/bookingsApi", () => bookingsApi);
vi.mock("../../../src/api/itineraryApi", () => itineraryApi);
vi.mock("../../../src/api/expensesApi", () => expensesApi);
vi.mock("../../../src/api/linkedRecordReviewsApi", () => ({
    getLinkedRecordReviews: vi.fn().mockResolvedValue([]),
    resolveLinkedRecordReview: vi.fn(),
}));

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
    amountPaid: 150,
    amountRefunded: null,
    financialStatus: "PartiallyPaid",
    netCost: 150,
    activityLinks: [],
    expenseId: null,
    hasPendingDeletedActivityNotice: false,
    hasPendingDeletedExpenseNotice: false,
    createdAtUtc: "2026-01-01T00:00:00Z",
};

const existingExpense: Expense = {
    id: "expense-1",
    tripId: trip.id,
    bookingId: null,
    plannedCostId: "plan-1",
    name: "Hotel deposit",
    category: "Accommodation",
    amount: 100,
    expenseDate: "2027-03-01",
    createdAtUtc: "2026-01-01T00:00:00Z",
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

describe("booking expense actions", () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        bookingsApi.getBookings.mockResolvedValue([hotel]);
        itineraryApi.getItineraryItems.mockResolvedValue([]);
        expensesApi.getExpenses.mockResolvedValue([]);
    });

    it.each([
        [0, "Unpaid", "€0 / €200"],
        [150, "PartiallyPaid", "€150 / €200"],
        [200, "Paid", "€200"],
    ] as const)("shows the active booking payment summary for %s paid", async (paid, financialStatus, summary) => {
        bookingsApi.getBookings.mockResolvedValue([{
            ...hotel,
            amountPaid: paid,
            netCost: paid,
            financialStatus,
        }]);

        renderBookings();

        const card = (await screen.findByText(hotel.name)).closest("li")!;
        expect(card.querySelector(".booking-card-price")?.textContent).toBe(summary);
    });

    it.each([50, 80])("hides cancelled summary money but retains a refund of %s in details", async (refunded) => {
        const user = userEvent.setup();
        bookingsApi.getBookings.mockResolvedValue([{
            ...hotel,
            status: "Cancelled",
            totalCost: 150,
            amountPaid: 80,
            amountRefunded: refunded,
            netCost: 80 - refunded,
            financialStatus: "Refunded",
        }]);

        renderBookings();
        await user.click(await screen.findByRole("button", { name: "Expand Hotel Rome details" }));

        const card = screen.getByText(hotel.name).closest("li")!;
        expect(card.querySelector(".booking-card-price")?.textContent).toBe("");
        expect(card.querySelector(".booking-financial-status-pill")?.textContent).toBe("Refunded");
        for (const [label, value] of [
            ["Total cost", "€150"],
            ["Paid", "€80"],
            ["Refunded", `€${refunded} · Net cost €${80 - refunded}`],
        ]) {
            const detail = within(card).getByText(label, { selector: "strong", exact: true }).parentElement!;
            expect(detail.textContent).toBe(`${label}${value}`);
        }
    });

    it("shows dismissible date warnings when collapsed and keeps failed dismissals visible", async () => {
        const user = userEvent.setup();
        bookingsApi.getBookings.mockResolvedValue([{
            ...hotel,
            outsideTripWarning: {
                key: "dates-1",
                dates: [{ field: "StartDate", date: "2027-03-31" }],
            },
        }]);
        bookingsApi.dismissBookingOutsideTripWarning.mockRejectedValueOnce(new Error("Could not dismiss dates."));
        bookingsApi.dismissBookingOutsideTripWarning.mockResolvedValueOnce(undefined);
        renderBookings();
        const dismiss = await screen.findByRole("button", { name: "Dismiss outside-trip dates for Hotel Rome" });
        expect(screen.getByText("Outside trip dates: check-in 31 Mar 2027.")).toBeTruthy();
        expect(screen.getByRole("button", { name: "Expand Hotel Rome details" })).toBeTruthy();
        await user.click(dismiss);
        expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Could not dismiss dates.");
        expect(screen.getByRole("button", { name: "Dismiss outside-trip dates for Hotel Rome" })).toBeTruthy();
        await user.click(dismiss);
        await waitFor(() => expect(screen.queryByText(/Outside trip dates:/)).toBeNull());
        expect(bookingsApi.dismissBookingOutsideTripWarning).toHaveBeenLastCalledWith(trip.id, hotel.id, "dates-1");
    });

    it("prefills an expense with the net paid amount without creating a planned cost", async () => {
        const user = userEvent.setup();
        bookingsApi.getBookings.mockResolvedValue([{
            ...hotel,
            status: "Cancelled",
            amountPaid: 150,
            amountRefunded: 30,
            netCost: 120,
            financialStatus: "Refunded",
        }]);
        bookingsApi.createBookingExpense.mockResolvedValue({
            ...existingExpense,
            name: hotel.name,
            amount: 125,
            bookingId: hotel.id,
            plannedCostId: null,
        });

        renderBookings();
        await user.click(await screen.findByRole("button", { name: "Expand Hotel Rome details" }));
        expect(screen.getByRole("region", { name: "Expenses for Hotel Rome" }).querySelector("strong")).toBeNull();
        await user.click(screen.getByRole("button", { name: "Add to expenses" }));
        const budget = screen.getByRole("region", { name: "Expenses for Hotel Rome" });

        expect(within(budget).getByLabelText("What did you pay for?")).toHaveProperty("value", hotel.name);
        expect(within(budget).getByLabelText("Amount (EUR)")).toHaveProperty("value", "120");
        expect(within(budget).getByLabelText("Category")).toHaveProperty("value", "Accommodation");
        expect(within(budget).getByLabelText("Date")).toHaveProperty("value", localToday());
        expect(screen.queryByRole("button", { name: "Add to planned costs" })).toBeNull();

        await user.clear(within(budget).getByLabelText("Amount (EUR)"));
        await user.type(within(budget).getByLabelText("Amount (EUR)"), "125");
        await user.click(within(budget).getByRole("button", { name: "Add expense" }));

        await waitFor(() => expect(bookingsApi.createBookingExpense).toHaveBeenCalledWith(
            trip.id,
            hotel.id,
            {
                name: hotel.name,
                category: "Accommodation",
                amount: 125,
                expenseDate: localToday(),
            },
        ));
        expect(await within(budget).findByRole("link", { name: hotel.name })).toBeTruthy();
        expect(within(budget).getByText("Expense", { exact: true })).toBeTruthy();
        expect(within(budget).queryByRole("button", { name: "Add to expenses" })).toBeNull();
    });

    it("links an existing expense with a planned cost and can unlink it without deleting either", async () => {
        const user = userEvent.setup();
        expensesApi.getExpenses.mockResolvedValue([existingExpense]);
        bookingsApi.linkBookingExpense.mockResolvedValue(undefined);
        bookingsApi.unlinkBookingExpense.mockResolvedValue(undefined);

        renderBookings();
        await user.click(await screen.findByRole("button", { name: "Expand Hotel Rome details" }));
        await user.click(await screen.findByRole("button", { name: "Link existing expense" }));
        const budget = screen.getByRole("region", { name: "Expenses for Hotel Rome" });

        await user.selectOptions(within(budget).getByLabelText("Expense"), existingExpense.id);
        await user.click(within(budget).getByRole("button", { name: "Link expense" }));
        await waitFor(() => expect(bookingsApi.linkBookingExpense).toHaveBeenCalledWith(
            trip.id, hotel.id, existingExpense.id,
        ));
        expect(await within(budget).findByRole("link", { name: existingExpense.name })).toBeTruthy();

        await user.click(within(budget).getByRole("button", { name: "Unlink" }));
        await waitFor(() => expect(bookingsApi.unlinkBookingExpense).toHaveBeenCalledWith(
            trip.id, hotel.id, existingExpense.id,
        ));
        expect(await within(budget).findByRole("button", { name: "Link existing expense" })).toBeTruthy();
    });

    it("suggests the agreed financial categories", () => {
        expect(suggestedBudgetCategory(null)).toBeNull();
        expect(suggestedBudgetCategory("Flight")).toBe("TravelToFrom");
        expect(suggestedBudgetCategory("CarHire")).toBe("LocalTransport");
        expect(suggestedBudgetCategory("ConcertEvent")).toBe("ActivitiesAndMuseums");
        expect(suggestedBudgetCategory("Restaurant")).toBe("Food");
    });

    it("confirms expense deletion separately from unlinking and keeps the booking", async () => {
        const user = userEvent.setup();
        bookingsApi.getBookings.mockResolvedValue([{ ...hotel, expenseId: existingExpense.id }]);
        expensesApi.getExpenses.mockResolvedValue([{ ...existingExpense, bookingId: hotel.id }]);
        expensesApi.deleteExpense.mockResolvedValue(true);
        renderBookings();
        await user.click(await screen.findByRole("button", { name: "Expand Hotel Rome details" }));
        const region = screen.getByRole("region", { name: "Expenses for Hotel Rome" });
        await user.click(within(region).getByRole("button", { name: "Delete", exact: true }));
        const dialog = screen.getByRole("alertdialog", { name: "Delete linked expense?" });
        expect(within(dialog).getByText(/Hotel deposit.*removed from spending/)).toBeTruthy();
        expect(within(dialog).getByText(/booking and planned cost will be kept and unlinked/)).toBeTruthy();
        expect(expensesApi.deleteExpense).not.toHaveBeenCalled();
        await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
        expect(screen.queryByRole("alertdialog")).toBeNull();
        expect(within(region).getByRole("link", { name: existingExpense.name })).toBeTruthy();

        await user.click(within(region).getByRole("button", { name: "Delete", exact: true }));
        await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete", exact: true }));
        await waitFor(() => expect(expensesApi.deleteExpense).toHaveBeenCalledWith(trip.id, existingExpense.id));
        expect(await within(region).findByRole("button", { name: "Add to expenses" })).toBeTruthy();
        expect(within(region).queryByRole("link", { name: existingExpense.name })).toBeNull();
        expect(within(region).queryByRole("button", { name: "Link existing expense" })).toBeNull();
        expect(screen.getByText(hotel.name)).toBeTruthy();
        expect(bookingsApi.deleteBooking).not.toHaveBeenCalled();
        expect(bookingsApi.unlinkBookingExpense).not.toHaveBeenCalled();
    });

    it("keeps the linked expense on deletion failure and allows a retry", async () => {
        const user = userEvent.setup();
        bookingsApi.getBookings.mockResolvedValue([{ ...hotel, expenseId: existingExpense.id }]);
        expensesApi.getExpenses.mockResolvedValue([{ ...existingExpense, bookingId: hotel.id, plannedCostId: null }]);
        expensesApi.deleteExpense.mockRejectedValueOnce(new Error("Could not delete this expense."));
        renderBookings();
        await user.click(await screen.findByRole("button", { name: "Expand Hotel Rome details" }));
        const region = screen.getByRole("region", { name: "Expenses for Hotel Rome" });
        await user.click(within(region).getByRole("button", { name: "Delete", exact: true }));
        expect(within(screen.getByRole("alertdialog")).getByText(/Its booking will be kept and unlinked/)).toBeTruthy();
        await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete", exact: true }));
        expect(await within(region).findByText("Could not delete this expense.")).toBeTruthy();
        expect(within(region).getByRole("link", { name: existingExpense.name })).toBeTruthy();

        expensesApi.deleteExpense.mockResolvedValueOnce(false);
        await user.click(within(region).getByRole("button", { name: "Delete", exact: true }));
        await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete", exact: true }));
        expect(await within(region).findByRole("button", { name: "Add to expenses" })).toBeTruthy();
        expect(within(region).queryByText("Could not delete this expense.")).toBeNull();
    });

    it("shows each activity change once while collapsed and allows dismissal without expanding", async () => {
        const user = userEvent.setup();
        bookingsApi.getBookings.mockResolvedValue([{
            ...hotel,
            activityLinks: [
                {
                    id: "activity-1",
                    name: "Check-in",
                    role: "General",
                    hasPendingBookingUpdateReview: true,
                    pendingBookingChangeFields: "schedule",
                },
                {
                    id: "activity-2",
                    name: "Return flight",
                    role: "Return",
                    hasPendingBookingUpdateReview: true,
                    pendingBookingChangeFields: "location",
                },
            ],
        }]);
        bookingsApi.dismissBookingActivityUpdateReview.mockRejectedValueOnce(new Error("Could not dismiss this review."));
        bookingsApi.dismissBookingActivityUpdateReview.mockResolvedValueOnce(undefined);
        renderBookings();
        const expand = await screen.findByRole("button", { name: "Expand Hotel Rome details" });
        expect(screen.getAllByText(/Activity “Check-in”/)).toHaveLength(1);
        expect(screen.getAllByText(/Activity “Return flight”.*Return journey/)).toHaveLength(1);
        await user.click(expand);
        expect(screen.getAllByText(/Activity “Check-in”/)).toHaveLength(1);
        await user.click(screen.getByRole("button", { name: "Collapse Hotel Rome details" }));
        await user.click(screen.getByRole("button", { name: "Keep changes from Check-in as is" }));
        expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Could not dismiss this review.");
        expect(screen.getByText(/Activity “Check-in”/)).toBeTruthy();
        await user.click(screen.getByRole("button", { name: "Keep changes from Check-in as is" }));
        await waitFor(() => expect(screen.queryByText(/Activity “Check-in”/)).toBeNull());
        expect(bookingsApi.dismissBookingActivityUpdateReview).toHaveBeenLastCalledWith(trip.id, hotel.id, "activity-1", "booking");
        expect(screen.getByText(/Activity “Return flight”/)).toBeTruthy();
        expect(screen.getByRole("button", { name: "Expand Hotel Rome details" })).toBeTruthy();
    });

    it("removes a stale activity link when deletion completes after entering Bookings", async () => {
        const user = userEvent.setup();
        bookingsApi.getBookings.mockResolvedValueOnce([{
            ...hotel,
            activityLinks: [{
                id: "activity-1",
                name: "Deleted check-in",
                role: "General",
            }],
        }]);
        renderBookings();
        await user.click(await screen.findByRole("button", { name: "Expand Hotel Rome details" }));
        expect(screen.getByRole("link", { name: "Deleted check-in" })).toBeTruthy();

        bookingsApi.getBookings.mockResolvedValueOnce([{
            ...hotel,
            activityLinks: [],
            hasPendingDeletedActivityNotice: true,
        }]);
        act(() => notifyActivityDeleted("different-trip"));
        expect(bookingsApi.getBookings).toHaveBeenCalledTimes(1);
        act(() => notifyActivityDeleted(trip.id));

        expect(await screen.findByText("A linked activity was deleted. This booking was kept.")).toBeTruthy();
        expect(screen.queryByRole("link", { name: "Deleted check-in" })).toBeNull();
        expect(screen.getByRole("button", { name: "Collapse Hotel Rome details" })).toBeTruthy();
    });

    it("makes a deleted booking's surviving expense immediately available to another booking", async () => {
        const user = userEvent.setup();
        vi.spyOn(window, "confirm").mockReturnValue(true);
        bookingsApi.deleteBooking.mockResolvedValue(undefined);
        bookingsApi.getBookings.mockResolvedValue([
            { ...hotel, expenseId: existingExpense.id },
            { ...hotel, id: "booking-2", name: "Second hotel" },
        ]);
        expensesApi.getExpenses.mockResolvedValue([{
            ...existingExpense,
            bookingId: hotel.id,
        }]);
        renderBookings();

        await user.click(await screen.findByRole("button", { name: "Expand Second hotel details" }));
        expect(screen.queryByRole("button", { name: "Link existing expense" })).toBeNull();
        await user.click(screen.getByRole("button", { name: "Delete Hotel Rome" }));
        await waitFor(() => expect(bookingsApi.deleteBooking).toHaveBeenCalledWith(trip.id, hotel.id));

        await user.click(await screen.findByRole("button", { name: "Link existing expense" }));
        expect(screen.getByRole("option", { name: /Hotel deposit/ })).toBeTruthy();
    });

    it("does not restore an expense link from a refresh that predates a successful unlink", async () => {
        const user = userEvent.setup();
        const linkedBooking = { ...hotel, expenseId: existingExpense.id };
        bookingsApi.getBookings.mockResolvedValueOnce([linkedBooking]);
        expensesApi.getExpenses.mockResolvedValue([{ ...existingExpense, bookingId: hotel.id }]);
        bookingsApi.unlinkBookingExpense.mockResolvedValue(undefined);
        renderBookings();
        await user.click(await screen.findByRole("button", { name: "Expand Hotel Rome details" }));
        await screen.findByRole("link", { name: existingExpense.name });

        let finishRefresh!: (bookings: Booking[]) => void;
        bookingsApi.getBookings.mockImplementationOnce(() => new Promise<Booking[]>((resolve) => {
            finishRefresh = resolve;
        }));
        bookingsApi.getBookings.mockResolvedValueOnce([{
            ...hotel,
            hasPendingDeletedActivityNotice: true,
        }]);
        act(() => notifyActivityDeleted(trip.id));
        await user.click(screen.getByRole("button", { name: "Unlink", exact: true }));
        await screen.findByRole("button", { name: "Add to expenses" });
        await act(async () => finishRefresh([linkedBooking]));

        await screen.findByText("A linked activity was deleted. This booking was kept.");
        expect(screen.queryByRole("link", { name: existingExpense.name })).toBeNull();
        expect(bookingsApi.getBookings).toHaveBeenCalledTimes(3);
    });

    it("does not offer budget actions when cost is unknown or free", async () => {
        const user = userEvent.setup();
        bookingsApi.getBookings.mockResolvedValue([
            { ...hotel, totalCost: null, amountPaid: 0, netCost: 0, financialStatus: null },
            {
                ...hotel,
                id: "booking-2",
                name: "Free museum",
                totalCost: 0,
                amountPaid: 0,
                netCost: 0,
                financialStatus: "Free",
            },
        ]);

        renderBookings();
        await user.click(await screen.findByRole("button", { name: "Expand Hotel Rome details" }));
        await user.click(screen.getByRole("button", { name: "Expand Free museum details" }));

        expect(screen.queryByRole("button", { name: "Add to expenses" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Link existing expense" })).toBeNull();
    });

    it("confirms before switching away from a changed expense form", async () => {
        const user = userEvent.setup();
        renderBookings();

        await user.click(await screen.findByRole("button", { name: "Expand Hotel Rome details" }));
        await user.click(screen.getByRole("button", { name: "Add to expenses" }));
        const budget = screen.getByRole("region", { name: "Expenses for Hotel Rome" });
        await user.clear(within(budget).getByLabelText("What did you pay for?"));
        await user.type(within(budget).getByLabelText("What did you pay for?"), "Different plan");
        await user.click(screen.getByRole("button", { name: "Add booking" }));

        expect(screen.getByText("Your changes will be lost.")).toBeTruthy();
        await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" }));
        expect(within(budget).getByLabelText("What did you pay for?")).toHaveProperty("value", "Different plan");
        expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
    });

    it("rejects an invalid decimal before calling the expense API", async () => {
        const user = userEvent.setup();
        renderBookings();

        await user.click(await screen.findByRole("button", { name: "Expand Hotel Rome details" }));
        await user.click(screen.getByRole("button", { name: "Add to expenses" }));
        const amount = screen.getByLabelText("Amount (EUR)");
        await user.clear(amount);
        await user.type(amount, ".");
        await user.click(screen.getByRole("button", { name: "Add expense" }));

        expect(screen.getByText("Enter an amount greater than zero.")).toBeTruthy();
        expect(bookingsApi.createBookingExpense).not.toHaveBeenCalled();
    });

    it("confirms before leaving a changed expense draft through another booking's budget link", async () => {
        const user = userEvent.setup();
        bookingsApi.getBookings.mockResolvedValue([
            hotel,
            {
                ...hotel,
                id: "booking-2",
                name: "Second hotel",
                expenseId: existingExpense.id,
            },
        ]);
        expensesApi.getExpenses.mockResolvedValue([{
            ...existingExpense,
            bookingId: "booking-2",
        }]);
        renderBookings();

        await user.click(await screen.findByRole("button", { name: "Expand Hotel Rome details" }));
        await user.click(screen.getByRole("button", { name: "Expand Second hotel details" }));
        await user.click(screen.getByRole("button", { name: "Add to expenses" }));
        await user.clear(screen.getByLabelText("What did you pay for?"));
        await user.type(screen.getByLabelText("What did you pay for?"), "Changed plan");
        await user.click(screen.getByRole("link", { name: "Hotel deposit" }));

        expect(screen.getByTestId("location")).toHaveProperty("value", "/");
        const dialog = screen.getByRole("alertdialog");
        await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
        expect(screen.getByLabelText("What did you pay for?")).toHaveProperty("value", "Changed plan");

        await user.click(screen.getByRole("link", { name: "Hotel deposit" }));
        await user.click(within(screen.getByRole("alertdialog")).getByRole("button", {
            name: "Discard changes",
        }));
        expect(screen.getByTestId("location")).toHaveProperty("value", "/trips/trip-1/budget");
    });

    it("confirms before leaving a changed expense draft through a linked activity", async () => {
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
        await user.click(screen.getByRole("button", { name: "Add to expenses" }));
        await user.clear(screen.getByLabelText("What did you pay for?"));
        await user.type(screen.getByLabelText("What did you pay for?"), "Changed plan");
        await user.click(screen.getByRole("link", { name: "Hotel check-in" }));

        expect(screen.getByTestId("location")).toHaveProperty("value", "/");
        await user.click(within(screen.getByRole("alertdialog")).getByRole("button", {
            name: "Discard changes",
        }));
        expect(screen.getByTestId("location")).toHaveProperty("value", "/trips/trip-1/itinerary");
    });
});
