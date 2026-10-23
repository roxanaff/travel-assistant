// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LinkedRecordWarnings } from "../../src/components/shared/LinkedRecordWarnings";
import type { LinkedRecordReview } from "../../src/api/linkedRecordReviewsApi";

const api = vi.hoisted(() => ({ resolveLinkedRecordReview: vi.fn() }));
vi.mock("../../src/api/linkedRecordReviewsApi", () => api);
const expenseApi = vi.hoisted(() => ({ deleteExpense: vi.fn() }));
const bookingApi = vi.hoisted(() => ({ unlinkBookingExpense: vi.fn() }));
vi.mock("../../src/api/expensesApi", () => expenseApi);
vi.mock("../../src/api/bookingsApi", () => bookingApi);

const review: LinkedRecordReview = {
    id: "review-1",
    revision: "version-1",
    targetVersion: "target-version-1",
    sourceKind: "Expense",
    sourceId: "expense-1",
    sourceName: "Flight deposit",
    targetKind: "Booking",
    targetId: "booking-1",
    targetName: "Flight booking",
    role: null,
    isMismatch: false,
    changes: [{ field: "Amount", before: 50, after: 70 }],
    updateLabel: "Update amount paid",
    proposedAmount: 90,
    blockedReason: null,
};

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

it.each([false, true])("renders neutral review rows and reserves yellow for cautions (%s)", (requiresUnscheduled) => {
    const outgoing: LinkedRecordReview = {
        ...review,
        sourceKind: "Booking",
        sourceName: "Museum booking",
        targetKind: "Activity",
        targetName: "Museum visit",
        requiresUnscheduled,
        proposedAmount: null,
    };
    const { container } = render(
        <MemoryRouter>
            <LinkedRecordWarnings tripId="trip-1" currency="EUR" reviews={[outgoing]}
                perspective="target" presentation="review" onResolved={vi.fn()} />
        </MemoryRouter>,
    );

    expect(screen.getByText("Activity “Museum visit”")).toBeTruthy();
    expect(screen.queryByText(/update available/)).toBeNull();
    expect(container.querySelector(".linked-record-review")?.classList.contains("inline-message-warning")).toBe(false);
    expect(container.querySelectorAll(".inline-message-warning")).toHaveLength(requiresUnscheduled ? 1 : 0);
    expect(screen.getByRole("button", { name: requiresUnscheduled ? "Make unscheduled" : "Update", exact: true })).toBeTruthy();
});

