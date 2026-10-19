// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useExpandableCards } from "../../src/utils/useExpandableCards";

describe("remembered card expansion", () => {
    beforeEach(() => window.localStorage.clear());
    afterEach(cleanup);

    it("remembers open and closed cards through navigation and an initially empty load", () => {
        const first = renderHook(() => useExpandableCards(["a", "b"], "trip:1:bookings"));
        act(() => first.result.current.expand("a"));
        first.unmount();

        const second = renderHook(({ ids }) => useExpandableCards(ids, "trip:1:bookings"), {
            initialProps: { ids: [] as string[] },
        });
        expect(second.result.current.isExpanded("a")).toBe(true);
        second.rerender({ ids: ["a", "b"] });
        expect(second.result.current.isExpanded("a")).toBe(true);
        expect(second.result.current.isExpanded("b")).toBe(false);
        act(() => second.result.current.collapse("a"));
        second.unmount();

        const third = renderHook(() => useExpandableCards(["a", "b"], "trip:1:bookings"));
        expect(third.result.current.isExpanded("a")).toBe(false);
        act(() => third.result.current.toggleAll());
        expect(third.result.current.areAllExpanded).toBe(true);
        third.unmount();

        const fourth = renderHook(() => useExpandableCards(["a", "b"], "trip:1:bookings"));
        expect(fourth.result.current.areAllExpanded).toBe(true);
    });

    it("keeps trip and page expansion choices independent when the storage key changes", () => {
        const hook = renderHook(({ key }) => useExpandableCards(["a"], key), {
            initialProps: { key: "trip:1:bookings" },
        });
        act(() => hook.result.current.expand("a"));
        hook.rerender({ key: "trip:2:bookings" });
        expect(hook.result.current.isExpanded("a")).toBe(false);
        act(() => hook.result.current.expand("a"));
        hook.rerender({ key: "trip:1:itinerary" });
        expect(hook.result.current.isExpanded("a")).toBe(false);
        hook.rerender({ key: "trip:1:bookings" });
        expect(hook.result.current.isExpanded("a")).toBe(true);
    });
});
