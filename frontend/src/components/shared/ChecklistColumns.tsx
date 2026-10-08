// Places two checklist states side by side, such as packed versus unpacked.
// The checklist supplies the headings and items for each side.
import type { ReactNode } from "react";

import "./ChecklistLayout.css";

type ChecklistColumn = {
    heading: string;
    children: ReactNode;
};

type Props = {
    first: ChecklistColumn;
    second: ChecklistColumn;
};

/** Creates the responsive two-column layout shared by state-based checklists. */
export function ChecklistColumns({ first, second }: Props) {
    return (
        <div className="checklist-columns">
            <section className="checklist-state-section">
                <h3>{first.heading}</h3>
                {first.children}
            </section>
            <section className="checklist-state-section">
                <h3>{second.heading}</h3>
                {second.children}
            </section>
        </div>
    );
}
