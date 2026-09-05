import type { ReactNode } from "react";

import "./GroupHeading.css";

type Props = {
    title: string;
    actions?: ReactNode;
    summary?: ReactNode;
};

/** Gives grouped feature content a consistent title, optional actions, and summary treatment. */
export function GroupHeading({ title, actions, summary }: Props) {
    return (
        <div className="group-heading">
            <div className="group-heading-title">
                <h4>{title}</h4>
                {actions}
            </div>
            {summary && <strong className="group-heading-summary">{summary}</strong>}
        </div>
    );
}
