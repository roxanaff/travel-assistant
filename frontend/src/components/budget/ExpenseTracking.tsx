// Expense half of the budget page: manages amounts already spent, including
// optional links back to planned costs. Expenses are separate from those plans.
import { useEffect, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { createExpense, deleteExpense as deleteExpenseApi, getExpenses, updateExpense } from "../../api/expensesApi";
import { useNavigationCardFocus } from "../../utils/useNavigationCardFocus";
import { expenseCategories, type Expense, type NewExpenseForm } from "../../types/expense";
import { localToday } from "../../utils/localToday";
import { ExpenseFormFields } from "./ExpenseFormFields";
import { formatDate, formatMoney } from "../../utils/format";
import { SectionCard } from "../shared/SectionCard";
import { SectionHeader } from "../shared/SectionHeader";
import { FormActions, FormSurface } from "../shared/FormPrimitives";
import { FormDiscardDialog } from "../shared/FormDiscardDialog";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { GroupHeading } from "../shared/GroupHeading";
import { GroupAddButton } from "../shared/GroupAddButton";
import { GroupingControl } from "../shared/GroupingControl";
import { UndoToast } from "../shared/UndoToast";
import { normalizeMoneyInput } from "../../utils/numberInput";
import { useFormKeyboardInteraction } from "../../utils/useFormKeyboardInteraction";
import type { Trip } from "../../types/trip";

import "./ExpenseTracking.css";
import "./BudgetItem.css";

type ExpenseTrackingProps = {
    trip: Trip;
    onFormOpenChange: (isOpen: boolean) => void;
    refreshKey: number;
};

type PendingDeletion = {
    item: Expense;
};

type ExpenseGrouping = "category" | "date" | "none";

type ExpenseGroup = {
    label: string;
    category: string | null;
    date: string | null;
    expenses: Expense[];
};

type ExpenseAddTarget = {
    category: string | null;
    date: string | null;
};

const createEmptyExpenseForm = (): NewExpenseForm => ({
    name: "",
    category: "",
    amount: "",
    expenseDate: localToday(),
    plannedCostId: null,
});

const getExpenseCategoryLabel = (category: string | null) =>
    expenseCategories.find((option) => option.value === category)?.label ?? "Uncategorised";

/** Sorts dated expenses newest first, with undated entries after them. */
const sortExpenses = (expenses: Expense[]) =>
    [...expenses].sort(
        (first, second) =>
            Number(Boolean(second.expenseDate)) - Number(Boolean(first.expenseDate)) ||
            (second.expenseDate ?? "").localeCompare(first.expenseDate ?? "") ||
            first.createdAtUtc.localeCompare(second.createdAtUtc),
    );

/**
 * Manages actual expenses, including inline edits, grouping, and a five-second deletion Undo window.
 * It reloads when PlannedBudget converts an estimated cost into an expense.
 */
export function ExpenseTracking({ trip, onFormOpenChange, refreshKey }: ExpenseTrackingProps) {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const highlightedExpenseId = useNavigationCardFocus({
        availableIds: expenses.map((expense) => expense.id),
        elementIdPrefix: "expense",
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [addingForGroup, setAddingForGroup] = useState<ExpenseAddTarget | null>(null);
    const [newExpense, setNewExpense] = useState<NewExpenseForm>(createEmptyExpenseForm());
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    const [editingExpense, setEditingExpense] = useState<NewExpenseForm>(createEmptyExpenseForm());
    const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
    const [linkedExpenseToDelete, setLinkedExpenseToDelete] = useState<Expense | null>(null);
    const [grouping, setGrouping] = useState<ExpenseGrouping>("category");
    const deleteTimerRef = useRef<number | null>(null);

    useEffect(() => {
        onFormOpenChange(isAdding || editingExpenseId !== null);
        return () => onFormOpenChange(false);
    }, [editingExpenseId, isAdding, onFormOpenChange]);

    useEffect(() => {
        const loadExpenses = async () => {
            try {
                setExpenses(await getExpenses(trip.id));
            } catch {
                setError("Could not load expenses.");
            } finally {
                setIsLoading(false);
            }
        };

        void loadExpenses();
    }, [refreshKey, trip.id]);

    const updateForm = (field: keyof NewExpenseForm, value: string, editing = false) => {
        if (field === "amount") {
            const normalized = normalizeMoneyInput(value);
            if (normalized === null) return;
            value = normalized;
        }

        const update = (current: NewExpenseForm) => ({
            ...current,
            [field]: value,
        });
        if (editing) setEditingExpense(update);
        else setNewExpense(update);
    };

    /** Converts editable browser strings into the API's expense payload. */
    const toRequest = (expense: NewExpenseForm) => ({
        name: expense.name.trim(),
        category: expense.category || null,
        amount: Number(expense.amount),
        expenseDate: expense.expenseDate || null,
        plannedCostId: expense.plannedCostId,
    });

    const validate = (expense: NewExpenseForm) => {
        if (!expense.amount || Number(expense.amount) <= 0) return "Enter an amount greater than zero.";
        return null;
    };

    const cancelAdding = () => {
        setIsAdding(false);
        setAddingForGroup(null);
        setFormError(null);
    };

    const startAdding = (initialValues: Partial<NewExpenseForm> = {}, target: ExpenseAddTarget | null = null) => {
        setEditingExpenseId(null);
        setNewExpense({ ...createEmptyExpenseForm(), ...initialValues });
        setAddingForGroup(target);
        setFormError(null);
        setIsAdding(true);
    };

    const cancelOpenForm = () => {
        if (editingExpenseId !== null) setEditingExpenseId(null);
        else cancelAdding();
    };
    const { formRef, onFormKeyDown, cancelForm, isConfirmingDiscard, cancelDiscardConfirmation, discardChanges } =
        useFormKeyboardInteraction(isAdding || editingExpenseId !== null, cancelOpenForm);

    const saveNewExpense = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const validationError = validate(newExpense);
        if (validationError) {
            setFormError(validationError);
            return;
        }

        setIsSaving(true);
        setFormError(null);
        try {
            const created = await createExpense(trip.id, toRequest(newExpense));
            setExpenses((current) => [...current, created]);
            setNewExpense(createEmptyExpenseForm());
            cancelAdding();
        } catch (exception) {
            setFormError(
                exception instanceof Error && exception.message ? exception.message : "Could not save this expense.",
            );
        } finally {
            setIsSaving(false);
        }
    };

    const startEditing = (expense: Expense) => {
        setIsAdding(false);
        setAddingForGroup(null);
        setEditingExpenseId(expense.id);
        setEditingExpense({
            name: expense.name,
            category: expense.category ?? "",
            amount: expense.amount.toString(),
            expenseDate: expense.expenseDate ?? "",
            plannedCostId: expense.plannedCostId,
        });
        setFormError(null);
    };

    const saveEdit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingExpenseId) return;
        const validationError = validate(editingExpense);
        if (validationError) {
            setFormError(validationError);
            return;
        }

        setIsSaving(true);
        setFormError(null);
        try {
            const updated = await updateExpense(trip.id, editingExpenseId, toRequest(editingExpense));
            setExpenses((current) => current.map((expense) => (expense.id === updated.id ? updated : expense)));
            setEditingExpenseId(null);
        } catch (exception) {
            setFormError(
                exception instanceof Error && exception.message ? exception.message : "Could not save these changes.",
            );
        } finally {
            setIsSaving(false);
        }
    };

    /** Permanently deletes an expense once its Undo window has elapsed. */
    const commitDelete = async (expense: Expense) => {
        try {
            const wasDeleted = await deleteExpenseApi(trip.id, expense.id);

            // A linked planned-cost Undo may already have deleted this same expense.
            // Treat that result as a successful final state rather than restoring stale data.
            if (!wasDeleted) return;
        } catch {
            setExpenses((current) => [...current, expense]);
            setActionError("Could not delete this expense. It was restored.");
        } finally {
            setPendingDeletion((current) => (current?.item.id === expense.id ? null : current));
        }
    };

    /** Removes an expense optimistically and holds its data locally until the Undo timer ends. */
    const deleteExpense = (expense: Expense) => {
        setActionError(null);
        if (pendingDeletion) {
            if (deleteTimerRef.current !== null) window.clearTimeout(deleteTimerRef.current);
            void commitDelete(pendingDeletion.item);
        }

        setExpenses((current) => current.filter((item) => item.id !== expense.id));
        setPendingDeletion({ item: expense });
        deleteTimerRef.current = window.setTimeout(() => {
            void commitDelete(expense);
            deleteTimerRef.current = null;
        }, 5000);
    };

    const requestDeleteExpense = (expense: Expense) => {
        if (expense.bookingId || expense.plannedCostId) {
            setLinkedExpenseToDelete(expense);
            return;
        }

        deleteExpense(expense);
    };

    const confirmLinkedExpenseDeletion = () => {
        if (!linkedExpenseToDelete) return;
        const expense = linkedExpenseToDelete;
        setLinkedExpenseToDelete(null);
        setActionError(null);
        setExpenses((current) => current.filter((item) => item.id !== expense.id));
        void commitDelete(expense);
    };

    const undoDelete = () => {
        if (!pendingDeletion) return;
        if (deleteTimerRef.current !== null) window.clearTimeout(deleteTimerRef.current);
        setExpenses((current) => [...current, pendingDeletion.item]);
        setPendingDeletion(null);
        deleteTimerRef.current = null;
    };

    /** Shared inline form used by the create and edit flows. */
    const form = (
        expense: NewExpenseForm,
        submit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>,
        editing = false,
    ) => (
        <FormSurface formRef={formRef} className="budget-item-form" onKeyDown={onFormKeyDown} onSubmit={submit}>
            <ExpenseFormFields
                value={expense}
                currency={trip.currency}
                onChange={(field, value) => updateForm(field, value, editing)}
            />
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

    const actualSpending = expenses.reduce((total, expense) => total + expense.amount, 0);
    const actualRemaining = trip.budget === null ? null : trip.budget - actualSpending;

    const categoryGroups: ExpenseGroup[] = [
        ...expenseCategories.map((category) => ({
            label: category.label,
            category: category.value,
            date: null,
            expenses: expenses.filter((expense) => expense.category === category.value),
        })),
        {
            label: "Uncategorised",
            category: null,
            date: null,
            expenses: expenses.filter((expense) => expense.category === null),
        },
    ].filter((group) => group.expenses.length > 0);

    const dayGroups: ExpenseGroup[] = [
        ...Array.from(
            new Set(expenses.map((expense) => expense.expenseDate).filter((date): date is string => date !== null)),
        )
            .sort((first, second) => second.localeCompare(first))
            .map((date) => ({
                label: formatDate(date),
                date,
                category: null,
                expenses: sortExpenses(expenses.filter((expense) => expense.expenseDate === date)),
            })),
        {
            label: "Undated",
            date: null,
            category: null,
            expenses: sortExpenses(expenses.filter((expense) => expense.expenseDate === null)),
        },
    ].filter((group) => group.expenses.length > 0);

    const groups =
        grouping === "category"
            ? categoryGroups
            : grouping === "date"
              ? dayGroups
              : [
                    {
                        label: "",
                        category: null,
                        date: null,
                        expenses: sortExpenses(expenses),
                    },
                ];

    return (
        <SectionCard className="budget-section">
            <SectionHeader
                title="Expenses"
                headingLevel={3}
                actions={
                    <button className="primary-button" type="button" onClick={() => startAdding()}>
                        Add expense
                    </button>
                }
            />
            <div className="section-overview">
                <div>
                    <span>Target budget</span>
                    <strong>{trip.budget === null ? "Not set" : formatMoney(trip.budget, trip.currency)}</strong>
                </div>
                <div>
                    <span>Total spent</span>
                    <strong>{formatMoney(actualSpending, trip.currency)}</strong>
                </div>
                {actualRemaining !== null && (
                    <div className={actualRemaining < 0 ? "over-budget" : ""}>
                        <span>{actualRemaining < 0 ? "Over budget" : "Actual remaining"}</span>
                        <strong>{formatMoney(Math.abs(actualRemaining), trip.currency)}</strong>
                    </div>
                )}
            </div>
            <div className="expense-grouping-control">
                <GroupingControl value={grouping} onChange={setGrouping}>
                    <option value="none">Ungrouped</option>
                    <option value="category">Category</option>
                    <option value="date">Date</option>
                </GroupingControl>
            </div>
            {isAdding && !addingForGroup && form(newExpense, saveNewExpense)}
            {isLoading && <p className="detail-message">Loading expenses…</p>}
            {error && <p className="detail-message form-error">{error}</p>}
            {actionError && <p className="detail-message form-error">{actionError}</p>}
            {pendingDeletion && <UndoToast message="Expense deleted." onUndo={undoDelete} />}
            {!isLoading && !error && expenses.length === 0 && <p className="detail-message">No expenses yet.</p>}
            {!isLoading &&
                !error &&
                groups.map((group) => {
                    const subtotal = group.expenses.reduce((total, expense) => total + expense.amount, 0);
                    const isAddingToGroup =
                        isAdding && addingForGroup?.category === group.category && addingForGroup?.date === group.date;

                    return (
                        <section className="budget-category" key={group.label}>
                            {grouping !== "none" && (
                                <GroupHeading
                                    title={group.label}
                                    actions={
                                        (grouping === "category" || grouping === "date") && (
                                            <GroupAddButton
                                                label={`Add an expense to ${group.label}`}
                                                onClick={() =>
                                                    startAdding(
                                                        {
                                                            category:
                                                                grouping === "category" ? (group.category ?? "") : "",
                                                            expenseDate:
                                                                grouping === "date" ? (group.date ?? "") : localToday(),
                                                        },
                                                        {
                                                            category: group.category,
                                                            date: group.date,
                                                        },
                                                    )
                                                }
                                            />
                                        )
                                    }
                                    summary={formatMoney(subtotal, trip.currency)}
                                />
                            )}
                            {isAddingToGroup && form(newExpense, saveNewExpense)}
                            <ul className="list-items">
                                {group.expenses.map((expense) =>
                                    editingExpenseId === expense.id ? (
                                        <li className="budget-item-editing" key={expense.id}>
                                            {form(editingExpense, saveEdit, true)}
                                        </li>
                                    ) : (
                                        <li
                                            id={`expense-${expense.id}`}
                                            className={`list-row${highlightedExpenseId === expense.id ? " budget-record-highlighted" : ""}`}
                                            key={expense.id}
                                        >
                                            <div className="budget-item-description">
                                                <div className="budget-item-primary">
                                                    <strong>{expense.name}</strong>
                                                    <strong className="budget-item-amount">
                                                        {formatMoney(expense.amount, trip.currency)}
                                                    </strong>
                                                </div>
                                                {grouping === "category" && expense.expenseDate && (
                                                    <span>{formatDate(expense.expenseDate)}</span>
                                                )}
                                                {grouping === "date" && (
                                                    <span>{getExpenseCategoryLabel(expense.category)}</span>
                                                )}
                                                {grouping === "none" && (expense.expenseDate || expense.category) && (
                                                    <span>
                                                        {[
                                                            expense.category
                                                                ? getExpenseCategoryLabel(expense.category)
                                                                : null,
                                                            expense.expenseDate
                                                                ? formatDate(expense.expenseDate)
                                                                : null,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(" · ")}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="item-actions">
                                                <button
                                                    className="icon-button"
                                                    type="button"
                                                    onClick={() => startEditing(expense)}
                                                    aria-label={`Edit ${expense.name}`}
                                                >
                                                    <Pencil size={17} />
                                                </button>
                                                <button
                                                    className="icon-button danger-button"
                                                    type="button"
                                                    onClick={() => requestDeleteExpense(expense)}
                                                    aria-label={`Delete ${expense.name}`}
                                                >
                                                    <Trash2 size={17} />
                                                </button>
                                            </div>
                                        </li>
                                    ),
                                )}
                            </ul>
                        </section>
                    );
                })}
            <ConfirmDialog
                isOpen={linkedExpenseToDelete !== null}
                title="Delete linked expense?"
                confirmLabel="Delete expense"
                onCancel={() => setLinkedExpenseToDelete(null)}
                onConfirm={confirmLinkedExpenseDeletion}
            >
                <p>
                    Delete {linkedExpenseToDelete?.name}? Its linked
                    {linkedExpenseToDelete?.bookingId && linkedExpenseToDelete?.plannedCostId
                        ? " booking and planned cost will be kept and unlinked."
                        : linkedExpenseToDelete?.bookingId
                            ? " booking will be kept and unlinked."
                            : " planned cost will be kept and unlinked."}
                </p>
            </ConfirmDialog>
            <FormDiscardDialog
                isOpen={isConfirmingDiscard}
                onCancel={cancelDiscardConfirmation}
                onConfirm={discardChanges}
            />
        </SectionCard>
    );
}
