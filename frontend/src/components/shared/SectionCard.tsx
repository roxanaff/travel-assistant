// Reusable section container used around content on trip pages.
// It does not load data or decide what appears inside.
import type { ReactNode } from "react";

type Props = {
    children: ReactNode;
    className?: string;
};

/** Provides the common bordered surface used by workspace feature sections. */
export function SectionCard({ children, className }: Props) {
    return (
        <section className={`detail-section${className ? ` ${className}` : ""}`}>
            {children}
        </section>
    );
}