it.each(["Activity", "Expense"] as const)("names the affected %s in a booking's outgoing review", async (targetKind) => {
    const user = userEvent.setup();
    const outgoing: LinkedRecordReview = {
        ...review,
        sourceKind: "Booking",
        sourceName: "Flight booking",
        targetKind,
        targetName: "Flight there",
        role: targetKind === "Activity" ? "Outbound" : null,
        proposedAmount: null,
        changes: [{ field: targetKind === "Activity" ? "Cost" : "Amount", before: 50, after: 70 }],
    };
    api.resolveLinkedRecordReview.mockResolvedValue(undefined);
    render(<LinkedRecordWarnings tripId="trip-1" currency="EUR" reviews={[outgoing]}
        perspective="target" onResolved={vi.fn()} />);

    expect(screen.getByText(`${targetKind} “Flight there”${targetKind === "Activity" ? " (outbound journey)" : ""}: update available`)).toBeTruthy();
    expect(screen.getByText(`${targetKind === "Activity" ? "Total cost" : "Net cost"}: €50 → €70`)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Update", exact: true }));
    expect(api.resolveLinkedRecordReview).toHaveBeenCalledWith("trip-1", outgoing, "apply");
});

it("shows only changed values and applies the explicit proposed amount immediately", async () => {
    const user = userEvent.setup();
    const refreshed = vi.fn().mockResolvedValue(undefined);
    api.resolveLinkedRecordReview.mockResolvedValue(undefined);
    render(<LinkedRecordWarnings tripId="trip-1" currency="EUR" reviews={[review]} onResolved={refreshed} />);
    expect(screen.getByText("Cost: €50 → €70")).toBeTruthy();
    expect(screen.getByText("Paid after update: €90")).toBeTruthy();
    expect(screen.queryByText(/location|schedule|Current details/i)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Update", exact: true }));
    expect(api.resolveLinkedRecordReview).toHaveBeenCalledWith("trip-1", review, "apply");
    expect(refreshed).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alertdialog")).toBeNull();
});

it("makes both the payment and total-cost increase explicit before Update", () => {
    render(<LinkedRecordWarnings tripId="trip-1" currency="EUR" onResolved={vi.fn()} reviews={[{
        ...review,
        proposedAmount: 100,
        targetPaid: 20,
        targetTotalCost: 50,
        proposedTotalCost: 100,
    }]} />);
    expect(screen.getByText("Paid: €20 → €100")).toBeTruthy();
    expect(screen.getByText("Total cost: €50 → €100")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Update", exact: true })).toBeTruthy();
});

it("keeps records independent and leaves failed decisions actionable for retry", async () => {
    const user = userEvent.setup();
    const refreshed = vi.fn().mockResolvedValue(undefined);
    api.resolveLinkedRecordReview.mockRejectedValueOnce(new Error("Changed again. Refresh the notice."));
    api.resolveLinkedRecordReview.mockResolvedValueOnce(undefined);
    render(<LinkedRecordWarnings tripId="trip-1" currency="EUR" reviews={[review]} onResolved={refreshed} />);
    await user.click(screen.getByRole("button", { name: "Keep as is" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Changed again. Refresh the notice.");
    expect(refreshed).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Keep as is" }));
    await waitFor(() => expect(refreshed).toHaveBeenCalledTimes(2));
    expect(api.resolveLinkedRecordReview).toHaveBeenLastCalledWith("trip-1", review, "keep");
});

it.each([
    ["Booking", "Activity", "Cost", "Total cost"],
    ["Activity", "Booking", "Cost", "Cost"],
    ["Booking", "Expense", "Amount", "Net cost"],
    ["PlannedCost", "Expense", "Amount", "Cost"],
] as const)("labels %s monetary changes by meaning", (sourceKind, targetKind, field, label) => {
    render(<LinkedRecordWarnings tripId="trip-1" currency="EUR" onResolved={vi.fn()} reviews={[{
        ...review,
        sourceKind,
        targetKind,
        changes: [{ field, before: 50, after: 70 }],
        proposedAmount: null,
    }]} />);

    expect(screen.getByText(`${label}: €50 → €70`)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Update", exact: true })).toBeTruthy();
});

it("identifies both linked values for an initial payment mismatch", () => {
    render(<LinkedRecordWarnings tripId="trip-1" currency="EUR" onResolved={vi.fn()} reviews={[{
        ...review,
        isMismatch: true,
        proposedAmount: 70,
        changes: [{ field: "Amount", before: 50, after: 70, targetValue: 60 }],
    }]} />);

    expect(screen.getByText("Expense “Flight deposit”: linked values differ")).toBeTruthy();
    expect(screen.getByText("Net cost €60 · Expense cost €70")).toBeTruthy();
    expect(screen.queryByText(/Paid after update/)).toBeNull();
});

it("shows the independently edited value that Update will replace", async () => {
    const user = userEvent.setup();
    const changed = {
        ...review,
        changes: [{ field: "Amount", before: 50, after: 70, targetValue: 60 }],
    };
    api.resolveLinkedRecordReview.mockResolvedValue(undefined);
    render(<LinkedRecordWarnings tripId="trip-1" currency="EUR" onResolved={vi.fn()} reviews={[changed]} />);

    expect(screen.getByText("Cost: €50 → €70 · Replaces €60")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Update", exact: true }));
    expect(api.resolveLinkedRecordReview).toHaveBeenCalledWith("trip-1", changed, "apply");
});

it("refreshes a conflicting notice before retrying with its new revision", async () => {
    const user = userEvent.setup();
    const revised = { ...review, revision: "version-2", changes: [{ field: "Amount", before: 50, after: 80 }], proposedAmount: 100 };
    api.resolveLinkedRecordReview.mockRejectedValueOnce(new Error("The record changed again."));
    api.resolveLinkedRecordReview.mockResolvedValueOnce(undefined);
    const refreshed = vi.fn().mockImplementation(async () => {
        view.rerender(<LinkedRecordWarnings tripId="trip-1" currency="EUR" reviews={[revised]} onResolved={refreshed} />);
    });
    const view = render(<LinkedRecordWarnings tripId="trip-1" currency="EUR" reviews={[review]} onResolved={refreshed} />);
    await user.click(screen.getByRole("button", { name: "Update", exact: true }));
    expect(await screen.findByText("Cost: €50 → €80")).toBeTruthy();
    expect(screen.getByText("Paid after update: €100")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Update", exact: true }));
    expect(api.resolveLinkedRecordReview).toHaveBeenLastCalledWith("trip-1", revised, "apply");
});

it("explains blocked changes without offering an unsafe update", () => {
    render(<LinkedRecordWarnings tripId="trip-1" currency="EUR"
        reviews={[{ ...review, blockedReason: "Amount paid cannot exceed the total cost." }]}
        onResolved={vi.fn()} />);
    expect(screen.getByText("Amount paid cannot exceed the total cost.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Update", exact: true })).toBeNull();
    expect(screen.getByRole("button", { name: "Keep as is" })).toBeTruthy();
});

it("offers unscheduling and trip-date editing for an outside-trip activity date", async () => {
    const user = userEvent.setup();
    const outside = {
        ...review,
        sourceKind: "Booking" as const,
        targetKind: "Activity" as const,
        requiresUnscheduled: true,
        changes: [{ field: "Date", before: "2027-04-02", after: "2027-04-06" }],
        proposedAmount: null,
    };
    api.resolveLinkedRecordReview.mockResolvedValue(undefined);
    render(
        <MemoryRouter>
            <LinkedRecordWarnings tripId="trip-1" currency="EUR" reviews={[outside]} onResolved={vi.fn()} />
        </MemoryRouter>,
    );

    expect(screen.getByText("The date is outside this trip. Updating will make the activity unscheduled.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Edit trip dates" }).getAttribute("href")).toBe("/trips/trip-1/details");
    expect(screen.queryByRole("button", { name: "Update", exact: true })).toBeNull();
    expect(screen.getByRole("button", { name: "Keep as is" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Make unscheduled" }));
    expect(api.resolveLinkedRecordReview).toHaveBeenCalledWith("trip-1", outside, "unschedule");
});

it("offers unlink or confirmed named deletion for a fully refunded booking", async () => {
    const user = userEvent.setup();
    const refreshed = vi.fn().mockResolvedValue(undefined);
    bookingApi.unlinkBookingExpense.mockResolvedValue(undefined);
    render(<LinkedRecordWarnings tripId="trip-1" currency="EUR" onResolved={refreshed} reviews={[{
        ...review,
        sourceKind: "Booking",
        sourceId: "booking-1",
        targetKind: "Expense",
        targetId: "expense-1",
        targetName: "Flight payment",
        changes: [{ field: "Amount", before: 50, after: 0 }],
        proposedAmount: 0,
        blockedReason: "Expenses require a positive amount.",
    }]} />);
    await user.click(screen.getByRole("button", { name: "Delete", exact: true }));
    expect(screen.getByRole("alertdialog").textContent).toContain("Flight payment");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(expenseApi.deleteExpense).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Keep expense and unlink" }));
    expect(bookingApi.unlinkBookingExpense).toHaveBeenCalledWith("trip-1", "booking-1", "expense-1");
    expect(refreshed).toHaveBeenCalledOnce();
});
