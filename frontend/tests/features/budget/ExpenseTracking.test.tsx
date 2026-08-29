// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ExpenseTracking } from "../../../src/components/budget/ExpenseTracking";
import type { Trip } from "../../../src/types/trip";

const api = vi.hoisted(() => ({
    getExpenses: vi.fn(),
    createExpense: vi.fn(),
    deleteExpense: vi.fn(),
    updateExpense: vi.fn(),
}));
vi.mock("../../../src/api/expensesApi", () => api);

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
    createdAtUtc: "2026-01-01T00:00:00Z",
    status: "Upcoming",
    unscheduledActivityCount: 0,
};

const hotel = {
    id: "expense-1",
    tripId: trip.id,
    name: "Hotel",
    plannedCostId: null,
    category: "Accommodation",
    amount: 120,
    expenseDate: "2026-09-01",
    createdAtUtc: "2026-01-01T00:00:00Z",
};

describe("ExpenseTracking", () => {
    afterEach(cleanup);

    beforeEach(() => {
        vi.clearAllMocks();
        api.getExpenses.mockResolvedValue([hotel]);
    });

    it("shows the loaded expense and recalculates the remaining budget", async () => {
        render(
            <ExpenseTracking
                trip={trip}
                refreshKey={0}
                onFormOpenChange={vi.fn()}
            />,
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
            <ExpenseTracking
                trip={trip}
                refreshKey={0}
                onFormOpenChange={vi.fn()}
            />,
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
            <ExpenseTracking
                trip={trip}
                refreshKey={0}
                onFormOpenChange={vi.fn()}
            />,
        );
        await screen.findByText("Hotel");
        await user.click(screen.getByRole("button", { name: "Delete Hotel" }));
        expect(screen.queryByText("Hotel")).toBeNull();
        await user.click(screen.getByRole("button", { name: /Undo/ }));
        expect(await screen.findByText("Hotel")).toBeTruthy();
        expect(api.deleteExpense).not.toHaveBeenCalled();
    });
});
