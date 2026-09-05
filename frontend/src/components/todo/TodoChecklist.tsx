import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";

import {
    createDefaultTodoList,
    createTodoItem,
    getTodoItems,
    startEmptyTodoList,
    updateTodoItem,
    updateTodoItemCompletedState,
} from "../../api/todoItemsApi";
import { createEmptyTodoItemForm, todoCategories, type TodoItem, type TodoItemForm } from "../../types/todoItem";
import type { TripWorkspaceContext } from "../../pages/Workspace";
import { useFormKeyboardInteraction } from "../../utils/useFormKeyboardInteraction";
import { formatDate } from "../../utils/format";
import { ChecklistColumns } from "../shared/ChecklistColumns";
import { ChecklistHeader } from "../shared/ChecklistHeader";
import { FormDiscardDialog } from "../shared/FormDiscardDialog";
import { SectionCard } from "../shared/SectionCard";
import { FieldLabel, FieldRow, FormActions, FormSurface } from "../shared/FormPrimitives";

import "./TodoChecklist.css";

type SetupAction = "default" | "empty" | null;

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

    const startAdding = () => {
        setEditingItemId(null);
        setNewItem({
            ...createEmptyTodoItemForm(),
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

    const showSetupChoice = !trip.hasStartedTodoList && items.length === 0;
    const canSetDeadline = trip.startDate !== null && trip.endDate !== null;
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
                {canSetDeadline && (
                    <label>
                        <FieldLabel>Complete by</FieldLabel>
                        <input
                            type="date"
                            value={item.deadline}
                            onChange={(event) => updateForm("deadline", event.target.value, editing)}
                        />
                    </label>
                )}
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

    const renderItem = (item: TodoItem) => {
        const checkboxId = `todo-item-${item.id}`;

        return editingItemId === item.id ? (
            <li className="todo-item-editing" key={item.id}>
                {form(editingItem, saveEdit, true)}
            </li>
        ) : (
            <li className={`checklist-item todo-item${item.isCompleted ? " is-complete" : ""}`} key={item.id}>
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
                {(categoryLabel(item.category) || item.deadline) && (
                    <div className="todo-item-details item-metadata">
                        {categoryLabel(item.category) && (
                            <span className="todo-category item-metadata-label">{categoryLabel(item.category)}</span>
                        )}
                        {item.deadline && (
                            <span className="todo-deadline item-metadata-detail">
                                Complete by {formatDate(item.deadline)}
                            </span>
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
                </div>
            </li>
        );
    };

    return (
        <SectionCard className="checklist-section todo-section">
            <ChecklistHeader
                title="To-do"
                completedCount={!isLoading && !showSetupChoice ? done.length : undefined}
                totalCount={!isLoading && !showSetupChoice ? items.length : undefined}
                completionLabel="complete"
                actions={
                    !isLoading && !showSetupChoice && !isAdding ? (
                        <button className="primary-button" type="button" onClick={startAdding}>
                            Add task
                        </button>
                    ) : undefined
                }
            />

            {isLoading && <p className="detail-message">Loading to-do tasks…</p>}
            {error && <p className="detail-message form-error">{error}</p>}

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
                    {!canSetDeadline && (
                        <p className="todo-deadline-guidance">
                            Add trip dates in Details to set deadlines and organise tasks around the trip.
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
                                        <ul className="list-items">{toDo.map(renderItem)}</ul>
                                    ),
                            }}
                            second={{
                                heading: "Done",
                                children:
                                    done.length === 0 ? (
                                        <p className="detail-message">Nothing done yet.</p>
                                    ) : (
                                        <ul className="list-items">{done.map(renderItem)}</ul>
                                    ),
                            }}
                        />
                    )}
                </>
            )}
            <FormDiscardDialog
                isOpen={isConfirmingDiscard}
                onCancel={cancelDiscardConfirmation}
                onConfirm={discardChanges}
            />
        </SectionCard>
    );
}
