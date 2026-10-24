// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useFormKeyboardInteraction } from "../../src/utils/useFormKeyboardInteraction";

const initialValues = { name: "Museum", date: "2027-04-02", required: false, note: "" };

describe("unsaved form protection", () => {
    afterEach(cleanup);

    it.each([
        { name: "Gallery" },
        { date: "2027-04-03" },
        { required: true },
        { note: "A note in collapsed details" },
    ])("protects controlled values even without mounted or named controls: %j", (change) => {
        const onCancel = vi.fn();
        const hook = renderHook(
            ({ values }) => useFormKeyboardInteraction("add", onCancel, values),
            { initialProps: { values: initialValues } },
        );
        // No animation frame or DOM input is needed to establish the baseline.
        hook.rerender({ values: { ...initialValues, ...change } });
        act(() => hook.result.current.cancelForm());
        expect(hook.result.current.isConfirmingDiscard).toBe(true);
        expect(onCancel).not.toHaveBeenCalled();

        act(() => hook.result.current.cancelDiscardConfirmation());
        expect(hook.result.current.isConfirmingDiscard).toBe(false);
        act(() => hook.result.current.cancelForm());
        act(() => hook.result.current.discardChanges());
        expect(onCancel).toHaveBeenCalledOnce();
        expect(hook.result.current.isConfirmingDiscard).toBe(false);
    });

    it("closes unchanged and reverted values without confirmation", () => {
        const onCancel = vi.fn();
        const hook = renderHook(
            ({ values }) => useFormKeyboardInteraction("edit:1", onCancel, values),
            { initialProps: { values: initialValues } },
        );
        act(() => hook.result.current.cancelForm());
        expect(onCancel).toHaveBeenCalledOnce();
        hook.rerender({ values: { ...initialValues, name: "Gallery" } });
        hook.rerender({ values: { ...initialValues } });
        act(() => hook.result.current.cancelForm());
        expect(onCancel).toHaveBeenCalledTimes(2);
        expect(hook.result.current.isConfirmingDiscard).toBe(false);
    });

    it("resets the baseline and confirmation between records and consecutive Add sessions", () => {
        const onCancel = vi.fn();
        const hook = renderHook(
            ({ key, values }: { key: string | null; values: typeof initialValues }) =>
                useFormKeyboardInteraction(key, onCancel, values),
            { initialProps: { key: "edit:1" as string | null, values: initialValues } },
        );
        hook.rerender({ key: "edit:1", values: { ...initialValues, name: "Changed" } });
        act(() => hook.result.current.cancelForm());
        expect(hook.result.current.isConfirmingDiscard).toBe(true);

        const secondRecord = { ...initialValues, name: "Park" };
        hook.rerender({ key: "edit:2", values: secondRecord });
        expect(hook.result.current.isConfirmingDiscard).toBe(false);
        act(() => hook.result.current.cancelForm());
        expect(onCancel).toHaveBeenCalledOnce();

        hook.rerender({ key: "add", values: initialValues });
        hook.rerender({ key: "add", values: secondRecord });
        act(() => hook.result.current.cancelForm());
        hook.rerender({ key: null, values: secondRecord });
        hook.rerender({ key: "add", values: secondRecord });
        expect(hook.result.current.isConfirmingDiscard).toBe(false);
        act(() => hook.result.current.cancelForm());
        expect(onCancel).toHaveBeenCalledTimes(2);
    });
});
