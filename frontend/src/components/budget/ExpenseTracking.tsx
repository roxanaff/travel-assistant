import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import {
    createExpense,
    deleteExpense as deleteExpenseApi,
    getExpenses,
    updateExpense,
} from "../../api/expensesApi";
import type { Expense, NewExpenseForm } from "../../types/expense";
import { formatDate, formatMoney } from "../../utils/format";
import { normalizeMoneyInput } from "../../utils/numberInput";
import { useFormKeyboardInteraction } from "../../utils/useFormKeyboardInteraction";
import type { Trip } from "../../types/trip";

import "./ExpenseTracking.css";
import "./BudgetItem.css";

// This component owns actual spending; planned-budget categories live in their own feature type file.
const expenseCategories = [
    { value: "TravelToFrom", label: "Travel to/from" },
    { value: "Accommodation", label: "Accommodation" },
    { value: "LocalTransport", label: "Local transport" },
    { value: "Food", label: "Food" },
    { value: "ActivitiesAndMuseums", label: "Activities & museums" },
    { value: "BarsAndNightlife", label: "Bars & nightlife" },
    { value: "Shopping", label: "Shopping" },
    { value: "Other", label: "Other" },
] as const;

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

/** Returns today's local calendar date for a newly entered expense. */
const localToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const createEmptyExpenseForm = (): NewExpenseForm => ({
    name: "",
    category: "",
    amount: "",
    expenseDate: localToday(),
    plannedCostId: null,
});

const getExpenseCategoryLabel = (category: string | null) =>
    expenseCategories.find((option) => option.value === category)?.label ??
    "Uncategorised";

/** Sorts dated expenses newest first, with undated entries after them. */
const sortExpenses = (expenses: Expense[]) =>
    [...expenses].sort(
        (first, second) =>
            Number(Boolean(second.expenseDate)) -
                Number(Boolean(first.expenseDate)) ||
            (second.expenseDate ?? "").localeCompare(first.expenseDate ?? "") ||
            first.createdAtUtc.localeCompare(second.createdAtUtc),
    );

/**
 * Manages actual expenses, including inline edits, grouping, and a five-second deletion Undo window.
 * It reloads when PlannedBudget converts an estimated cost into an expense.
 */
