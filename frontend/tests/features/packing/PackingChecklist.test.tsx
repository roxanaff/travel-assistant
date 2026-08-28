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

import { PackingChecklist } from "../../../src/features/packing/PackingChecklist";
import type { Trip } from "../../../src/types/trip";

const api = vi.hoisted(() => ({
    getPackingItems: vi.fn(),
    createDefaultPackingList: vi.fn(),
    createPackingItem: vi.fn(),
    deletePackingItem: vi.fn(),
    resetPackingList: vi.fn(),
    reorderPackingItems: vi.fn(),
    startEmptyPackingList: vi.fn(),
    updatePackingItem: vi.fn(),
    updatePackingItemPackedState: vi.fn(),
}));

vi.mock("../../../src/api/packingItemsApi", () => api);

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

const passport = {
    id: "item-1",
    tripId: trip.id,
    name: "Passport",
    category: "DocumentsAndMoney" as const,
    quantity: 1,
    isPacked: false,
    sortOrder: 0,
    createdAtUtc: "2026-01-01T00:00:00Z",
};

const renderChecklist = () =>
    render(
        <PackingChecklist
            trip={trip}
            setTrip={vi.fn()}
            setHasUnsavedForm={vi.fn()}
        />,
    );

describe("PackingChecklist", () => {
    afterEach(cleanup);

    beforeEach(() => {
        vi.clearAllMocks();
        api.getPackingItems.mockResolvedValue([passport]);
        api.updatePackingItemPackedState.mockResolvedValue({
            ...passport,
            isPacked: true,
        });
    });

    it("marks an item packed and persists the change", async () => {
        const user = userEvent.setup();
        renderChecklist();
        const checkbox = await screen.findByRole("checkbox", {
            name: "Mark Passport as packed",
        });
        await user.click(checkbox);
        await waitFor(() =>
            expect(api.updatePackingItemPackedState).toHaveBeenCalledWith(
                trip.id,
                passport.id,
                true,
            ),
        );
        expect((checkbox as HTMLInputElement).checked).toBe(true);
    });

    it("validates an invalid quantity before calling the API", async () => {
        const user = userEvent.setup();
        renderChecklist();
        await screen.findByText("Passport");
        await user.click(
            screen.getAllByRole("button", { name: "Add item" })[0],
        );
        await user.type(screen.getByLabelText("Name"), "Socks");
        await user.type(screen.getByLabelText(/Quantity/), "0");
        fireEvent.submit(
            screen.getByRole("button", { name: "Save" }).closest("form")!,
        );
        expect(
            await screen.findByText(
                "Quantity must be a whole number greater than zero.",
            ),
        ).toBeTruthy();
        expect(api.createPackingItem).not.toHaveBeenCalled();
    });

    it("does not accept a quantity above the integer maximum", async () => {
        const user = userEvent.setup();
        renderChecklist();
        await screen.findByText("Passport");
        await user.click(
            screen.getAllByRole("button", { name: "Add item" })[0],
        );

        const quantity = screen.getByLabelText(/Quantity/);
        fireEvent.change(quantity, { target: { value: "2147483648" } });

        expect(
            screen.queryByText("Quantity cannot exceed 2,147,483,647."),
        ).toBeNull();
        expect((quantity as HTMLInputElement).value).toBe("");
    });

    it("restores a deleted item when Undo is selected", async () => {
        const user = userEvent.setup();
        renderChecklist();
        await screen.findByRole("checkbox", {
            name: "Mark Passport as packed",
        });
        await user.click(
            screen.getByRole("button", { name: "Delete Passport" }),
        );
        expect(
            screen.queryByRole("checkbox", { name: "Mark Passport as packed" }),
        ).toBeNull();
        await user.click(screen.getByRole("button", { name: /Undo/ }));
        expect(
            await screen.findByRole("checkbox", {
                name: "Mark Passport as packed",
            }),
        ).toBeTruthy();
        expect(api.deletePackingItem).not.toHaveBeenCalled();
    });
});
