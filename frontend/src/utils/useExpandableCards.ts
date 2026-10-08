// Shared open/closed state for lists of cards, including an expand-all action.
// Feature components supply the IDs; this hook does not load card data.
import { useCallback, useState } from "react";

/** Coordinates individual and expand-all state for lists of expandable cards. */
export function useExpandableCards(expandableIds: string[]) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const isExpanded = useCallback((id: string) => expandedIds.has(id), [expandedIds]);

    const toggleExpanded = useCallback((id: string) => {
        setExpandedIds((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const expand = useCallback((id: string) => {
        setExpandedIds((current) => new Set(current).add(id));
    }, []);

    const collapse = useCallback((id: string) => {
        setExpandedIds((current) => {
            const next = new Set(current);
            next.delete(id);
            return next;
        });
    }, []);

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

