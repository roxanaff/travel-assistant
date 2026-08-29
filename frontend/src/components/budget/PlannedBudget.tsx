import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import {
    createPlannedCost,
    deletePlannedCost,
    getPlannedCosts,
    updatePlannedCost,
} from "../../api/plannedCostsApi";
import { createExpense, deleteExpense } from "../../api/expensesApi";
import type { Trip } from "../../types/trip";
import {
    createEmptyPlannedCostForm,
    plannedCostCategories,
    type PlannedCost,
    type PlannedCostCategory,
    type PlannedCostForm,
} from "../../types/plannedCost";
import { formatMoney } from "../../utils/format";
import { normalizeMoneyInput } from "../../utils/numberInput";
import { useFormKeyboardInteraction } from "../../utils/useFormKeyboardInteraction";

import "./PlannedBudget.css";
import "./BudgetItem.css";

type PlannedBudgetProps = {
    trip: Trip;
    onFormOpenChange: (isOpen: boolean) => void;
    onExpenseAdded: () => void;
};

type PendingDeletion = {
    cost: PlannedCost;
};

/** Returns today's calendar date in the browser's local time for a newly recorded expense. */
const localToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");

    return `${year}-${month}-${day}`;
};

/**
 * Manages estimated spending by category and can copy one plan into actual expenses exactly once.
 */
