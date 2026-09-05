import { useEffect, useId, useRef, type ReactNode } from "react";

import "./ConfirmDialog.css";

type Props = {
    isOpen: boolean;
    title: string;
    children: ReactNode;
    confirmLabel: string;
    onCancel: () => void;
    onConfirm: () => void;
};

/** Provides a consistent, accessible confirmation dialog for destructive actions. */
export function ConfirmDialog({ isOpen, title, children, confirmLabel, onCancel, onConfirm }: Props) {
    const titleId = useId();
    const dialogRef = useRef<HTMLElement>(null);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);
    const openerRef = useRef<HTMLElement | null>(null);
    const onCancelRef = useRef(onCancel);

    useEffect(() => {
        onCancelRef.current = onCancel;
    }, [onCancel]);

    useEffect(() => {
        if (!isOpen) return;

        openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const focusDialog = window.requestAnimationFrame(() => cancelButtonRef.current?.focus());

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                onCancelRef.current();
                return;
            }

            if (event.key !== "Tab") return;

            const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            );
            if (!focusable || focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            window.cancelAnimationFrame(focusDialog);
            document.removeEventListener("keydown", handleKeyDown);
            window.requestAnimationFrame(() => {
                if (openerRef.current?.isConnected) openerRef.current.focus();
            });
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="confirm-dialog-backdrop" role="presentation">
            <section
                ref={dialogRef}
                className="confirm-dialog"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
            >
                <h2 id={titleId}>{title}</h2>
                <div className="confirm-dialog-content">{children}</div>
                <div className="confirm-dialog-actions">
                    <button ref={cancelButtonRef} className="text-button" type="button" onClick={onCancel}>
                        Cancel
                    </button>
                    <button className="danger-button" type="button" onClick={onConfirm}>
                        {confirmLabel}
                    </button>
                </div>
            </section>
        </div>
    );
}
