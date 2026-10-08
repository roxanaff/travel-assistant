// Small, consistent label for a trip or other status in the interface.
// It only displays the value supplied by its parent.
import type { ReactNode } from "react";

/** Renders a consistent status marker; semantic color variants are deferred. */
export function StatusPill({ children, className }: { children: ReactNode; className?: string }) {
    return <span className={`status-pill${className ? ` ${className}` : ""}`}>{children}</span>;
}

