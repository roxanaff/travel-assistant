import { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical, Pencil, Trash2 } from "lucide-react";

import {
    createDefaultPackingList,
    createPackingItem,
    deletePackingItem,
    getPackingItems,
    resetPackingList,
    reorderPackingItems,
    startEmptyPackingList,
    updatePackingItem,
    updatePackingItemPackedState,
} from "../../api/packingItemsApi";
import {
    createEmptyPackingItemForm,
    packingCategories,
    type PackingItem,
    type PackingItemForm,
} from "../../types/packingItem";
import type { TripWorkspaceContext } from "../../pages/Workspace";
import { useFormKeyboardInteraction } from "../../utils/useFormKeyboardInteraction";
import {
    reorderChecklistSection,
    type ChecklistDropTarget,
    useChecklistDragReorder,
} from "../../utils/useChecklistDragReorder";
import { useChecklistView } from "../../utils/useChecklistView";
import { ChecklistColumns } from "../shared/ChecklistColumns";
import { ChecklistHeader } from "../shared/ChecklistHeader";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { FormDiscardDialog } from "../shared/FormDiscardDialog";
import { GroupingControl } from "../shared/GroupingControl";
import { GroupHeading } from "../shared/GroupHeading";
import { GroupAddButton } from "../shared/GroupAddButton";
import { SectionCard } from "../shared/SectionCard";
import { UndoToast } from "../shared/UndoToast";
import { FieldLabel, FieldRow, FormActions, FormSurface } from "../shared/FormPrimitives";

import "./PackingChecklist.css";

type SetupAction = "default" | "empty" | null;

// Packing quantities are stored in a C# Int32, so the browser uses the same upper bound.
const maximumPackingQuantity = 2_147_483_647;
const packingViewStorageKey = (tripId: string) => `travel-assistant:packing-view:${tripId}`;

type PendingDeletion = {
    item: PackingItem;
};

const categoryLabel = (category: PackingItem["category"]) =>
    packingCategories.find((option) => option.value === category)?.label ?? null;

/**
 * Owns the packing-checklist workflow: choose its initial template, edit items, mark items packed,
 * reorder them, and offer a short undo period before a deletion reaches the API.
 */
