// Reusable error, warning, or information message. Feature code supplies the
// message and can optionally allow the user to dismiss it.
import type { ReactNode } from "react";

type Props = {
    children: ReactNode;
    variant: "error" | "warning" | "info";
    className?: string;
    onDismiss?: () => void;
    dismissLabel?: string;
    isDismissDisabled?: boolean;
};

/** Renders a reusable semantic message for forms, cards, and page sections. */
export function InlineMessage({
    children,
    variant,
    className,
    onDismiss,
    dismissLabel = "Dismiss message",
    isDismissDisabled = false,
}: Props) {
    return (
        <p
            className={`inline-message inline-message-${variant}${className ? ` ${className}` : ""}`}
            role={variant === "error" ? "alert" : "status"}
        >
            <span>{children}</span>
            {onDismiss && (
                <button
                    className="inline-message-dismiss"
                    type="button"
                    aria-label={dismissLabel}
                    disabled={isDismissDisabled}
                    onClick={onDismiss}
                >
                    ×
                </button>
            )}
        </p>
    );
}

