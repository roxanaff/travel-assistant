// Shared keyboard behavior for forms: move focus into a newly opened form
// and handle Escape without silently losing changed values.
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

const firstFormControl = 'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])';

/**
 * Protects controlled form values, including unnamed and temporarily hidden fields.
 * Use a distinct key for Add and each edited record; null means the form is closed.
 * Values must be JSON-serializable form state, not derived UI/validation state.
 */
export function useFormKeyboardInteraction(
    formKey: string | null,
    onCancel: () => void,
    values: object,
) {
    const formRef = useRef<HTMLFormElement>(null);
    const openerRef = useRef<HTMLElement | null>(null);
    const snapshot = JSON.stringify(values);
    const [baseline, setBaseline] = useState({ key: formKey, snapshot });
    const [isConfirmingDiscard, setIsConfirmingDiscard] = useState(false);

    // Capture before interaction, not in the deferred focus callback. Ordinary
    // edits must not replace the baseline; switching form identity must replace it.
    if (baseline.key !== formKey) {
        setBaseline({ key: formKey, snapshot });
        setIsConfirmingDiscard(false);
    }

    useEffect(() => {
        if (formKey === null) return;

        const frame = window.requestAnimationFrame(() => {
            const form = formRef.current;
            if (!form) return;

            openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            const firstControl = form.querySelector<HTMLElement>(firstFormControl);
            firstControl?.focus();
            if (typeof firstControl?.scrollIntoView === "function") {
                firstControl.scrollIntoView({ block: "nearest" });
            }
        });

        return () => window.cancelAnimationFrame(frame);
    }, [formKey]);

    const closeForm = () => {
        setIsConfirmingDiscard(false);
        onCancel();
        window.requestAnimationFrame(() => {
            if (openerRef.current?.isConnected) openerRef.current.focus();
        });
    };

    const cancelForm = () => {
        if (formKey === null) return;
        const hasChanges = snapshot !== baseline.snapshot;

        if (hasChanges) {
            setIsConfirmingDiscard(true);
            return;
        }

        closeForm();
    };

    const discardChanges = () => {
        closeForm();
    };

    const onFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
        if (event.key !== "Escape") return;

        event.preventDefault();
        // The dialog's document listener must not dismiss the confirmation opened
        // by this same Escape event.
        event.stopPropagation();
        cancelForm();
    };

    return {
        formRef,
        onFormKeyDown,
        cancelForm,
        isConfirmingDiscard,
        cancelDiscardConfirmation: () => setIsConfirmingDiscard(false),
        discardChanges,
    };
}
