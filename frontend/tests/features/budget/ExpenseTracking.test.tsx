// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ExpenseTracking } from "../../../src/components/budget/ExpenseTracking";
import type { Trip } from "../../../src/types/trip";
import type { Expense } from "../../../src/types/expense";

const api = vi.hoisted(() => ({
    getExpenses: vi.fn(),
    createExpense: vi.fn(),
    deleteExpense: vi.fn(),
    updateExpense: vi.fn(),
}));
vi.mock("../../../src/api/expensesApi", () => api);
vi.mock("../../../src/api/linkedRecordReviewsApi", () => ({
    getLinkedRecordReviews: vi.fn().mockResolvedValue([]),
    resolveLinkedRecordReview: vi.fn(),
}));

const trip: Trip = {
    id: "trip-1",
    name: "Rome",
    destination: "Rome",
    startDate: null,
    endDate: null,
    arrivalTime: null,
    type: null,
    budget: 500,
    currency: "EUR",
    note: null,
    hasStartedPackingList: true,
    hasStartedTodoList: false,
    hasPendingTodoDeadlineReview: false,
    createdAtUtc: "2026-01-01T00:00:00Z",
    status: "Upcoming",
    unscheduledActivityCount: 0,
};

const hotel: Expense = {
    id: "expense-1",
    tripId: trip.id,
    name: "Hotel",
    plannedCostId: null,
    bookingId: null,
    category: "Accommodation",
    amount: 120,
    expenseDate: "2026-09-01",
    createdAtUtc: "2026-01-01T00:00:00Z",
};

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: Error) => void;
    const promise = new Promise<T>((finish, fail) => {
        resolve = finish;
        reject = fail;
    });
    return { promise, resolve, reject };
}

const onFormOpenChange = vi.fn();
const expensesPage = (selectedTrip = trip, refreshKey = 0) => (
    <MemoryRouter>
        <ExpenseTracking trip={selectedTrip} refreshKey={refreshKey} onFormOpenChange={onFormOpenChange} />
    </MemoryRouter>
);

