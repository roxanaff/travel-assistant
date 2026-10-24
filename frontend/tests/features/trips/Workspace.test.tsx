// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, useOutletContext } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TripWorkspace, type TripWorkspaceContext } from "../../../src/pages/Workspace";
import type { Trip } from "../../../src/types/trip";

const api = vi.hoisted(() => ({ getTrip: vi.fn() }));
vi.mock("../../../src/api/tripsApi", () => api);

const trip: Trip = {
    id: "a",
    name: "Trip A",
    destination: null,
    startDate: null,
    endDate: null,
    arrivalTime: null,
    type: null,
    budget: 500,
    currency: "EUR",
    note: null,
    hasStartedPackingList: false,
    hasStartedTodoList: false,
    hasPendingTodoDeadlineReview: false,
    createdAtUtc: "2026-01-01T00:00:00Z",
    status: "Draft",
    unscheduledActivityCount: 0,
};
const tripB = { ...trip, id: "b", name: "Trip B" };

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: Error) => void;
    const promise = new Promise<T>((finish, fail) => {
        resolve = finish;
        reject = fail;
    });
    return { promise, resolve, reject };
}

function WorkspaceActions() {
    const { setTrip, setHasUnsavedForm } = useOutletContext<TripWorkspaceContext>();
    return (
        <>
            <button onClick={() => setTrip((current) => current && { ...current, name: "Updated trip" })}>
                Update shared trip
            </button>
            <button onClick={() => setHasUnsavedForm(true)}>Open draft</button>
        </>
    );
}

function renderWorkspace() {
    const router = createMemoryRouter([
        {
            path: "/trips/:id",
            element: <TripWorkspace />,
            children: [
                { index: true, element: <WorkspaceActions /> },
                { path: "budget", element: <WorkspaceActions /> },
            ],
        },
    ], { initialEntries: ["/trips/a"] });
    render(<RouterProvider router={router} />);
    return router;
}

describe("trip workspace loading", () => {
    afterEach(cleanup);
    beforeEach(() => api.getTrip.mockReset());

    it.each(["success", "failure"])("ignores an old trip request's late %s", async (outcome) => {
        const oldRequest = deferred<Trip>();
        api.getTrip.mockReturnValueOnce(oldRequest.promise).mockResolvedValueOnce(tripB);
        const router = renderWorkspace();
        await waitFor(() => expect(api.getTrip).toHaveBeenCalledWith("a"));
        await act(async () => {
            await router.navigate("/trips/b");
        });
        await screen.findByRole("heading", { name: "Trip B" });

        await act(async () => {
            if (outcome === "success") {
                oldRequest.resolve(trip);
            } else {
                oldRequest.reject(new Error("old request failed"));
            }
        });

        expect(router.state.location.pathname).toBe("/trips/b");
        expect(screen.getByRole("heading", { name: "Trip B" })).toBeTruthy();
        expect(screen.queryByRole("heading", { name: "Trip A" })).toBeNull();
        expect(screen.queryByText("Could not connect to the Travel Assistant API.")).toBeNull();
    });

    it("hides the previous trip while the next trip loads", async () => {
        const nextRequest = deferred<Trip>();
        api.getTrip.mockResolvedValueOnce(trip).mockReturnValueOnce(nextRequest.promise);
        const router = renderWorkspace();
        await screen.findByRole("heading", { name: "Trip A" });
        await act(async () => {
            await router.navigate("/trips/b");
        });
        expect(screen.queryByRole("heading", { name: "Trip A" })).toBeNull();
        expect(screen.getByText("Loading your trip…")).toBeTruthy();
        await act(async () => {
            nextRequest.resolve(tripB);
        });
        expect(screen.getByRole("heading", { name: "Trip B" })).toBeTruthy();
    });

    it.each(["offline", "missing"])("recovers from an %s trip when the next trip succeeds", async (failure) => {
        if (failure === "offline") {
            api.getTrip.mockRejectedValueOnce(new Error("offline"));
        } else {
            api.getTrip.mockResolvedValueOnce(null);
        }
        const nextRequest = deferred<Trip>();
        api.getTrip.mockReturnValueOnce(nextRequest.promise);
        const router = renderWorkspace();
        const message = failure === "offline"
            ? "Could not connect to the Travel Assistant API."
            : "This trip no longer exists.";
        await screen.findByText(message);

        await act(async () => {
            await router.navigate("/trips/b");
        });
        expect(screen.queryByText(message)).toBeNull();
        expect(screen.getByText("Loading your trip…")).toBeTruthy();
        await act(async () => {
            nextRequest.resolve(tripB);
        });
        expect(screen.getByRole("heading", { name: "Trip B" })).toBeTruthy();
    });

    it("preserves shared trip updates and draft protection across same-trip tabs", async () => {
        const user = userEvent.setup();
        api.getTrip.mockResolvedValue(trip);
        const router = renderWorkspace();
        await screen.findByRole("heading", { name: "Trip A" });
        await user.click(screen.getByRole("button", { name: "Update shared trip" }));
        await user.click(screen.getByRole("button", { name: "Open draft" }));
        await user.click(screen.getByRole("link", { name: "Budget & expenses" }));
        const dialog = screen.getByRole("alertdialog", { name: "Discard unsaved changes?" });
        await user.click(within(dialog).getByRole("button", { name: "Cancel", exact: true }));
        expect(router.state.location.pathname).toBe("/trips/a");

        await user.click(screen.getByRole("link", { name: "Budget & expenses" }));
        await user.click(screen.getByRole("button", { name: "Discard changes" }));
        expect(router.state.location.pathname).toBe("/trips/a/budget");
        expect(screen.getByRole("heading", { name: "Updated trip" })).toBeTruthy();
        expect(api.getTrip).toHaveBeenCalledTimes(1);
    });
});
