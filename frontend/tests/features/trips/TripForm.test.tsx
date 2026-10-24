// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TripForm } from "../../../src/components/trips/TripForm";

describe("TripForm", () => {
    afterEach(cleanup);

    it("rejects incomplete date ranges before saving", () => {
        const submit = vi.fn();
        render(
            <TripForm
                heading="New trip"
                submitLabel="Save trip"
                isSaving={false}
                error={null}
                onCancel={vi.fn()}
                onSubmit={submit}
            />,
        );
        fireEvent.change(screen.getByLabelText("Trip name"), {
            target: { value: "Rome" },
        });
        fireEvent.change(screen.getByLabelText("Start date"), {
            target: { value: "2026-09-01" },
        });
        fireEvent.change(screen.getByLabelText("End date"), {
            target: { value: "" },
        });
        fireEvent.submit(screen.getByRole("button", { name: "Save trip" }).closest("form")!);

        expect(screen.getByText(/Enter both a start date/)).toBeTruthy();
        expect(submit).not.toHaveBeenCalled();
    });

    it("shows the final trip type options in the agreed order", () => {
        render(
            <TripForm
                heading="New trip"
                submitLabel="Save trip"
                isSaving={false}
                error={null}
                onCancel={vi.fn()}
                onSubmit={vi.fn()}
            />,
        );
        expect(
            Array.from(screen.getByLabelText("Trip type").querySelectorAll("option")).map(
                (option) => option.textContent,
            ),
        ).toEqual([
            "Not specified", "City break", "Beach holiday", "Hiking",
            "Mountaineering & climbing", "Skiing & winter sports", "Road trip",
            "Camping", "Cabin stay", "Cruise", "All-inclusive resort",
            "Festival / event", "Work trip", "Visiting friends & family", "Other",
        ]);
    });

    it("cancels an unchanged form with Escape", async () => {
        const user = userEvent.setup();
        const onCancel = vi.fn();
        render(
            <TripForm
                heading="New trip"
                submitLabel="Save trip"
                isSaving={false}
                error={null}
                onCancel={onCancel}
                onSubmit={vi.fn()}
            />,
        );

        await user.click(screen.getByLabelText("Trip name"));
        await user.keyboard("{Escape}");
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it("keeps the discard prompt open after Escape and preserves edits when it is cancelled", async () => {
        const user = userEvent.setup();
        const onCancel = vi.fn();
        render(
            <TripForm
                heading="New trip"
                submitLabel="Save trip"
                isSaving={false}
                error={null}
                onCancel={onCancel}
                onSubmit={vi.fn()}
            />,
        );
        const input = screen.getByLabelText("Trip name");
        await user.type(input, "Rome");
        await user.keyboard("{Escape}");
        const dialog = screen.getByRole("alertdialog", { name: "Discard unsaved changes?" });
        expect(onCancel).not.toHaveBeenCalled();
        await user.click(within(dialog).getByRole("button", { name: "Cancel", exact: true }));
        expect((input as HTMLInputElement).value).toBe("Rome");
        expect(screen.queryByRole("alertdialog")).toBeNull();

        await user.click(screen.getByRole("button", { name: "Cancel", exact: true }));
        await user.click(screen.getByRole("button", { name: "Discard changes" }));
        expect(onCancel).toHaveBeenCalledOnce();
    });
});