export function PackingChecklist({ trip, setTrip, setHasUnsavedForm }: TripWorkspaceContext) {
    const [items, setItems] = useState<PackingItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [setupAction, setSetupAction] = useState<SetupAction>(null);
    const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [newItem, setNewItem] = useState<PackingItemForm>(createEmptyPackingItemForm());
    const [editingItem, setEditingItem] = useState<PackingItemForm>(createEmptyPackingItemForm());
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isConfirmingReset, setIsConfirmingReset] = useState(false);
    const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
    const { view, changeView } = useChecklistView(packingViewStorageKey(trip.id));
    const deleteTimerRef = useRef<number | null>(null);

    useEffect(() => {
        setHasUnsavedForm(isAdding || editingItemId !== null);
        return () => setHasUnsavedForm(false);
    }, [editingItemId, isAdding, setHasUnsavedForm]);

    useEffect(() => {
        const loadItems = async () => {
            setIsLoading(true);
            setError(null);

            try {
                setItems(await getPackingItems(trip.id));
            } catch {
                setError("Could not load packing items.");
            } finally {
                setIsLoading(false);
            }
        };

        void loadItems();
    }, [trip.id]);

    /** Mirrors the API's setup flag in workspace state so this page immediately leaves the setup view. */
    const markChecklistStarted = () => {
        setTrip((current) => (current ? { ...current, hasStartedPackingList: true } : current));
    };

    const chooseDefaultList = async () => {
        setSetupAction("default");
        setError(null);

        try {
            setItems(await createDefaultPackingList(trip.id));
            markChecklistStarted();
        } catch (exception) {
            setError(
                exception instanceof Error && exception.message
                    ? exception.message
                    : "Could not create the default packing list.",
            );
        } finally {
            setSetupAction(null);
        }
    };

    const chooseEmptyList = async () => {
        setSetupAction("empty");
        setError(null);

        try {
            await startEmptyPackingList(trip.id);
            markChecklistStarted();
        } catch (exception) {
            setError(
                exception instanceof Error && exception.message
                    ? exception.message
                    : "Could not start an empty packing list.",
            );
        } finally {
            setSetupAction(null);
        }
    };

    /** Optimistically ticks an item, restoring its former state if the request fails. */
    const togglePacked = async (item: PackingItem) => {
        const nextPackedState = !item.isPacked;
        setUpdatingItemId(item.id);
        setError(null);
        setItems((current) =>
            current.map((currentItem) =>
                currentItem.id === item.id ? { ...currentItem, isPacked: nextPackedState } : currentItem,
            ),
        );

        try {
            const updated = await updatePackingItemPackedState(trip.id, item.id, nextPackedState);
            setItems((current) =>
                current.map((currentItem) => (currentItem.id === updated.id ? updated : currentItem)),
            );
        } catch {
            setItems((current) => current.map((currentItem) => (currentItem.id === item.id ? item : currentItem)));
            setError("Could not update this packing item. It was restored.");
        } finally {
            setUpdatingItemId(null);
        }
    };

    const updateForm = (field: keyof PackingItemForm, value: string, editing = false) => {
        if (field === "quantity" && value !== "" && Number(value) > maximumPackingQuantity) {
            return;
        }

        setFormError(null);
        const update = (current: PackingItemForm) => ({
            ...current,
            [field]: value,
        });
        if (editing) setEditingItem(update);
        else setNewItem(update);
    };

    /** Performs quick browser-side checks before the API repeats its authoritative validation. */
    const validateForm = (item: PackingItemForm) => {
        if (!item.name.trim()) return "Enter an item name.";
        if (item.quantity && (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0)) {
            return "Quantity must be a whole number greater than zero.";
        }
        return null;
    };

    const cancelAdding = () => {
        setIsAdding(false);
        setNewItem(createEmptyPackingItemForm());
        setFormError(null);
    };

    const cancelOpenForm = () => {
        if (editingItemId !== null) setEditingItemId(null);
        else cancelAdding();
    };
    const { formRef, onFormKeyDown, cancelForm, isConfirmingDiscard, cancelDiscardConfirmation, discardChanges } =
        useFormKeyboardInteraction(isAdding || editingItemId !== null, cancelOpenForm);

    /** Opens the add form, optionally carrying the category from a grouped-list heading. */
    const startAdding = (category: PackingItem["category"] = null) => {
        setEditingItemId(null);
        setNewItem({
            ...createEmptyPackingItemForm(),
            category: category ?? "",
        });
        setFormError(null);
        setIsAdding(true);
    };

    const saveNewItem = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const validationError = validateForm(newItem);
        if (validationError) {
            setFormError(validationError);
            return;
        }

        setIsSaving(true);
        setFormError(null);
        try {
            const created = await createPackingItem(trip.id, newItem);
            setItems((current) => [...current, created]);
            cancelAdding();
        } catch (exception) {
            setFormError(exception instanceof Error ? exception.message : "Could not save this item.");
        } finally {
            setIsSaving(false);
        }
    };

    const startEditing = (item: PackingItem) => {
        setIsAdding(false);
        setEditingItemId(item.id);
        setEditingItem({
            name: item.name,
            category: item.category ?? "",
            quantity: item.quantity === 1 ? "" : item.quantity.toString(),
        });
        setFormError(null);
    };

    const saveEdit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingItemId) return;
        const validationError = validateForm(editingItem);
        if (validationError) {
            setFormError(validationError);
            return;
        }

        setIsSaving(true);
        setFormError(null);
        try {
            const updated = await updatePackingItem(trip.id, editingItemId, editingItem);
            setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
            setEditingItemId(null);
        } catch (exception) {
            setFormError(exception instanceof Error ? exception.message : "Could not save these changes.");
        } finally {
            setIsSaving(false);
        }
    };

    /** Permanently deletes an item after its Undo window expires. */
    const commitDelete = async (item: PackingItem) => {
        try {
            await deletePackingItem(trip.id, item.id);
        } catch {
            setItems((current) => [...current, item]);
            setError("Could not delete this packing item. It was restored.");
        } finally {
            setPendingDeletion((current) => (current?.item.id === item.id ? null : current));
        }
    };

    /** Removes an item from the view immediately, keeping it available for five seconds of Undo. */
    const removeItem = (item: PackingItem) => {
        if (pendingDeletion) {
            if (deleteTimerRef.current !== null) window.clearTimeout(deleteTimerRef.current);
            void commitDelete(pendingDeletion.item);
        }

        setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
        setPendingDeletion({ item });
        deleteTimerRef.current = window.setTimeout(() => {
            void commitDelete(item);
            deleteTimerRef.current = null;
        }, 5000);
    };

    const undoDelete = () => {
        if (!pendingDeletion) return;
        if (deleteTimerRef.current !== null) window.clearTimeout(deleteTimerRef.current);
        setItems((current) => [...current, pendingDeletion.item]);
        setPendingDeletion(null);
        deleteTimerRef.current = null;
    };

    const resetChecklist = async () => {
        setError(null);
        try {
            await resetPackingList(trip.id);
            if (deleteTimerRef.current !== null) window.clearTimeout(deleteTimerRef.current);
            setPendingDeletion(null);
            setItems([]);
            setTrip((current) => (current ? { ...current, hasStartedPackingList: false } : current));
            setIsConfirmingReset(false);
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : "Could not reset this packing list.");
        }
    };

    /** Optimistically saves a complete ordering and restores the previous order if it is rejected. */
    const persistOrder = useCallback(
        async (nextItems: PackingItem[]) => {
            const previousItems = items;
            setItems(nextItems.map((item, index) => ({ ...item, sortOrder: index })));

            try {
                await reorderPackingItems(
                    trip.id,
                    nextItems.map((item) => item.id),
                );
            } catch {
                setItems(previousItems);
                setError("Could not save the new packing order. It was restored.");
            }
        },
        [items, trip.id],
    );

    /** Reorders within the packed or unpacked section, then delegates persistence to the API helper. */
    const moveItem = useCallback(
        (sectionItems: PackingItem[], itemId: string, target: ChecklistDropTarget) => {
            const nextItems = reorderChecklistSection(items, sectionItems, itemId, target);
            if (nextItems) void persistOrder(nextItems);
        },
        [items, persistOrder],
    );
    const { drag, dragPosition, dropTarget, startPointerDrag } = useChecklistDragReorder(moveItem);

    /** Shared add/edit form so both flows enforce the same input behaviour and error display. */
    const form = (
        item: PackingItemForm,
        submit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>,
        editing = false,
    ) => (
        <FormSurface formRef={formRef} className="packing-item-form" onKeyDown={onFormKeyDown} onSubmit={submit}>
            <label>
                <FieldLabel required>Name</FieldLabel>
                <input
                    value={item.name}
                    onChange={(event) => updateForm("name", event.target.value, editing)}
                    required
                />
            </label>
            <FieldRow>
                <label>
                    <FieldLabel>Quantity</FieldLabel>
                    <input
                        type="number"
                        min="1"
                        max={maximumPackingQuantity}
                        step="1"
                        value={item.quantity}
                        onChange={(event) => updateForm("quantity", event.target.value, editing)}
                        placeholder="1"
                    />
                </label>
                <label>
                    <FieldLabel>Category</FieldLabel>
                    <select
                        value={item.category}
                        onChange={(event) => updateForm("category", event.target.value, editing)}
                    >
                        <option value="">Not specified</option>
                        {packingCategories.map((category) => (
                            <option key={category.value} value={category.value}>
                                {category.label}
                            </option>
                        ))}
                    </select>
                </label>
            </FieldRow>
            {formError && <p className="form-error">{formError}</p>}
            <FormActions>
                <button className="text-button" type="button" onClick={cancelForm}>
                    Cancel
                </button>
                <button className="primary-button" type="submit" disabled={isSaving}>
                    {isSaving ? "Saving…" : editing ? "Save changes" : "Save"}
                </button>
            </FormActions>
        </FormSurface>
    );

    const toPack = items.filter((item) => !item.isPacked);
    const packed = items.filter((item) => item.isPacked);
    const showSetupChoice = !trip.hasStartedPackingList && items.length === 0;

    /** Renders either an item row or its inline edit form. */
    const renderItem = (item: PackingItem, sectionItems: PackingItem[], showCategory = true) => {
        const checkboxId = `packing-item-${item.id}`;

        return editingItemId === item.id ? (
            <li className="packing-item-editing" key={item.id}>
                {form(editingItem, saveEdit, true)}
            </li>
        ) : (
            <li
                className={`checklist-item packing-item${item.isPacked ? " is-complete" : ""}${drag?.item.id === item.id ? " checklist-item-placeholder" : ""}${dropTarget?.itemId === item.id ? ` checklist-drop-${dropTarget.position}` : ""}`}
                key={item.id}
                data-checklist-item-id={item.id}
            >
                <span
                    className="checklist-drag-handle"
                    onPointerDown={(event) => startPointerDrag(event, item, sectionItems)}
                    aria-label={`Reorder ${item.name}`}
                    title="Drag to reorder within this list"
                >
                    <GripVertical size={17} aria-hidden="true" />
                </span>
                <input
                    id={checkboxId}
                    className="packing-item-checkbox checklist-state-toggle"
                    type="checkbox"
                    checked={item.isPacked}
                    disabled={updatingItemId === item.id}
                    onChange={() => void togglePacked(item)}
                    aria-label={`Mark ${item.name} as ${item.isPacked ? "not packed" : "packed"}`}
                />
                <label className="packing-item-name checklist-state-name" htmlFor={checkboxId}>
                    {item.quantity > 1 && <strong>{item.quantity} × </strong>}
                    {item.name}
                </label>
                {showCategory && categoryLabel(item.category) && (
                    <span className="packing-category item-metadata-label">{categoryLabel(item.category)}</span>
                )}
                <div className="item-actions">
                    <button
                        className="icon-button"
                        type="button"
                        onClick={() => startEditing(item)}
                        aria-label={`Edit ${item.name}`}
                    >
                        <Pencil size={17} />
                    </button>
                    <button
                        className="icon-button danger-button"
                        type="button"
                        onClick={() => removeItem(item)}
                        aria-label={`Delete ${item.name}`}
                    >
                        <Trash2 size={17} />
                    </button>
                </div>
            </li>
        );
    };

    /** Switches between the user's chosen flat-list and category-grouped views. */
    const renderSectionItems = (sectionItems: PackingItem[]) => {
        if (view === "list")
            return <ul className="list-items">{sectionItems.map((item) => renderItem(item, sectionItems))}</ul>;

        const categoryGroups = [...packingCategories, { value: null, label: "Not specified" }];

        return categoryGroups.map((category) => {
            const categoryItems = sectionItems.filter((item) => item.category === category.value);
            if (categoryItems.length === 0) return null;

            return (
                <section className="checklist-category-group" key={category.value}>
                    <GroupHeading
                        title={category.label}
                        actions={
                            category.value && (
                                <GroupAddButton
                                    label={`Add a packing item to ${category.label}`}
                                    onClick={() => startAdding(category.value)}
                                />
                            )
                        }
                    />
                    <ul className="list-items">
                        {categoryItems.map((item) => renderItem(item, categoryItems, false))}
                    </ul>
                </section>
            );
        });
    };

    return (
        <SectionCard className="checklist-section packing-section">
            {drag && (
                <div
                    className="checklist-drag-preview"
                    style={{
                        width: drag.width,
                        left: dragPosition.x - drag.offsetX,
                        top: dragPosition.y - drag.offsetY,
                    }}
                    aria-hidden="true"
                >
                    {drag.item.quantity > 1 && <strong>{drag.item.quantity} × </strong>}
                    {drag.item.name}
                </div>
            )}
            <ChecklistHeader
                title="Packing"
                completedCount={!isLoading && !showSetupChoice ? packed.length : undefined}
                totalCount={!isLoading && !showSetupChoice ? items.length : undefined}
                completionLabel="packed"
                toolbarLeading={
                    !isLoading && !showSetupChoice ? (
                        <GroupingControl value={view} onChange={changeView}>
                            <option value="list">Ungrouped</option>
                            <option value="category">Category</option>
                        </GroupingControl>
                    ) : undefined
                }
                actions={
                    !isLoading && !showSetupChoice ? (
                        <>
                            <button className="text-button" type="button" onClick={() => setIsConfirmingReset(true)}>
                                Reset checklist
                            </button>
                            <button className="primary-button" type="button" onClick={() => startAdding()}>
                                Add item
                            </button>
                        </>
                    ) : undefined
                }
            />

            {isLoading && <p className="detail-message">Loading packing list…</p>}
            {error && <p className="detail-message form-error">{error}</p>}

            {!isLoading && showSetupChoice && (
                <div className="checklist-empty-state">
                    <p>Start with the standard travel essentials, or create your own list.</p>
                    <div className="checklist-setup-actions">
                        <button
                            className="primary-button"
                            type="button"
                            onClick={() => void chooseDefaultList()}
                            disabled={setupAction !== null}
                        >
                            {setupAction === "default" ? "Creating…" : "Use default list"}
                        </button>
                        <button
                            className="text-button"
                            type="button"
                            onClick={() => void chooseEmptyList()}
                            disabled={setupAction !== null}
                        >
                            {setupAction === "empty" ? "Starting…" : "Start empty"}
                        </button>
                    </div>
                </div>
            )}

            {!isLoading && !showSetupChoice && (
                <>
                    {isAdding && form(newItem, saveNewItem)}
                    {pendingDeletion && <UndoToast message="Packing item deleted." onUndo={undoDelete} />}
                    {items.length === 0 ? (
                        <p className="detail-message">Your packing list is empty.</p>
                    ) : (
                        <ChecklistColumns
                            first={{
                                heading: "To pack",
                                children:
                                    toPack.length === 0 ? (
                                        <p className="detail-message">Everything is packed.</p>
                                    ) : (
                                        renderSectionItems(toPack)
                                    ),
                            }}
                            second={{
                                heading: "Packed",
                                children:
                                    packed.length === 0 ? (
                                        <p className="detail-message">Nothing packed yet.</p>
                                    ) : (
                                        renderSectionItems(packed)
                                    ),
                            }}
                        />
                    )}
                </>
            )}
            <ConfirmDialog
                isOpen={isConfirmingReset}
                title="Reset checklist?"
                confirmLabel="Reset checklist"
                onCancel={() => setIsConfirmingReset(false)}
                onConfirm={() => void resetChecklist()}
            >
                <p>All current packing items will be permanently removed.</p>
            </ConfirmDialog>
            <FormDiscardDialog
                isOpen={isConfirmingDiscard}
                onCancel={cancelDiscardConfirmation}
                onConfirm={discardChanges}
            />
        </SectionCard>
    );
}
