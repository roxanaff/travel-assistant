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
