import { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical, Pencil, Trash2 } from "lucide-react";

import {
    createDefaultTodoList,
    createTodoItem,
    deleteTodoItem,
    dismissTodoDeadlineReviewNotice,
    getTodoItems,
    reorderTodoItems,
    resetTodoList,
    startEmptyTodoList,
    updateTodoItem,
    updateTodoItemCompletedState,
} from "../../api/todoItemsApi";
import { createEmptyTodoItemForm, todoCategories, type TodoItem, type TodoItemForm } from "../../types/todoItem";
import type { TripWorkspaceContext } from "../../pages/Workspace";
import { useFormKeyboardInteraction } from "../../utils/useFormKeyboardInteraction";
import {
    reorderChecklistSection,
    type ChecklistDropTarget,
    useChecklistDragReorder,
} from "../../utils/useChecklistDragReorder";
import { useChecklistView } from "../../utils/useChecklistView";
import { formatDate } from "../../utils/format";
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

import "./TodoChecklist.css";

type SetupAction = "default" | "empty" | null;

type PendingDeletion = {
    item: TodoItem;
};

const todoViewStorageKey = (tripId: string) => `travel-assistant:todo-view:${tripId}`;

/** Owns the initial setup workflow for one trip's manual to-do checklist. */
export function TodoChecklist({ trip, setTrip, setHasUnsavedForm }: TripWorkspaceContext) {
    const [items, setItems] = useState<TodoItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [setupAction, setSetupAction] = useState<SetupAction>(null);
    const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [newItem, setNewItem] = useState<TodoItemForm>(createEmptyTodoItemForm());
    const [editingItem, setEditingItem] = useState<TodoItemForm>(createEmptyTodoItemForm());
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isConfirmingReset, setIsConfirmingReset] = useState(false);
    const [isDismissingDeadlineReview, setIsDismissingDeadlineReview] = useState(false);
    const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
    const deleteTimerRef = useRef<number | null>(null);
    const { view, changeView } = useChecklistView(todoViewStorageKey(trip.id));

    useEffect(() => {
        setHasUnsavedForm(isAdding || editingItemId !== null);
        return () => setHasUnsavedForm(false);
    }, [editingItemId, isAdding, setHasUnsavedForm]);

    useEffect(() => {
        const loadItems = async () => {
            setIsLoading(true);
            setError(null);

            try {
                setItems(await getTodoItems(trip.id));
            } catch {
                setError("Could not load to-do tasks.");
            } finally {
                setIsLoading(false);
            }
        };

        void loadItems();
    }, [trip.id]);

    /** Mirrors the API's setup flag in workspace state so this page immediately leaves the setup view. */
    const markChecklistStarted = () => {
        setTrip((current) => (current ? { ...current, hasStartedTodoList: true } : current));
    };

    const chooseDefaultList = async () => {
        setSetupAction("default");
        setError(null);

        try {
            setItems(await createDefaultTodoList(trip.id));
            markChecklistStarted();
        } catch (exception) {
            setError(
                exception instanceof Error && exception.message
                    ? exception.message
                    : "Could not create the default to-do list.",
            );
        } finally {
            setSetupAction(null);
        }
    };

    const chooseEmptyList = async () => {
        setSetupAction("empty");
        setError(null);

        try {
            await startEmptyTodoList(trip.id);
            markChecklistStarted();
        } catch (exception) {
            setError(
                exception instanceof Error && exception.message
                    ? exception.message
                    : "Could not start an empty to-do checklist.",
            );
        } finally {
            setSetupAction(null);
        }
    };

    /** Optimistically marks a task done or reopens it, restoring the former state if the request fails. */
    const toggleCompleted = async (item: TodoItem) => {
        const nextCompletedState = !item.isCompleted;
        setUpdatingItemId(item.id);
        setError(null);
        setItems((current) =>
            current.map((currentItem) =>
                currentItem.id === item.id ? { ...currentItem, isCompleted: nextCompletedState } : currentItem,
            ),
        );

        try {
            const updated = await updateTodoItemCompletedState(trip.id, item.id, nextCompletedState);
            setItems((current) =>
                current.map((currentItem) => (currentItem.id === updated.id ? updated : currentItem)),
            );
        } catch {
            setItems((current) => current.map((currentItem) => (currentItem.id === item.id ? item : currentItem)));
            setError("Could not update this to-do task. It was restored.");
        } finally {
            setUpdatingItemId(null);
        }
    };

    const updateForm = (field: keyof TodoItemForm, value: string, editing = false) => {
        setFormError(null);
        const update = (current: TodoItemForm) => ({
            ...current,
            [field]: value,
        });
        if (editing) setEditingItem(update);
        else setNewItem(update);
    };

    const validateForm = (item: TodoItemForm) => (item.name.trim() ? null : "Enter a task name.");

    const cancelAdding = () => {
        setIsAdding(false);
        setNewItem(createEmptyTodoItemForm());
        setFormError(null);
    };

    const cancelOpenForm = () => {
        if (editingItemId !== null) setEditingItemId(null);
        else cancelAdding();
    };
    const { formRef, onFormKeyDown, cancelForm, isConfirmingDiscard, cancelDiscardConfirmation, discardChanges } =
        useFormKeyboardInteraction(isAdding || editingItemId !== null, cancelOpenForm);

    /** Opens the add form, optionally carrying the category from a grouped-list heading. */
    const startAdding = (category: TodoItem["category"] = null) => {
        setEditingItemId(null);
        setNewItem({
            ...createEmptyTodoItemForm(),
            category: category ?? "",
            deadline: trip.startDate ?? "",
        });
        setIsAdding(true);
        setFormError(null);
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
            const created = await createTodoItem(trip.id, newItem);
            setItems((current) => [...current, created]);
            cancelAdding();
        } catch (exception) {
            setFormError(exception instanceof Error ? exception.message : "Could not save this to-do task.");
        } finally {
            setIsSaving(false);
        }
    };

    const startEditing = (item: TodoItem) => {
        setIsAdding(false);
        setEditingItemId(item.id);
        setEditingItem({
            name: item.name,
            category: item.category ?? "",
            deadline: item.deadline ?? "",
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
            const updated = await updateTodoItem(trip.id, editingItemId, editingItem);
            setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
            setEditingItemId(null);
        } catch (exception) {
            setFormError(exception instanceof Error ? exception.message : "Could not save these changes.");
        } finally {
            setIsSaving(false);
        }
    };

    /** Permanently deletes a task after its Undo window expires. */
    const commitDelete = async (item: TodoItem) => {
        try {
            await deleteTodoItem(trip.id, item.id);
        } catch {
            setItems((current) => [...current, item]);
            setError("Could not delete this to-do task. It was restored.");
        } finally {
            setPendingDeletion((current) => (current?.item.id === item.id ? null : current));
        }
    };

    /** Removes a task from the view immediately, keeping it available for five seconds of Undo. */
    const removeItem = (item: TodoItem) => {
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
            await resetTodoList(trip.id);
            if (deleteTimerRef.current !== null) window.clearTimeout(deleteTimerRef.current);
            setPendingDeletion(null);
            setItems([]);
            setTrip((current) =>
                current
                    ? { ...current, hasStartedTodoList: false, hasPendingTodoDeadlineReview: false }
                    : current,
            );
            setIsConfirmingReset(false);
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : "Could not reset the to-do checklist.");
        }
    };

    /** Hides the reminder only after the API records that the saved dates were reviewed. */
    const dismissDeadlineReviewNotice = async () => {
        setIsDismissingDeadlineReview(true);
        setError(null);

        try {
            await dismissTodoDeadlineReviewNotice(trip.id);
            setTrip((current) => (current ? { ...current, hasPendingTodoDeadlineReview: false } : current));
        } catch (exception) {
            setError(
                exception instanceof Error ? exception.message : "Could not dismiss the deadline review reminder.",
            );
        } finally {
            setIsDismissingDeadlineReview(false);
        }
    };

    /** Optimistically saves a complete ordering and restores the previous order if it is rejected. */
    const persistOrder = useCallback(
        async (nextItems: TodoItem[]) => {
            const previousItems = items;
            setItems(nextItems.map((item, index) => ({ ...item, sortOrder: index })));

            try {
                await reorderTodoItems(
                    trip.id,
                    nextItems.map((item) => item.id),
                );
            } catch {
                setItems(previousItems);
                setError("Could not save the new to-do order. It was restored.");
            }
        },
        [items, trip.id],
    );

    /** Reorders within the complete or incomplete section, then delegates persistence to the API helper. */
    const moveItem = useCallback(
        (sectionItems: TodoItem[], itemId: string, target: ChecklistDropTarget) => {
            const nextItems = reorderChecklistSection(items, sectionItems, itemId, target);
            if (nextItems) void persistOrder(nextItems);
        },
        [items, persistOrder],
    );

    const { drag, dragPosition, dropTarget, startPointerDrag } = useChecklistDragReorder(moveItem);

    const showSetupChoice = !trip.hasStartedTodoList && items.length === 0;
    const toDo = items.filter((item) => !item.isCompleted);
    const done = items.filter((item) => item.isCompleted);

    const categoryLabel = (category: TodoItem["category"]) =>
        todoCategories.find((option) => option.value === category)?.label ?? null;

    /** Shared add/edit form so both flows enforce the same input behaviour and error display. */
    const form = (
        item: TodoItemForm,
        submit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>,
        editing = false,
    ) => (
        <FormSurface formRef={formRef} className="todo-item-form" onKeyDown={onFormKeyDown} onSubmit={submit}>
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
                    <FieldLabel>Category</FieldLabel>
                    <select
                        value={item.category}
                        onChange={(event) => updateForm("category", event.target.value, editing)}
                    >
                        <option value="">Not specified</option>
                        {todoCategories.map((category) => (
                            <option key={category.value} value={category.value}>
                                {category.label}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    <FieldLabel>Complete by</FieldLabel>
                    <input
                        type="date"
                        value={item.deadline}
                        onChange={(event) => updateForm("deadline", event.target.value, editing)}
                    />
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

    const renderItem = (item: TodoItem, sectionItems: TodoItem[], showCategory = true) => {
        const checkboxId = `todo-item-${item.id}`;

        return editingItemId === item.id ? (
            <li className="todo-item-editing" key={item.id}>
                {form(editingItem, saveEdit, true)}
            </li>
        ) : (
            <li
                className={`checklist-item todo-item${item.isCompleted ? " is-complete" : ""}${drag?.item.id === item.id ? " checklist-item-placeholder" : ""}${dropTarget?.itemId === item.id ? ` checklist-drop-${dropTarget.position}` : ""}`}
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
                    className="todo-item-checkbox checklist-state-toggle"
                    type="checkbox"
                    checked={item.isCompleted}
                    disabled={updatingItemId === item.id}
                    onChange={() => void toggleCompleted(item)}
                    aria-label={`Mark ${item.name} as ${item.isCompleted ? "to do" : "done"}`}
                />
                <label className="todo-item-name checklist-state-name" htmlFor={checkboxId}>
                    {item.name}
                </label>
                {((showCategory && categoryLabel(item.category)) || item.deadline) && (
                    <div className="todo-item-details item-metadata">
                        {showCategory && categoryLabel(item.category) && (
                            <span className="todo-category item-metadata-label">{categoryLabel(item.category)}</span>
                        )}
                        {item.deadline && (
                            <span className="todo-deadline item-metadata-detail">{formatDate(item.deadline)}</span>
                        )}
                    </div>
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
    const renderSectionItems = (sectionItems: TodoItem[]) => {
        if (view === "list") {
            return <ul className="list-items">{sectionItems.map((item) => renderItem(item, sectionItems))}</ul>;
        }

        const categoryGroups = [...todoCategories, { value: null, label: "Not specified" }];

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
                                    label={`Add a to-do task to ${category.label}`}
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
        <SectionCard className="checklist-section todo-section">
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
                    {drag.item.name}
                </div>
            )}
            <ChecklistHeader
                title="To-do"
                completedCount={!isLoading && !showSetupChoice ? done.length : undefined}
                totalCount={!isLoading && !showSetupChoice ? items.length : undefined}
                completionLabel="complete"
                toolbarLeading={
                    !isLoading && !showSetupChoice ? (
                        <GroupingControl value={view} onChange={changeView}>
                            <option value="list">Ungrouped</option>
                            <option value="category">Category</option>
                        </GroupingControl>
                    ) : undefined
                }
                actions={
                    !isLoading && !showSetupChoice && !isAdding ? (
                        <>
                            <button className="text-button" type="button" onClick={() => setIsConfirmingReset(true)}>
                                Reset checklist
                            </button>
                            <button className="primary-button" type="button" onClick={() => startAdding()}>
                                Add task
                            </button>
                        </>
                    ) : undefined
                }
            />

            {isLoading && <p className="detail-message">Loading to-do tasks…</p>}
            {error && <p className="detail-message form-error">{error}</p>}

            {!isLoading && trip.hasPendingTodoDeadlineReview && items.length > 0 && (
                <div className="inline-notice" role="status">
                    <p>Trip dates changed. Existing task deadlines were kept, so please review them.</p>
                    <button
                        className="text-button"
                        type="button"
                        onClick={() => void dismissDeadlineReviewNotice()}
                        disabled={isDismissingDeadlineReview}
                    >
                        {isDismissingDeadlineReview ? "Dismissing…" : "Dismiss"}
                    </button>
                </div>
            )}

            {!isLoading && showSetupChoice && (
                <div className="checklist-empty-state">
                    <p>Start with a practical default list, or create a blank checklist for this trip.</p>
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
                    {pendingDeletion && <UndoToast message="To-do task deleted." onUndo={undoDelete} />}
                    {!trip.startDate && (
                        <p className="todo-deadline-guidance">
                            Add trip dates in Details to prefill new task deadlines with the trip's start date.
                        </p>
                    )}
                    {items.length === 0 ? (
                        <p className="detail-message">Your to-do checklist is empty.</p>
                    ) : (
                        <ChecklistColumns
                            first={{
                                heading: "To do",
                                children:
                                    toDo.length === 0 ? (
                                        <p className="detail-message">Everything is done.</p>
                                    ) : (
                                        renderSectionItems(toDo)
                                    ),
                            }}
                            second={{
                                heading: "Done",
                                children:
                                    done.length === 0 ? (
                                        <p className="detail-message">Nothing done yet.</p>
                                    ) : (
                                        renderSectionItems(done)
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
                <p>All current to-do tasks will be permanently removed.</p>
            </ConfirmDialog>
            <FormDiscardDialog
                isOpen={isConfirmingDiscard}
                onCancel={cancelDiscardConfirmation}
                onConfirm={discardChanges}
            />
        </SectionCard>
    );
}
