// Planned-cost half of the budget page: manages expected amounts and can
// create a related expense when the traveler records actual spending.
import { useEffect, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { createPlannedCost, deletePlannedCost, getPlannedCosts, updatePlannedCost } from "../../api/plannedCostsApi";
import { createExpense, unlinkPlannedCostExpense } from "../../api/expensesApi";
import { unlinkBookingPlannedCost } from "../../api/bookingsApi";
import type { Trip } from "../../types/trip";
import {
    createEmptyPlannedCostForm,
    plannedCostCategories,
    type PlannedCost,
    type PlannedCostCategory,
    type PlannedCostForm,
} from "../../types/plannedCost";
import { formatMoney } from "../../utils/format";
import { SectionCard } from "../shared/SectionCard";
import { SectionHeader } from "../shared/SectionHeader";
import { FieldLabel, FieldRow, FormActions, FormSurface } from "../shared/FormPrimitives";
import { FormDiscardDialog } from "../shared/FormDiscardDialog";
import { GroupHeading } from "../shared/GroupHeading";
import { GroupAddButton } from "../shared/GroupAddButton";
import { LinkedRecordWarnings } from "../shared/LinkedRecordWarnings";
import { useLinkedRecordReviews } from "../../utils/useLinkedRecordReviews";
import { UndoToast } from "../shared/UndoToast";
import { normalizeMoneyInput } from "../../utils/numberInput";
import { useFormKeyboardInteraction } from "../../utils/useFormKeyboardInteraction";
import { localToday } from "../../utils/localToday";
import { useNavigationCardFocus } from "../../utils/useNavigationCardFocus";
import { BudgetRecordLink } from "./BudgetRecordLink";

import "./PlannedBudget.css";
import "./BudgetItem.css";

type PlannedBudgetProps = {
    trip: Trip;
    onFormOpenChange: (isOpen: boolean) => void;
    onExpenseAdded: () => void;
    refreshKey?: number;
};

type PendingDeletion = {
    cost: PlannedCost;
};

/**
 * Manages estimated spending by category and can copy one plan into actual expenses exactly once.
 */
export function PlannedBudget({ trip, onFormOpenChange, onExpenseAdded, refreshKey = 0 }: PlannedBudgetProps) {
    const [costs, setCosts] = useState<PlannedCost[]>([]);
    const linkedReviews = useLinkedRecordReviews(trip.id, "PlannedCost", costs);
    const highlightedCostId = useNavigationCardFocus({
        availableIds: costs.map((cost) => cost.id),
        elementIdPrefix: "planned-cost",
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [newCost, setNewCost] = useState<PlannedCostForm>(createEmptyPlannedCostForm());
    const [isAdding, setIsAdding] = useState(false);
    const [addingForCategory, setAddingForCategory] = useState<PlannedCostCategory | null>(null);
    const [editingCostId, setEditingCostId] = useState<string | null>(null);
    const [editingRevision, setEditingRevision] = useState<string>();
    const [expenseChangeVersion, setExpenseChangeVersion] = useState(0);
    const [editingCost, setEditingCost] = useState<PlannedCostForm>(createEmptyPlannedCostForm());
    const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
    const [copyingCostId, setCopyingCostId] = useState<string | null>(null);
    const deleteTimerRef = useRef<number | null>(null);

    useEffect(() => {
        onFormOpenChange(isAdding || editingCostId !== null);
        return () => onFormOpenChange(false);
    }, [editingCostId, isAdding, onFormOpenChange]);

    useEffect(() => {
        let isCurrent = true;
        setIsLoading(true);
        const loadCosts = async () => {
            try {
                const loaded = await getPlannedCosts(trip.id);
                if (isCurrent) setCosts(loaded);
            } catch {
                if (isCurrent) setError("Could not load planned costs.");
            } finally {
                if (isCurrent) setIsLoading(false);
            }
        };

        void loadCosts();
        return () => { isCurrent = false; };
    }, [trip.id, refreshKey, expenseChangeVersion]);

    const updateForm = (field: keyof PlannedCostForm, value: string, editing = false) => {
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
        if (!cost.amount || Number(cost.amount) <= 0) return "Enter an amount greater than zero.";
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
    const { formRef, onFormKeyDown, cancelForm, isConfirmingDiscard, cancelDiscardConfirmation, discardChanges } =
        useFormKeyboardInteraction(
            editingCostId ?? (isAdding ? "add" : null),
            cancelOpenForm,
            editingCostId !== null ? editingCost : newCost,
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
            const created = await createPlannedCost(trip.id, toRequest(newCost));
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
        setEditingRevision(cost.bookingId ? cost.revision : undefined);
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
            const updated = await updatePlannedCost(trip.id, editingCostId, {
                ...toRequest(editingCost),
                ...(editingRevision ? { expectedRevision: editingRevision } : {}),
            });
            setCosts((current) => current.map((cost) => (cost.id === updated.id ? updated : cost)));
            if (updated.expenseId) onExpenseAdded();
            setEditingCostId(null);
        } catch (exception) {
            setFormError(
                exception instanceof Error && exception.message ? exception.message : "Could not save these changes.",
            );
        } finally {
            setIsSaving(false);
        }
    };

    const commitDelete = async (cost: PlannedCost) => {
        try {
            await deletePlannedCost(trip.id, cost.id);
            if (cost.expenseAdded) onExpenseAdded();
        } catch {
            setCosts((current) => [...current, cost]);
            setError("Could not delete this planned cost. It was restored.");
        } finally {
            setPendingDeletion((current) => (current?.cost.id === cost.id ? null : current));
        }
    };

    const deleteCost = (cost: PlannedCost) => {
        if (pendingDeletion) {
            if (deleteTimerRef.current !== null) window.clearTimeout(deleteTimerRef.current);
            void commitDelete(pendingDeletion.cost);
        }

        setCosts((current) => current.filter((currentCost) => currentCost.id !== cost.id));
        setPendingDeletion({ cost });
        deleteTimerRef.current = window.setTimeout(() => {
            void commitDelete(cost);
            deleteTimerRef.current = null;
        }, 5000);
    };

    const undoDelete = () => {
        if (!pendingDeletion) return;
        if (deleteTimerRef.current !== null) window.clearTimeout(deleteTimerRef.current);
        setCosts((current) => [...current, pendingDeletion.cost]);
        setPendingDeletion(null);
        deleteTimerRef.current = null;
    };

    const refreshRelatedCosts = () => {
        setIsLoading(true);
        setExpenseChangeVersion((version) => version + 1);
        onExpenseAdded();
    };

    /** Creates an actual expense from a plan, then asks the sibling expense section to reload. */
    const copyToExpenses = async (cost: PlannedCost) => {
        setCopyingCostId(cost.id);
        setError(null);
        try {
            const expense = await createExpense(trip.id, {
                name: cost.name,
                category: cost.category === "EmergencyBuffer" ? null : cost.category,
                amount: cost.amount,
                expenseDate: localToday(),
                plannedCostId: cost.id,
                ...(cost.revision ? { expectedRevision: cost.revision } : {}),
            });
            setCosts((current) =>
                current.map((currentCost) =>
                    currentCost.id === cost.id
                        ? {
                              ...currentCost,
                              expenseAdded: true,
                              expenseId: expense.id,
                              expenseName: expense.name,
                              revision: expense.revision ?? currentCost.revision,
                          }
                        : currentCost,
                ),
            );
            onExpenseAdded();
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : "Could not add this planned cost to expenses.");
        } finally {
            setCopyingCostId(null);
        }
    };

    /** Shared inline form used by the add and edit flows. */
    const form = (
        cost: PlannedCostForm,
        submit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>,
        editing = false,
    ) => (
        <FormSurface formRef={formRef} className="budget-item-form" onKeyDown={onFormKeyDown} onSubmit={submit}>
            <label>
                <FieldLabel>Name</FieldLabel>
                <input
                    value={cost.name}
                    onChange={(event) => updateForm("name", event.target.value, editing)}
                    placeholder="Cost item"
                />
            </label>
            <FieldRow>
                <label>
                    <FieldLabel required>Amount ({trip.currency})</FieldLabel>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={cost.amount}
                        onChange={(event) => updateForm("amount", event.target.value, editing)}
                        required
                    />
                </label>
                <label>
                    <FieldLabel>Category</FieldLabel>
                    <select
                        value={cost.category}
                        onChange={(event) => updateForm("category", event.target.value, editing)}
                    >
                        <option value="">Not specified</option>
                        {plannedCostCategories.map((category) => (
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

    const totalPlannedCosts = costs.reduce((total, cost) => total + cost.amount, 0);
    const theoreticalRemaining = trip.budget === null ? null : trip.budget - totalPlannedCosts;

    return (
        <SectionCard className="budget-section">
            <SectionHeader
                title="Planned budget"
                headingLevel={3}
                actions={
                    <button className="primary-button" type="button" onClick={() => startAdding()}>
                        Add planned cost
                    </button>
                }
            />
            <div className="section-overview">
                <div>
                    <span>Target budget</span>
                    <strong>{trip.budget === null ? "Not set" : formatMoney(trip.budget, trip.currency)}</strong>
                </div>
                <div>
                    <span>Planned spending</span>
                    <strong>{formatMoney(totalPlannedCosts, trip.currency)}</strong>
                </div>
                {theoreticalRemaining !== null && (
                    <div className={theoreticalRemaining < 0 ? "over-budget" : ""}>
                        <span>{theoreticalRemaining < 0 ? "Over budget" : "Remaining"}</span>
                        <strong>{formatMoney(Math.abs(theoreticalRemaining), trip.currency)}</strong>
                    </div>
                )}
            </div>
            {isAdding && !addingForCategory && form(newCost, saveNewCost)}
            {isLoading && <p className="detail-message">Loading planned costs…</p>}
            {error && <p className="detail-message form-error">{error}</p>}
            {linkedReviews.error && <p className="form-error">{linkedReviews.error}</p>}
            {pendingDeletion && <UndoToast message="Planned cost deleted." onUndo={undoDelete} />}
            {!isLoading && !error && costs.length === 0 && <p className="detail-message">No planned costs yet.</p>}
            {!isLoading &&
                !error &&
                [...plannedCostCategories, { value: null, label: "Uncategorised" }].map((category) => {
                    const categoryCosts = costs.filter((cost) => cost.category === category.value);
                    if (categoryCosts.length === 0) return null;
                    const categoryTotal = categoryCosts.reduce((total, cost) => total + cost.amount, 0);

                    return (
                        <section className="budget-category" key={category.value ?? "uncategorised"}>
                            <GroupHeading
                                title={category.label}
                                actions={
                                    category.value && (
                                        <GroupAddButton
                                            label={`Add a planned cost to ${category.label}`}
                                            onClick={() => startAdding(category.value)}
                                        />
                                    )
                                }
                                summary={formatMoney(categoryTotal, trip.currency)}
                            />
                            {isAdding &&
                                category.value !== null &&
                                addingForCategory === category.value &&
                                form(newCost, saveNewCost)}
                            <ul className="list-items">
                                {categoryCosts.map((cost) =>
                                    editingCostId === cost.id ? (
                                        <li className="budget-item-editing" key={cost.id}>
                                            {form(editingCost, saveEdit, true)}
                                        </li>
                                    ) : (
                                        <li
                                            id={`planned-cost-${cost.id}`}
                                            className={`list-row${highlightedCostId === cost.id ? " budget-record-highlighted" : ""}`}
                                            key={cost.id}
                                        >
                                            <div className="budget-item-description">
                                                <strong>{cost.name}</strong>
                                                {cost.expenseId ? (
                                                    <BudgetRecordLink
                                                        tripId={trip.id}
                                                        recordId={cost.expenseId}
                                                        name={cost.expenseName}
                                                        label="Expense"
                                                        onUnlink={async () => {
                                                            await unlinkPlannedCostExpense(trip.id, cost.id, cost.expenseId!, "expense");
                                                            refreshRelatedCosts();
                                                        }}
                                                    />
                                                ) : cost.category !== "EmergencyBuffer" && (
                                                    cost.bookingId && !cost.bookingPaid ? (
                                                        <span>Record a payment in Bookings to add an expense.</span>
                                                    ) : (
                                                        <button
                                                            className="text-button planned-cost-expense-action"
                                                            type="button"
                                                            onClick={() => void copyToExpenses(cost)}
                                                            disabled={copyingCostId === cost.id}
                                                        >
                                                            {copyingCostId === cost.id ? "Adding…" : "Add expense"}
                                                        </button>
                                                    )
                                                )}
                                                {cost.bookingId && (
                                                    <BudgetRecordLink
                                                        tripId={trip.id}
                                                        recordId={cost.bookingId}
                                                        name={cost.bookingName}
                                                        label="Booking"
                                                        onUnlink={async () => {
                                                            await unlinkBookingPlannedCost(trip.id, cost.bookingId!, cost.id);
                                                            refreshRelatedCosts();
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            <strong className="budget-item-amount">
                                                {formatMoney(cost.amount, trip.currency)}
                                            </strong>
                                            <div className="item-actions">
                                                <button
                                                    className="icon-button"
                                                    type="button"
                                                    onClick={() => startEditing(cost)}
                                                    aria-label={`Edit ${cost.name}`}
                                                >
                                                    <Pencil size={17} />
                                                </button>
                                                <button
                                                    className="icon-button danger-button"
                                                    type="button"
                                                    onClick={() => deleteCost(cost)}
                                                    aria-label={`Delete ${cost.name}`}
                                                >
                                                    <Trash2 size={17} />
                                                </button>
                                            </div>
                                            <LinkedRecordWarnings
                                                tripId={trip.id}
                                                currency={trip.currency}
                                                reviews={linkedReviews.reviews.filter((review) => review.targetId === cost.id)}
                                                disabled={isSaving || editingCostId !== null || isAdding}
                                                onResolved={async () => {
                                                    const loaded = await getPlannedCosts(trip.id);
                                                    setCosts((current) => current === costs ? loaded : current);
                                                }}
                                            />
                                        </li>
                                    ),
                                )}
                            </ul>
                        </section>
                    );
                })}
            <FormDiscardDialog
                isOpen={isConfirmingDiscard}
                onCancel={cancelDiscardConfirmation}
                onConfirm={discardChanges}
            />
        </SectionCard>
    );
}
