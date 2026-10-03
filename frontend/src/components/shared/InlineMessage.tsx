import type { ReactNode } from "react";

type Props = {
    children: ReactNode;
    variant: "error" | "warning" | "info";
    className?: string;
};

/** Renders a reusable semantic message for forms, cards, and page sections. */
export function InlineMessage({ children, variant, className }: Props) {
    return (
        <p
            className={`inline-message inline-message-${variant}${className ? ` ${className}` : ""}`}
            role={variant === "error" ? "alert" : "status"}
        >
            {children}
        </p>
    );
}

