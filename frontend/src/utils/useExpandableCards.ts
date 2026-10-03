import { useState } from "react";

/** Coordinates individual and expand-all state for lists of expandable cards. */
export function useExpandableCards(expandableIds: string[]) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const isExpanded = (id: string) => expandedIds.has(id);

    const toggleExpanded = (id: string) => {
        setExpandedIds((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const expand = (id: string) => {
        setExpandedIds((current) => new Set(current).add(id));
    };

    const collapse = (id: string) => {
        setExpandedIds((current) => {
            const next = new Set(current);
            next.delete(id);
            return next;
        });
    };

    const areAllExpanded =
        expandableIds.length > 0
        && expandableIds.every((id) => expandedIds.has(id));

    const toggleAll = () => {
        setExpandedIds(areAllExpanded ? new Set() : new Set(expandableIds));
    };

    return {
        areAllExpanded,
        collapse,
        expand,
        isExpanded,
        toggleAll,
        toggleExpanded,
    };
}

