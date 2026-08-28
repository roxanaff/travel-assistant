import { useEffect, useRef, type KeyboardEvent } from "react";

const firstFormControl =
    'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])';

const formSnapshot = (form: HTMLFormElement) =>
    JSON.stringify(Array.from(new FormData(form).entries()));

/** Focuses a newly opened form and safely cancels it with Escape. */
export function useFormKeyboardInteraction(
    isOpen: boolean,
    onCancel: () => void,
) {
    const formRef = useRef<HTMLFormElement>(null);
    const initialSnapshotRef = useRef("");
    const openerRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        const frame = window.requestAnimationFrame(() => {
            const form = formRef.current;
            if (!form) return;

            openerRef.current =
                document.activeElement instanceof HTMLElement
                    ? document.activeElement
                    : null;
            initialSnapshotRef.current = formSnapshot(form);
            const firstControl = form.querySelector<HTMLElement>(firstFormControl);
            firstControl?.focus();
            if (typeof firstControl?.scrollIntoView === "function") {
                firstControl.scrollIntoView({ block: "nearest" });
            }
        });

        return () => window.cancelAnimationFrame(frame);
    }, [isOpen]);

    const cancelForm = () => {
        const form = formRef.current;
        const hasChanges =
            form !== null && formSnapshot(form) !== initialSnapshotRef.current;

        if (
            hasChanges &&
            !window.confirm("Discard your unsaved changes?")
        ) {
            return false;
        }

        onCancel();
        window.requestAnimationFrame(() => {
            if (openerRef.current?.isConnected) openerRef.current.focus();
        });
        return true;
    };

    const onFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
        if (event.key !== "Escape") return;

        event.preventDefault();
        cancelForm();
    };

    return { formRef, onFormKeyDown, cancelForm };
}
