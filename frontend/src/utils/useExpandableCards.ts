// Shared open/closed state for lists of cards, including an expand-all action.
// Feature components supply the IDs; this hook does not load card data.
import { useCallback, useEffect, useState } from "react";

const readExpandedIds = (storageKey?: string): Set<string> => {
    if (!storageKey) return new Set();

    try {
        const value: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
        return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []);
    } catch {
        return new Set();
    }
};

/** Coordinates individual and expand-all state for lists of expandable cards. */
export function useExpandableCards(expandableIds: string[], storageKey?: string) {
    const stateKey = storageKey ?? "";
    const [expandedByKey, setExpandedByKey] = useState<Record<string, Set<string>>>(() => ({
        [stateKey]: readExpandedIds(storageKey),
    }));
    const expandedIds = expandedByKey[stateKey] ?? readExpandedIds(storageKey);

    useEffect(() => {
        if (!storageKey || !expandedByKey[stateKey]) return;

        try {
            window.localStorage.setItem(storageKey, JSON.stringify([...expandedByKey[stateKey]]));
        } catch {
            // Cards still work when browser storage is unavailable.
        }
    }, [expandedByKey, stateKey, storageKey]);

    const setExpandedIds = useCallback((update: (current: Set<string>) => Set<string>) => {
        setExpandedByKey((current) => ({
            ...current,
            [stateKey]: update(current[stateKey] ?? readExpandedIds(storageKey)),
        }));
    }, [stateKey, storageKey]);

    const isExpanded = useCallback((id: string) => expandedIds.has(id), [expandedIds]);

    const toggleExpanded = useCallback((id: string) => {
        setExpandedIds((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, [setExpandedIds]);

    const expand = useCallback((id: string) => {
        setExpandedIds((current) => new Set(current).add(id));
    }, [setExpandedIds]);

    const collapse = useCallback((id: string) => {
        setExpandedIds((current) => {
            const next = new Set(current);
            next.delete(id);
            return next;
        });
    }, [setExpandedIds]);

    const areAllExpanded =
        expandableIds.length > 0
        && expandableIds.every((id) => expandedIds.has(id));

    const toggleAll = () => {
        setExpandedIds(() => areAllExpanded ? new Set() : new Set(expandableIds));
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

