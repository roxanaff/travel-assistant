// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PlannedBudget } from "../../../src/features/budget/PlannedBudget";
import type { Trip } from "../../../src/types/trip";

const plannedCostsApi = vi.hoisted(() => ({
    getPlannedCosts: vi.fn(),
    createPlannedCost: vi.fn(),
    deletePlannedCost: vi.fn(),
    updatePlannedCost: vi.fn(),
}));
const expensesApi = vi.hoisted(() => ({
    createExpense: vi.fn(),
    deleteExpense: vi.fn(),
}));

vi.mock("../../../src/api/plannedCostsApi", () => plannedCostsApi);
vi.mock("../../../src/api/expensesApi", () => expensesApi);

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
    hasStartedPackingList: false,
    createdAtUtc: "2026-01-01T00:00:00Z",
    status: "Upcoming",
    unscheduledActivityCount: 0,
};

const hotel = {
    id: "cost-1",
    tripId: trip.id,
    name: "Hotel",
    category: "Accommodation" as const,
    amount: 120,
    createdAtUtc: "2026-01-01T00:00:00Z",
    expenseAdded: false,
    expenseId: null,
};

describe("PlannedBudget", () => {
    afterEach(cleanup);

    beforeEach(() => {
        vi.clearAllMocks();
        plannedCostsApi.getPlannedCosts.mockResolvedValue([hotel]);
        expensesApi.createExpense.mockResolvedValue({ id: "expense-1" });
        expensesApi.deleteExpense.mockResolvedValue(undefined);
    });

    it("shows planned totals and remaining target budget", async () => {
        render(
            <PlannedBudget
                trip={trip}
                onFormOpenChange={vi.fn()}
                onExpenseAdded={vi.fn()}
            />,
        );

        expect(await screen.findByText("Hotel")).toBeTruthy();
        expect(
            screen.getByText("Planned spending").parentElement?.textContent,
        ).toContain("€120");
        expect(screen.getByText("Remaining").parentElement?.textContent).toContain(
            "€380",
        );
    });

    it("adds a planned cost to expenses and can undo it", async () => {
        const user = userEvent.setup();
        const onExpenseAdded = vi.fn();
        render(
            <PlannedBudget
                trip={trip}
                onFormOpenChange={vi.fn()}
                onExpenseAdded={onExpenseAdded}
            />,
        );

        await screen.findByText("Hotel");
        await user.click(screen.getByRole("button", { name: "Add expense" }));

        expect(expensesApi.createExpense).toHaveBeenCalledWith(
            trip.id,
            expect.objectContaining({
                name: "Hotel",
                category: "Accommodation",
                amount: 120,
                plannedCostId: hotel.id,
            }),
        );
        expect(await screen.findByText(/Added/)).toBeTruthy();

        await user.click(screen.getByRole("button", { name: "Undo" }));
        expect(expensesApi.deleteExpense).toHaveBeenCalledWith(trip.id, "expense-1");
        expect(await screen.findByRole("button", { name: "Add expense" })).toBeTruthy();
        expect(onExpenseAdded).toHaveBeenCalledTimes(2);
    });
});