describe("ExpenseTracking", () => {
    afterEach(cleanup);

    beforeEach(() => {
        vi.clearAllMocks();
        api.getExpenses.mockResolvedValue([hotel]);
    });

    it("shows the loaded expense and recalculates the remaining budget", async () => {
        render(
            <MemoryRouter>
                <ExpenseTracking
                    trip={trip}
                    refreshKey={0}
                    onFormOpenChange={vi.fn()}
                />
            </MemoryRouter>,
        );
        expect(await screen.findByText("Hotel")).toBeTruthy();
        expect(screen.getAllByText("€120").length).toBeGreaterThan(0);
        expect(
            screen.getByText("Actual remaining").parentElement?.textContent,
        ).toContain("€380");
    });

    it("rejects a zero-value expense before calling the API", async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter>
                <ExpenseTracking
                    trip={trip}
                    refreshKey={0}
                    onFormOpenChange={vi.fn()}
                />
            </MemoryRouter>,
        );
        await screen.findByText("Hotel");
        await user.click(screen.getByRole("button", { name: "Add expense" }));
        await user.type(screen.getByLabelText(/Amount/), "0");
        fireEvent.submit(
            screen.getByRole("button", { name: "Save" }).closest("form")!,
        );
        expect(
            await screen.findByText("Enter an amount greater than zero."),
        ).toBeTruthy();
        expect(api.createExpense).not.toHaveBeenCalled();
    });

    it("restores an expense when Undo is selected", async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter>
                <ExpenseTracking
                    trip={trip}
                    refreshKey={0}
                    onFormOpenChange={vi.fn()}
                />
            </MemoryRouter>,
        );
        await screen.findByText("Hotel");
        await user.click(screen.getByRole("button", { name: "Delete Hotel" }));
        expect(screen.queryByText("Hotel")).toBeNull();
        await user.click(screen.getByRole("button", { name: /Undo/ }));
        expect(await screen.findByText("Hotel")).toBeTruthy();
        expect(api.deleteExpense).not.toHaveBeenCalled();
    });

    it("confirms deleting a booking-linked expense before calling the API", async () => {
        const user = userEvent.setup();
        api.getExpenses.mockResolvedValue([{ ...hotel, bookingId: "booking-1" }]);
        api.deleteExpense.mockResolvedValue(true);
        render(
            <MemoryRouter>
                <ExpenseTracking trip={trip} refreshKey={0} onFormOpenChange={vi.fn()} />
            </MemoryRouter>,
        );

        await screen.findByText("Hotel");
        await user.click(screen.getByRole("button", { name: "Delete Hotel" }));
        expect(screen.getByRole("alertdialog").textContent).toContain("booking will be kept and unlinked");
        expect(api.deleteExpense).not.toHaveBeenCalled();
        await user.click(screen.getByRole("button", { name: "Delete expense" }));
        expect(api.deleteExpense).toHaveBeenCalledWith(trip.id, hotel.id);
        expect(screen.queryByText("Hotel")).toBeNull();
    });

    it.each(["old first", "new first"])("only applies the current refresh when requests finish %s", async (order) => {
        const oldRequest = deferred<Expense[]>();
        const currentRequest = deferred<Expense[]>();
        const currentExpense = { ...hotel, id: "current", name: "Current expense" };
        api.getExpenses.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(currentRequest.promise);
        const view = render(expensesPage());
        await waitFor(() => expect(api.getExpenses).toHaveBeenCalledTimes(1));
        view.rerender(expensesPage(trip, 1));
        await waitFor(() => expect(api.getExpenses).toHaveBeenCalledTimes(2));

        if (order === "old first") {
            await act(async () => {
                oldRequest.resolve([hotel]);
            });
            expect(screen.getByText("Loading expenses…")).toBeTruthy();
            expect(screen.queryByText("Hotel")).toBeNull();
            await act(async () => {
                currentRequest.resolve([currentExpense]);
            });
        } else {
            await act(async () => {
                currentRequest.resolve([currentExpense]);
            });
            await act(async () => {
                oldRequest.resolve([hotel]);
            });
        }

        expect(screen.getByText("Current expense")).toBeTruthy();
        expect(screen.queryByText("Hotel")).toBeNull();
        expect(screen.queryByText("Loading expenses…")).toBeNull();
    });

    it("ignores stale refresh failures after the current refresh succeeds", async () => {
        const oldRequest = deferred<Expense[]>();
        api.getExpenses.mockReturnValueOnce(oldRequest.promise).mockResolvedValueOnce([hotel]);
        const view = render(expensesPage());
        await waitFor(() => expect(api.getExpenses).toHaveBeenCalledTimes(1));
        view.rerender(expensesPage(trip, 1));
        await screen.findByText("Hotel");
        await act(async () => {
            oldRequest.reject(new Error("old refresh failed"));
        });
        expect(screen.getByText("Hotel")).toBeTruthy();
        expect(screen.queryByText("Could not load expenses.")).toBeNull();
    });

    it("recovers after a failed load on the next refresh", async () => {
        const currentRequest = deferred<Expense[]>();
        api.getExpenses.mockRejectedValueOnce(new Error("offline")).mockReturnValueOnce(currentRequest.promise);
        const view = render(expensesPage());
        await screen.findByText("Could not load expenses.");
        view.rerender(expensesPage(trip, 1));
        expect(screen.getByText("Loading expenses…")).toBeTruthy();
        expect(screen.queryByText("Could not load expenses.")).toBeNull();
        await act(async () => {
            currentRequest.resolve([hotel]);
        });
        expect(screen.getByText("Hotel")).toBeTruthy();
    });

    it("resets trip data and ignores old pending results when the trip changes", async () => {
        const oldRefresh = deferred<Expense[]>();
        const nextTripRequest = deferred<Expense[]>();
        api.getExpenses.mockResolvedValueOnce([hotel])
            .mockReturnValueOnce(oldRefresh.promise)
            .mockReturnValueOnce(nextTripRequest.promise);
        const view = render(expensesPage());
        await screen.findByText("Hotel");
        view.rerender(expensesPage(trip, 1));
        await waitFor(() => expect(api.getExpenses).toHaveBeenCalledTimes(2));

        const nextTrip = { ...trip, id: "trip-2" };
        view.rerender(expensesPage(nextTrip, 1));
        expect(screen.getByText("Loading expenses…")).toBeTruthy();
        expect(screen.getByText("Total spent").parentElement?.textContent).toContain("€0");
        expect(screen.queryByText("Hotel")).toBeNull();
        await act(async () => {
            nextTripRequest.resolve([{ ...hotel, tripId: nextTrip.id, id: "new", name: "Train" }]);
        });
        await act(async () => {
            oldRefresh.resolve([hotel]);
        });
        expect(screen.getByText("Train")).toBeTruthy();
        expect(screen.queryByText("Hotel")).toBeNull();
        expect(api.getExpenses).toHaveBeenLastCalledWith(nextTrip.id);
    });
});