export function PlannedBudget({
    trip,
    onFormOpenChange,
    onExpenseAdded,
}: PlannedBudgetProps) {
    const [costs, setCosts] = useState<PlannedCost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [newCost, setNewCost] = useState<PlannedCostForm>(
        createEmptyPlannedCostForm(),
    );
    const [isAdding, setIsAdding] = useState(false);
    const [addingForCategory, setAddingForCategory] =
        useState<PlannedCostCategory | null>(null);
    const [editingCostId, setEditingCostId] = useState<string | null>(null);
    const [editingCost, setEditingCost] = useState<PlannedCostForm>(
        createEmptyPlannedCostForm(),
    );
    const [pendingDeletion, setPendingDeletion] =
        useState<PendingDeletion | null>(null);
    const [copyingCostId, setCopyingCostId] = useState<string | null>(null);
    const [undoingExpenseCostId, setUndoingExpenseCostId] = useState<
        string | null
    >(null);
    const deleteTimerRef = useRef<number | null>(null);

    useEffect(() => {
        onFormOpenChange(isAdding || editingCostId !== null);
        return () => onFormOpenChange(false);
    }, [editingCostId, isAdding, onFormOpenChange]);

    useEffect(() => {
        const loadCosts = async () => {
            try {
                setCosts(await getPlannedCosts(trip.id));
            } catch {
                setError("Could not load planned costs.");
            } finally {
                setIsLoading(false);
            }
        };

        void loadCosts();
    }, [trip.id]);

    const updateForm = (
        field: keyof PlannedCostForm,
        value: string,
        editing = false,
    ) => {
        if (field === "amount") {
            const normalized = normalizeMoneyInput(value);
            if (normalized === null) return;
            value = normalized;
        }

        const update = (current: PlannedCostForm) => ({
            ...current,
            [field]: value,
        });
        if (editing) setEditingCost(update);
        else setNewCost(update);
    };

    /** Converts browser form strings into the API payload shape. */
    const toRequest = (cost: PlannedCostForm) => ({
        name: cost.name.trim() || null,
        category: cost.category || null,
        amount: Number(cost.amount),
    });

    const validate = (cost: PlannedCostForm) => {
        if (!cost.amount || Number(cost.amount) <= 0)
            return "Enter an amount greater than zero.";
        return null;
    };

    const startAdding = (category: PlannedCostCategory | null = null) => {
        setEditingCostId(null);
        setNewCost(createEmptyPlannedCostForm(category ?? ""));
        setAddingForCategory(category);
        setFormError(null);
        setIsAdding(true);
    };

    const cancelAdding = () => {
        setIsAdding(false);
        setAddingForCategory(null);
        setFormError(null);
    };

    const cancelOpenForm = () => {
        if (editingCostId !== null) setEditingCostId(null);
        else cancelAdding();
    };
    const { formRef, onFormKeyDown, cancelForm } = useFormKeyboardInteraction(
        isAdding || editingCostId !== null,
        cancelOpenForm,
    );

    const saveNewCost = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const validationError = validate(newCost);
        if (validationError) {
            setFormError(validationError);
            return;
        }

        setIsSaving(true);
        setFormError(null);
        try {
            const created = await createPlannedCost(
                trip.id,
                toRequest(newCost),
            );
            setCosts((current) => [...current, created]);
            cancelAdding();
        } catch (exception) {
            setFormError(
                exception instanceof Error && exception.message
                    ? exception.message
                    : "Could not save this planned cost.",
            );
        } finally {
            setIsSaving(false);
        }
    };

    const startEditing = (cost: PlannedCost) => {
        setIsAdding(false);
        setAddingForCategory(null);
        setEditingCostId(cost.id);
        setEditingCost({
            name: cost.name === "Cost item" ? "" : cost.name,
            category: cost.category ?? "",
            amount: cost.amount.toString(),
        });
        setFormError(null);
    };

    const saveEdit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingCostId) return;
        const validationError = validate(editingCost);
        if (validationError) {
            setFormError(validationError);
            return;
        }

        setIsSaving(true);
        setFormError(null);
        try {
            const updated = await updatePlannedCost(
                trip.id,
                editingCostId,
                toRequest(editingCost),
            );
            setCosts((current) =>
                current.map((cost) =>
                    cost.id === updated.id ? updated : cost,
                ),
            );
            setEditingCostId(null);
        } catch (exception) {
            setFormError(
                exception instanceof Error && exception.message
                    ? exception.message
                    : "Could not save these changes.",
            );
        } finally {
            setIsSaving(false);
        }
    };

    const commitDelete = async (cost: PlannedCost) => {
        try {
            await deletePlannedCost(trip.id, cost.id);
        } catch {
            setCosts((current) => [...current, cost]);
            setError("Could not delete this planned cost. It was restored.");
        } finally {
            setPendingDeletion((current) =>
                current?.cost.id === cost.id ? null : current,
            );
        }
    };

    const deleteCost = (cost: PlannedCost) => {
        if (pendingDeletion) {
            if (deleteTimerRef.current !== null)
                window.clearTimeout(deleteTimerRef.current);
            void commitDelete(pendingDeletion.cost);
        }

        setCosts((current) =>
            current.filter((currentCost) => currentCost.id !== cost.id),
        );
        setPendingDeletion({ cost });
        deleteTimerRef.current = window.setTimeout(() => {
            void commitDelete(cost);
            deleteTimerRef.current = null;
        }, 5000);
    };

    const undoDelete = () => {
        if (!pendingDeletion) return;
        if (deleteTimerRef.current !== null)
            window.clearTimeout(deleteTimerRef.current);
        setCosts((current) => [...current, pendingDeletion.cost]);
        setPendingDeletion(null);
        deleteTimerRef.current = null;
    };

    /** Creates an actual expense from a plan, then asks the sibling expense section to reload. */
    const copyToExpenses = async (cost: PlannedCost) => {
        setCopyingCostId(cost.id);
        setError(null);
        try {
            const expense = await createExpense(trip.id, {
                name: cost.name,
                category:
                    cost.category === "EmergencyBuffer" ? null : cost.category,
                amount: cost.amount,
                expenseDate: localToday(),
                plannedCostId: cost.id,
            });
            setCosts((current) =>
                current.map((currentCost) =>
                    currentCost.id === cost.id
                        ? {
                              ...currentCost,
                              expenseAdded: true,
                              expenseId: expense.id,
                          }
                        : currentCost,
                ),
            );
            onExpenseAdded();
        } catch {
            setError("Could not add this planned cost to expenses.");
        } finally {
            setCopyingCostId(null);
        }
    };

    /** Removes the one expense created from a planned cost and makes that plan available again. */
    const undoExpenseAdded = async (cost: PlannedCost) => {
        if (!cost.expenseId) {
            setError("Could not find the linked expense to undo.");
            return;
        }

        setUndoingExpenseCostId(cost.id);
        setError(null);
        try {
            await deleteExpense(trip.id, cost.expenseId);
            setCosts((current) =>
                current.map((currentCost) =>
                    currentCost.id === cost.id
                        ? {
                              ...currentCost,
                              expenseAdded: false,
                              expenseId: null,
                          }
                        : currentCost,
                ),
            );
            onExpenseAdded();
        } catch {
            setError("Could not undo the expense addition.");
        } finally {
            setUndoingExpenseCostId(null);
        }
    };

    /** Shared inline form used by the add and edit flows. */
    const form = (
        cost: PlannedCostForm,
        submit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>,
        editing = false,
    ) => (
        <form
            ref={formRef}
            className="budget-item-form form-surface"
            onKeyDown={onFormKeyDown}
            onSubmit={submit}
        >
            <label>
                <span className="field-label">Name</span>
                <input
                    value={cost.name}
                    onChange={(event) =>
                        updateForm("name", event.target.value, editing)
                    }
                    placeholder="Cost item"
                />
            </label>
            <div className="form-row">
                <label>
                    <span className="field-label field-label-required">
                        Amount ({trip.currency})
                    </span>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={cost.amount}
                        onChange={(event) =>
                            updateForm("amount", event.target.value, editing)
                        }
                        required
                    />
                </label>
                <label>
                    <span className="field-label">Category</span>
                    <select
                        value={cost.category}
                        onChange={(event) =>
                            updateForm("category", event.target.value, editing)
                        }
                    >
                        <option value="">Not specified</option>
                        {plannedCostCategories.map((category) => (
                            <option key={category.value} value={category.value}>
                                {category.label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            {formError && <p className="form-error">{formError}</p>}
            <div className="form-actions">
                <button
                    className="text-button"
                    type="button"
                    onClick={cancelForm}
                >
                    Cancel
                </button>
                <button
                    className="primary-button"
                    type="submit"
                    disabled={isSaving}
                >
                    {isSaving ? "Saving…" : editing ? "Save changes" : "Save"}
                </button>
            </div>
        </form>
    );

    const totalPlannedCosts = costs.reduce(
        (total, cost) => total + cost.amount,
        0,
    );
    const theoreticalRemaining =
        trip.budget === null ? null : trip.budget - totalPlannedCosts;

    return (
        <section className="detail-section budget-section">
            <div className="section-title-row">
                <h3>Planned budget</h3>
                <button
                    className="primary-button"
                    type="button"
                    onClick={() => startAdding()}
                >
                    Add planned cost
                </button>
            </div>
            <div className="section-overview">
                <div>
                    <span>Target budget</span>
                    <strong>
                        {trip.budget === null
                            ? "Not set"
                            : formatMoney(trip.budget, trip.currency)}
                    </strong>
                </div>
                <div>
                    <span>Planned spending</span>
                    <strong>
                        {formatMoney(totalPlannedCosts, trip.currency)}
                    </strong>
                </div>
                {theoreticalRemaining !== null && (
                    <div
                        className={
                            theoreticalRemaining < 0 ? "over-budget" : ""
                        }
                    >
                        <span>
                            {theoreticalRemaining < 0
                                ? "Over budget"
                                : "Remaining"}
                        </span>
                        <strong>
                            {formatMoney(
                                Math.abs(theoreticalRemaining),
                                trip.currency,
                            )}
                        </strong>
                    </div>
                )}
            </div>
            {isAdding && !addingForCategory && form(newCost, saveNewCost)}
            {isLoading && (
                <p className="detail-message">Loading planned costs…</p>
            )}
            {error && <p className="detail-message form-error">{error}</p>}
            {pendingDeletion && (
                <button
                    className="undo-toast"
                    type="button"
                    onClick={undoDelete}
                >
                    <span>Planned cost deleted.</span>
                    <strong>Undo</strong>
                </button>
            )}
            {!isLoading && !error && costs.length === 0 && (
                <p className="detail-message">No planned costs yet.</p>
            )}
            {!isLoading &&
                !error &&
                [
                    ...plannedCostCategories,
                    { value: null, label: "Uncategorised" },
                ].map((category) => {
                    const categoryCosts = costs.filter(
                        (cost) => cost.category === category.value,
                    );
                    if (categoryCosts.length === 0) return null;
                    const categoryTotal = categoryCosts.reduce(
                        (total, cost) => total + cost.amount,
                        0,
                    );

                    return (
                        <section
                            className="budget-category"
                            key={category.value ?? "uncategorised"}
                        >
                            <div className="budget-category-heading">
                                <div className="budget-category-title">
                                    <h4>{category.label}</h4>
                                    {category.value && (
                                        <button
                                            className="icon-button"
                                            type="button"
                                            onClick={() =>
                                                startAdding(category.value)
                                            }
                                            aria-label={`Add a planned cost to ${category.label}`}
                                        >
                                            <Plus size={17} />
                                        </button>
                                    )}
                                </div>
                                <strong>
                                    {formatMoney(categoryTotal, trip.currency)}
                                </strong>
                            </div>
                            <ul className="list-items">
                                {categoryCosts.map((cost) =>
                                    editingCostId === cost.id ? (
                                        <li
                                            className="budget-item-editing"
                                            key={cost.id}
                                        >
                                            {form(editingCost, saveEdit, true)}
                                        </li>
                                    ) : (
                                        <li className="list-row" key={cost.id}>
                                            <div className="budget-item-description">
                                                <div className="budget-item-primary">
                                                    <strong>{cost.name}</strong>
                                                    <strong className="budget-item-amount">
                                                        {formatMoney(
                                                            cost.amount,
                                                            trip.currency,
                                                        )}
                                                    </strong>
                                                </div>
                                                {cost.category !==
                                                    "EmergencyBuffer" &&
                                                    (cost.expenseAdded ? (
                                                        <span className="planned-cost-expense-added">
                                                            Added ·{" "}
                                                            <button
                                                                className="text-button"
                                                                type="button"
                                                                onClick={() =>
                                                                    void undoExpenseAdded(
                                                                        cost,
                                                                    )
                                                                }
                                                                disabled={
                                                                    undoingExpenseCostId ===
                                                                    cost.id
                                                                }
                                                            >
                                                                {undoingExpenseCostId ===
                                                                cost.id
                                                                    ? "Undoing…"
                                                                    : "Undo"}
                                                            </button>
                                                        </span>
                                                    ) : (
                                                        <button
                                                            className="text-button planned-cost-expense-action"
                                                            type="button"
                                                            onClick={() =>
                                                                void copyToExpenses(
                                                                    cost,
                                                                )
                                                            }
                                                            disabled={
                                                                copyingCostId ===
                                                                cost.id
                                                            }
                                                        >
                                                            {copyingCostId ===
                                                            cost.id
                                                                ? "Adding…"
                                                                : "Add expense"}
                                                        </button>
                                                    ))}
                                            </div>
                                            <div className="item-actions">
                                                <button
                                                    className="icon-button"
                                                    type="button"
                                                    onClick={() =>
                                                        startEditing(cost)
                                                    }
                                                    aria-label={`Edit ${cost.name}`}
                                                >
                                                    <Pencil size={17} />
                                                </button>
                                                <button
                                                    className="icon-button danger-button"
                                                    type="button"
                                                    onClick={() =>
                                                        deleteCost(cost)
                                                    }
                                                    aria-label={`Delete ${cost.name}`}
                                                >
                                                    <Trash2 size={17} />
                                                </button>
                                            </div>
                                        </li>
                                    ),
                                )}
                            </ul>
                            {isAdding &&
                                category.value !== null &&
                                addingForCategory === category.value &&
                                form(newCost, saveNewCost)}
                        </section>
                    );
                })}
        </section>
    );
}
