import { useCallback, useState } from "react";

export type ChecklistView = "list" | "category";

const getStoredChecklistView = (storageKey: string): ChecklistView => {
    try {
        return window.localStorage.getItem(storageKey) === "category" ? "category" : "list";
    } catch {
        return "list";
    }
};

/** Persists one checklist's preferred list or category-grouped view in browser storage. */
export function useChecklistView(storageKey: string) {
    const [view, setView] = useState<ChecklistView>(() => getStoredChecklistView(storageKey));

    const changeView = useCallback(
        (nextView: ChecklistView) => {
            setView(nextView);

            try {
                window.localStorage.setItem(storageKey, nextView);
            } catch {
                // The checklist still works when browser storage is unavailable.
            }
        },
        [storageKey],
    );

    return { view, changeView };
}
