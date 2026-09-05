import type { ReactNode } from "react";

import "./ChecklistLayout.css";
import { SectionHeader } from "./SectionHeader";

type Props = {
    title: string;
    completedCount?: number;
    totalCount?: number;
    completionLabel: string;
    toolbarLeading?: ReactNode;
    actions?: ReactNode;
};

/** Renders a checklist title, optional progress, and a consistent toolbar. */
export function ChecklistHeader({
    title,
    completedCount,
    totalCount,
    completionLabel,
    toolbarLeading,
    actions,
}: Props) {
    const showsProgress = completedCount !== undefined && totalCount !== undefined;
    const showsToolbar = toolbarLeading !== undefined || actions !== undefined;

    return (
        <>
            <SectionHeader
                title={title}
                supporting={
                    showsProgress && (
                        <p className="checklist-progress">
                            <strong>{completedCount}</strong> of{" "}
                            <strong>{totalCount}</strong> {completionLabel}
                        </p>
                    )
                }
                className="checklist-title-row"
            />
            {showsToolbar && (
                <div className="checklist-toolbar">
                    <div>{toolbarLeading}</div>
                    <div className="checklist-header-actions">{actions}</div>
                </div>
            )}
        </>
    );
}