export function ExpenseTracking({
    trip,
    onFormOpenChange,
    refreshKey,
}: ExpenseTrackingProps) {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newExpense, setNewExpense] = useState<NewExpenseForm>(
        createEmptyExpenseForm(),
    );
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(
        null,
    );
    const [editingExpense, setEditingExpense] = useState<NewExpenseForm>(
        createEmptyExpenseForm(),
    );
    const [pendingDeletion, setPendingDeletion] =
        useState<PendingDeletion | null>(null);
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

    const updateForm = (
        field: keyof NewExpenseForm,
        value: string,
        editing = false,
    ) => {
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
        if (!expense.amount || Number(expense.amount) <= 0)
            return "Enter an amount greater than zero.";
        return null;
    };

    const cancelAdding = () => {
        setIsAdding(false);
        setFormError(null);
    };

    const startAdding = (initialValues: Partial<NewExpenseForm> = {}) => {
        setEditingExpenseId(null);
        setNewExpense({ ...createEmptyExpenseForm(), ...initialValues });
        setFormError(null);
        setIsAdding(true);
    };

    const cancelOpenForm = () => {
        if (editingExpenseId !== null) setEditingExpenseId(null);
        else cancelAdding();
    };
    const { formRef, onFormKeyDown, cancelForm } = useFormKeyboardInteraction(
        isAdding || editingExpenseId !== null,
        cancelOpenForm,
    );

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
            setIsAdding(false);
        } catch (exception) {
            setFormError(
                exception instanceof Error && exception.message
                    ? exception.message
                    : "Could not save this expense.",
            );
        } finally {
            setIsSaving(false);
        }
    };

    const startEditing = (expense: Expense) => {
        setIsAdding(false);
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
            const updated = await updateExpense(
                trip.id,
                editingExpenseId,
                toRequest(editingExpense),
            );
            setExpenses((current) =>
                current.map((expense) =>
                    expense.id === updated.id ? updated : expense,
                ),
            );
            setEditingExpenseId(null);
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
            setPendingDeletion((current) =>
                current?.item.id === expense.id ? null : current,
            );
        }
    };

    /** Removes an expense optimistically and holds its data locally until the Undo timer ends. */
    const deleteExpense = (expense: Expense) => {
        setActionError(null);
        if (pendingDeletion) {
            if (deleteTimerRef.current !== null)
                window.clearTimeout(deleteTimerRef.current);
            void commitDelete(pendingDeletion.item);
        }

        setExpenses((current) =>
            current.filter((item) => item.id !== expense.id),
        );
        setPendingDeletion({ item: expense });
        deleteTimerRef.current = window.setTimeout(() => {
            void commitDelete(expense);
            deleteTimerRef.current = null;
        }, 5000);
    };

    const undoDelete = () => {
        if (!pendingDeletion) return;
        if (deleteTimerRef.current !== null)
            window.clearTimeout(deleteTimerRef.current);
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
        <form
            ref={formRef}
            className="budget-item-form form-surface"
            onKeyDown={onFormKeyDown}
            onSubmit={submit}
        >
            <label>
                <span className="field-label">What did you pay for?</span>
                <input
                    value={expense.name}
                    onChange={(event) =>
                        updateForm("name", event.target.value, editing)
                    }
                    placeholder="e.g. Hotel"
                />
            </label>
            <div className="form-row">
                <label>
                    <span className="field-label">Category</span>
                    <select
                        value={expense.category}
                        onChange={(event) =>
                            updateForm("category", event.target.value, editing)
                        }
                    >
                        <option value="">Not specified</option>
                        {expenseCategories.map((category) => (
                            <option key={category.value} value={category.value}>
                                {category.label}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    <span className="field-label field-label-required">
                        Amount ({trip.currency})
                    </span>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={expense.amount}
                        onChange={(event) =>
                            updateForm("amount", event.target.value, editing)
                        }
                        required
                    />
                </label>
                <label>
                    <span className="field-label">Date</span>
                    <input
                        type="date"
                        value={expense.expenseDate}
                        onChange={(event) =>
                            updateForm(
                                "expenseDate",
                                event.target.value,
                                editing,
                            )
                        }
                    />
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

    const actualSpending = expenses.reduce(
        (total, expense) => total + expense.amount,
        0,
    );
    const actualRemaining =
        trip.budget === null ? null : trip.budget - actualSpending;

    const categoryGroups: ExpenseGroup[] = [
        ...expenseCategories.map((category) => ({
            label: category.label,
            category: category.value,
            date: null,
            expenses: sortExpenses(
                expenses.filter(
                    (expense) => expense.category === category.value,
                ),
            ),
        })),
        {
            label: "Uncategorised",
            category: null,
            date: null,
            expenses: sortExpenses(
                expenses.filter((expense) => expense.category === null),
            ),
        },
    ].filter((group) => group.expenses.length > 0);

    const dayGroups: ExpenseGroup[] = [
        ...Array.from(
            new Set(
                expenses
                    .map((expense) => expense.expenseDate)
                    .filter((date): date is string => date !== null),
            ),
        )
            .sort((first, second) => second.localeCompare(first))
            .map((date) => ({
                label: formatDate(date),
                date,
                category: null,
                expenses: sortExpenses(
                    expenses.filter((expense) => expense.expenseDate === date),
                ),
            })),
        {
            label: "Undated",
            date: null,
            category: null,
            expenses: sortExpenses(
                expenses.filter((expense) => expense.expenseDate === null),
            ),
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
        <section className="detail-section budget-section">
            <div className="section-title-row">
                <h3>Expenses</h3>
                <div className="expense-header-actions">
                    <button
                        className="primary-button"
                        type="button"
                        onClick={() => startAdding()}
                    >
                        Add expense
                    </button>
                </div>
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
                    <span>Total spent</span>
                    <strong>
                        {formatMoney(actualSpending, trip.currency)}
                    </strong>
                </div>
                {actualRemaining !== null && (
                    <div className={actualRemaining < 0 ? "over-budget" : ""}>
                        <span>
                            {actualRemaining < 0
                                ? "Over budget"
                                : "Actual remaining"}
                        </span>
                        <strong>
                            {formatMoney(
                                Math.abs(actualRemaining),
                                trip.currency,
                            )}
                        </strong>
                    </div>
                )}
            </div>
            <div className="expense-grouping-control">
                <label>
                    <span>Group by</span>
                    <select
                        value={grouping}
                        onChange={(event) =>
                            setGrouping(event.target.value as ExpenseGrouping)
                        }
                    >
                        <option value="none">Ungrouped</option>
                        <option value="category">Category</option>
                        <option value="date">Date</option>
                    </select>
                </label>
            </div>
            {isAdding && form(newExpense, saveNewExpense)}
            {isLoading && <p className="detail-message">Loading expenses…</p>}
            {error && <p className="detail-message form-error">{error}</p>}
            {actionError && (
                <p className="detail-message form-error">{actionError}</p>
            )}
            {pendingDeletion && (
                <button
                    className="undo-toast"
                    type="button"
                    onClick={undoDelete}
                >
                    <span>Expense deleted.</span>
                    <strong>Undo</strong>
                </button>
            )}
            {!isLoading && !error && expenses.length === 0 && (
                <p className="detail-message">No expenses yet.</p>
            )}
            {!isLoading &&
                !error &&
                groups.map((group) => {
                    const subtotal = group.expenses.reduce(
                        (total, expense) => total + expense.amount,
                        0,
                    );
                    return (
                        <section className="budget-category" key={group.label}>
                            {grouping !== "none" && (
                                <div className="budget-category-heading">
                                    <div className="budget-category-title">
                                        <h4>{group.label}</h4>
                                        {(grouping === "category" ||
                                            grouping === "date") && (
                                            <button
                                                className="icon-button"
                                                type="button"
                                                onClick={() =>
                                                    startAdding({
                                                        category:
                                                            grouping ===
                                                            "category"
                                                                ? (group.category ??
                                                                  "")
                                                                : "",
                                                        expenseDate:
                                                            grouping === "date"
                                                                ? (group.date ?? "")
                                                                : localToday(),
                                                    })
                                                }
                                                aria-label={`Add an expense to ${group.label}`}
                                            >
                                                <Plus size={17} />
                                            </button>
                                        )}
                                    </div>
                                    <strong>
                                        {formatMoney(subtotal, trip.currency)}
                                    </strong>
                                </div>
                            )}
                            <ul className="list-items">
                                {group.expenses.map((expense) =>
                                    editingExpenseId === expense.id ? (
                                        <li
                                            className="budget-item-editing"
                                            key={expense.id}
                                        >
                                            {form(
                                                editingExpense,
                                                saveEdit,
                                                true,
                                            )}
                                        </li>
                                    ) : (
                                        <li
                                            className="list-row"
                                            key={expense.id}
                                        >
                                            <div className="budget-item-description">
                                                <div className="budget-item-primary">
                                                    <strong>{expense.name}</strong>
                                                    <strong className="budget-item-amount">
                                                        {formatMoney(
                                                            expense.amount,
                                                            trip.currency,
                                                        )}
                                                    </strong>
                                                </div>
                                                {grouping === "category" &&
                                                    expense.expenseDate && (
                                                        <span>
                                                            {formatDate(
                                                                expense.expenseDate,
                                                            )}
                                                        </span>
                                                    )}
                                                {grouping === "date" && (
                                                    <span>
                                                        {getExpenseCategoryLabel(
                                                            expense.category,
                                                        )}
                                                    </span>
                                                )}
                                                {grouping === "none" &&
                                                    (expense.expenseDate ||
                                                        expense.category) && (
                                                        <span>
                                                            {[
                                                                expense.category
                                                                    ? getExpenseCategoryLabel(
                                                                          expense.category,
                                                                      )
                                                                    : null,
                                                                expense.expenseDate
                                                                    ? formatDate(
                                                                          expense.expenseDate,
                                                                      )
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
                                                    onClick={() =>
                                                        startEditing(expense)
                                                    }
                                                    aria-label={`Edit ${expense.name}`}
                                                >
                                                    <Pencil size={17} />
                                                </button>
                                                <button
                                                    className="icon-button danger-button"
                                                    type="button"
                                                    onClick={() =>
                                                        deleteExpense(expense)
                                                    }
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
        </section>
    );
}
