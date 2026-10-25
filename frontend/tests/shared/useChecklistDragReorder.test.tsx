// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useChecklistDragReorder } from "../../src/utils/useChecklistDragReorder";

const items = [{ id: "first" }, { id: "second" }];

function pointerEvent(type: string, pointerId = 1) {
    return Object.assign(new Event(type), {
        pointerId,
        pointerType: "touch",
        clientX: 20,
        clientY: 75,
    });
}

function setupDrag() {
    render(
        <ul>
            <li data-checklist-item-id="first">
                <span data-testid="handle" />
            </li>
            <li data-checklist-item-id="second" data-testid="target" />
        </ul>,
    );
    const handle = screen.getByTestId("handle");
    handle.setPointerCapture = vi.fn();
    const target = screen.getByTestId("target");
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
        top: 40, bottom: 80, left: 0, right: 100, width: 100, height: 40,
        x: 0, y: 40, toJSON: () => ({}),
    });
    Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: vi.fn(() => target),
    });
    const onMove = vi.fn();
    const hook = renderHook(() => useChecklistDragReorder(onMove));
    act(() => {
        hook.result.current.startPointerDrag({
            button: 0,
            pointerId: 1,
            pointerType: "touch",
            clientX: 20,
            clientY: 20,
            currentTarget: handle,
        } as ReactPointerEvent<HTMLElement>, items[0], items);
    });
    return { hook, onMove, handle };
}

describe("checklist drag completion", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        delete (document as Partial<Document>).elementFromPoint;
        vi.useRealTimers();
    });

    it("cancels a pending long press before it starts a drag", () => {
        const { hook, onMove, handle } = setupDrag();
        fireEvent(window, pointerEvent("pointercancel"));
        act(() => {
            vi.advanceTimersByTime(250);
        });
        expect(hook.result.current.drag).toBeNull();
        expect(handle.setPointerCapture).not.toHaveBeenCalled();
        expect(onMove).not.toHaveBeenCalled();
    });

    it("ignores unrelated cancellation and aborts a matching active drag without saving", () => {
        const { hook, onMove } = setupDrag();
        act(() => {
            vi.advanceTimersByTime(200);
        });
        fireEvent(window, pointerEvent("pointermove"));
        expect(hook.result.current.dropTarget).toEqual({ itemId: "second", position: "after" });
        fireEvent(window, pointerEvent("pointercancel", 2));
        expect(hook.result.current.drag).not.toBeNull();
        fireEvent(window, pointerEvent("pointercancel"));
        expect(hook.result.current.drag).toBeNull();
        expect(hook.result.current.dropTarget).toBeNull();
        fireEvent(window, pointerEvent("pointerup"));
        expect(onMove).not.toHaveBeenCalled();
    });

    it("saves a valid target once on normal release", () => {
        const { hook, onMove } = setupDrag();
        act(() => {
            vi.advanceTimersByTime(200);
        });
        fireEvent(window, pointerEvent("pointermove"));
        fireEvent(window, pointerEvent("pointerup"));
        expect(onMove).toHaveBeenCalledExactlyOnceWith(items, "first", { itemId: "second", position: "after" });
        expect(hook.result.current.drag).toBeNull();
    });
});
