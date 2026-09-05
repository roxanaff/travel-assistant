import type { ReactNode } from "react";

import "./GroupingControl.css";

type Props<TValue extends string> = {
    value: TValue;
    onChange: (value: TValue) => void;
    children: ReactNode;
    label?: string;
};

/** Renders the consistent selector used to choose how a feature's items are grouped. */
export function GroupingControl<TValue extends string>({
    value,
    onChange,
    children,
    label = "Group by",
}: Props<TValue>) {
    return (
        <label className="grouping-control">
            <span>{label}</span>
            <select value={value} onChange={(event) => onChange(event.target.value as TValue)}>
                {children}
            </select>
        </label>
    );
}
