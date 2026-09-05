import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";

type ReorderableItem = {
    id: string;
};

export type ChecklistDropTarget = {
    itemId: string;
    position: "before" | "after";
};

/**
 * Reorders one visible checklist section while retaining all items outside that section in their
 * existing relative positions. This also makes grouped checklist reordering safe.
 */
export function reorderChecklistSection<Item extends ReorderableItem>(
    items: Item[],
    sectionItems: Item[],
    itemId: string,
    target: ChecklistDropTarget,
): Item[] | null {
    const currentIndex = sectionItems.findIndex((item) => item.id === itemId);
    if (currentIndex < 0) return null;

    const reorderedSection = [...sectionItems];
    const [movedItem] = reorderedSection.splice(currentIndex, 1);
    const targetIndex = reorderedSection.findIndex((item) => item.id === target.itemId);
    if (targetIndex < 0) return null;
    reorderedSection.splice(target.position === "before" ? targetIndex : targetIndex + 1, 0, movedItem);

    const sectionItemIds = new Set(sectionItems.map((item) => item.id));
    let reorderedIndex = 0;
    return items.map((item) => (sectionItemIds.has(item.id) ? reorderedSection[reorderedIndex++] : item));
}

type ChecklistDrag<Item extends ReorderableItem> = {
    item: Item;
    sectionItems: Item[];
    pointerId: number;
    width: number;
    offsetX: number;
    offsetY: number;
};

type PendingPointerDrag<Item extends ReorderableItem> = {
    item: Item;
    sectionItems: Item[];
    pointerId: number;
    x: number;
    y: number;
    handle: HTMLElement;
};

/**
 * Provides the shared pointer interaction for reordering checklist rows within one visible section.
 * The caller keeps ownership of the list state and persists the resulting order.
 */
export function useChecklistDragReorder<Item extends ReorderableItem>(
    onMove: (sectionItems: Item[], itemId: string, target: ChecklistDropTarget) => void,
) {
    const [drag, setDrag] = useState<ChecklistDrag<Item> | null>(null);
    const [dropTarget, setDropTarget] = useState<ChecklistDropTarget | null>(null);
    const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
    const touchDragTimerRef = useRef<number | null>(null);
    const dropTargetRef = useRef<ChecklistDropTarget | null>(null);
    const pendingPointerRef = useRef<PendingPointerDrag<Item> | null>(null);

    useEffect(() => {
        return () => {
            if (touchDragTimerRef.current !== null) {
                window.clearTimeout(touchDragTimerRef.current);
            }
        };
    }, []);

    const beginPointerDrag = useCallback(
        (
            item: Item,
            sectionItems: Item[],
            pointerId: number,
            handle: HTMLElement,
            clientX: number,
            clientY: number,
        ) => {
            const row = handle.closest<HTMLElement>("[data-checklist-item-id]");
            if (!row) return;

            const bounds = row.getBoundingClientRect();
            handle.setPointerCapture(pointerId);
            setDrag({
                item,
                sectionItems,
                pointerId,
                width: bounds.width,
                offsetX: clientX - bounds.left,
                offsetY: clientY - bounds.top,
            });
            setDragPosition({ x: clientX, y: clientY });
            setDropTarget(null);
        },
        [],
    );

    const clearPointerDrag = useCallback(() => {
        if (touchDragTimerRef.current !== null) {
            window.clearTimeout(touchDragTimerRef.current);
            touchDragTimerRef.current = null;
        }
        pendingPointerRef.current = null;
        dropTargetRef.current = null;
        setDrag(null);
        setDropTarget(null);
    }, []);

    const findDropTarget = useCallback(
        (event: globalThis.PointerEvent) => {
            if (!drag) return null;
            const hoveredRow = document
                .elementFromPoint(event.clientX, event.clientY)
                ?.closest<HTMLElement>("[data-checklist-item-id]");
            const targetId = hoveredRow?.dataset.checklistItemId;
            if (!targetId || targetId === drag.item.id) return null;

            const availableItems = drag.sectionItems.filter((item) => item.id !== drag.item.id);
            const targetIndex = availableItems.findIndex((item) => item.id === targetId);
            if (targetIndex < 0) return null;

            const bounds = hoveredRow.getBoundingClientRect();
            if (event.clientY < bounds.top + bounds.height / 2) {
                return { itemId: targetId, position: "before" } satisfies ChecklistDropTarget;
            }

            const nextItem = availableItems[targetIndex + 1];
            return nextItem
                ? ({ itemId: nextItem.id, position: "before" } satisfies ChecklistDropTarget)
                : ({ itemId: targetId, position: "after" } satisfies ChecklistDropTarget);
        },
        [drag],
    );

    useEffect(() => {
        const updateDrag = (event: globalThis.PointerEvent) => {
            const pending = pendingPointerRef.current;
            if (pending && event.pointerId === pending.pointerId) {
                const moved = Math.hypot(event.clientX - pending.x, event.clientY - pending.y);
                if (moved > 6) {
                    if (touchDragTimerRef.current !== null) {
                        window.clearTimeout(touchDragTimerRef.current);
                        touchDragTimerRef.current = null;
                    }
                    if (event.pointerType !== "touch") {
                        beginPointerDrag(
                            pending.item,
                            pending.sectionItems,
                            pending.pointerId,
                            pending.handle,
                            event.clientX,
                            event.clientY,
                        );
                    }
                    pendingPointerRef.current = null;
                }
                return;
            }
            if (!drag || event.pointerId !== drag.pointerId) return;

            setDragPosition({ x: event.clientX, y: event.clientY });
            const nextDropTarget = findDropTarget(event);
            dropTargetRef.current = nextDropTarget;
            setDropTarget(nextDropTarget);
        };

        const finishDrag = (event: globalThis.PointerEvent) => {
            if (drag?.pointerId === event.pointerId && dropTargetRef.current) {
                onMove(drag.sectionItems, drag.item.id, dropTargetRef.current);
            }
            if (drag?.pointerId === event.pointerId || pendingPointerRef.current?.pointerId === event.pointerId) {
                clearPointerDrag();
            }
        };

        window.addEventListener("pointermove", updateDrag);
        window.addEventListener("pointerup", finishDrag);
        window.addEventListener("pointercancel", finishDrag);
        return () => {
            window.removeEventListener("pointermove", updateDrag);
            window.removeEventListener("pointerup", finishDrag);
            window.removeEventListener("pointercancel", finishDrag);
        };
    }, [beginPointerDrag, clearPointerDrag, drag, findDropTarget, onMove]);

    const startPointerDrag = useCallback(
        (event: PointerEvent<HTMLElement>, item: Item, sectionItems: Item[]) => {
            if (event.button !== 0) return;

            pendingPointerRef.current = {
                item,
                sectionItems,
                pointerId: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                handle: event.currentTarget,
            };
            if (event.pointerType === "touch") {
                touchDragTimerRef.current = window.setTimeout(() => {
                    const pending = pendingPointerRef.current;
                    if (!pending) return;

                    beginPointerDrag(
                        pending.item,
                        pending.sectionItems,
                        pending.pointerId,
                        pending.handle,
                        pending.x,
                        pending.y,
                    );
                    pendingPointerRef.current = null;
                    touchDragTimerRef.current = null;
                }, 200);
            }
        },
        [beginPointerDrag],
    );

    return { drag, dragPosition, dropTarget, startPointerDrag };
}
