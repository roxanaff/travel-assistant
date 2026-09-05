import type { ReactNode } from "react";

import "./SectionHeader.css";

type Props = {
    title: string;
    headingLevel?: 2 | 3;
    supporting?: ReactNode;
    actions?: ReactNode;
    className?: string;
};

/** Renders the common title-and-actions row used by workspace card sections. */
export function SectionHeader({
    title,
    headingLevel = 2,
    supporting,
    actions,
    className,
}: Props) {
    const Heading = headingLevel === 2 ? "h2" : "h3";

    return (
        <div className={`section-header${className ? ` ${className}` : ""}`}>
            <div className="section-header-title">
                <Heading>{title}</Heading>
                {supporting}
            </div>
            {actions && <div className="section-header-actions">{actions}</div>}
        </div>
    );
}
