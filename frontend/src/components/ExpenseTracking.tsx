import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { apiBaseUrl } from "../api/travelAssistantApi";
import type { BudgetItem, NewBudgetItemForm } from "../types/budgetItem";
import { formatDate, formatMoney } from "../utils/format";
import type { Trip } from "../types/trip";

import "./ExpenseTracking.css";

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
  item: BudgetItem;
};

type ExpenseGrouping = "category" | "day";

const localToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const createEmptyExpenseForm = (): NewBudgetItemForm => ({
  name: "",
  category: "",
  amount: "",
  expenseDate: localToday(),
  plannedCostId: null,
});

const sortExpenses = (expenses: BudgetItem[]) =>
  [...expenses].sort(
    (first, second) =>
      Number(Boolean(second.expenseDate)) - Number(Boolean(first.expenseDate)) ||
      (second.expenseDate ?? "").localeCompare(first.expenseDate ?? "") ||
      first.createdAtUtc.localeCompare(second.createdAtUtc),
  );

/** Shows recorded expenses separately from the trip's planned budget. */
export function ExpenseTracking({ trip, onFormOpenChange, refreshKey }: ExpenseTrackingProps) {
  const [expenses, setExpenses] = useState<BudgetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newExpense, setNewExpense] = useState<NewBudgetItemForm>(createEmptyExpenseForm());
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<NewBudgetItemForm>(createEmptyExpenseForm());
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
  const [grouping, setGrouping] = useState<ExpenseGrouping>("category");
  const deleteTimerRef = useRef<number | null>(null);

  useEffect(() => {
    onFormOpenChange(isAdding || editingExpenseId !== null);
    return () => onFormOpenChange(false);
  }, [editingExpenseId, isAdding, onFormOpenChange]);

  useEffect(() => {
    const loadExpenses = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/trips/${trip.id}/budget-items`);
        if (!response.ok) throw new Error();
        setExpenses(await response.json());
      } catch {
        setError("Could not load expenses.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadExpenses();
  }, [refreshKey, trip.id]);

  const updateForm = (
    field: keyof NewBudgetItemForm,
    value: string,
    editing = false,
  ) => {
    const update = (current: NewBudgetItemForm) => ({ ...current, [field]: value });
    if (editing) setEditingExpense(update);
    else setNewExpense(update);
  };

  const toRequest = (expense: NewBudgetItemForm) => ({
    name: expense.name.trim(),
    category: expense.category || null,
    amount: Number(expense.amount),
    expenseDate: expense.expenseDate || null,
    plannedCostId: expense.plannedCostId,
  });

  const validate = (expense: NewBudgetItemForm) => {
    if (!expense.amount || Number(expense.amount) <= 0) return "Enter an amount greater than zero.";
    return null;
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setFormError(null);
  };

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
      const response = await fetch(`${apiBaseUrl}/api/trips/${trip.id}/budget-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toRequest(newExpense)),
      });
      if (!response.ok) throw new Error(await response.text());

      const created: BudgetItem = await response.json();
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

  const startEditing = (expense: BudgetItem) => {
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
      const response = await fetch(
        `${apiBaseUrl}/api/trips/${trip.id}/budget-items/${editingExpenseId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toRequest(editingExpense)),
        },
      );
      if (!response.ok) throw new Error(await response.text());

      const updated: BudgetItem = await response.json();
      setExpenses((current) => current.map((expense) => expense.id === updated.id ? updated : expense));
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

  const commitDelete = async (expense: BudgetItem) => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/trips/${trip.id}/budget-items/${expense.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error();
    } catch {
      setExpenses((current) => [...current, expense]);
      setError("Could not delete this expense. It was restored.");
    } finally {
      setPendingDeletion((current) => current?.item.id === expense.id ? null : current);
    }
  };

  const deleteExpense = (expense: BudgetItem) => {
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

  const undoDelete = () => {
    if (!pendingDeletion) return;
    if (deleteTimerRef.current !== null) window.clearTimeout(deleteTimerRef.current);
    setExpenses((current) => [...current, pendingDeletion.item]);
    setPendingDeletion(null);
    deleteTimerRef.current = null;
  };

  const form = (
    expense: NewBudgetItemForm,
    submit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>,
    editing = false,
  ) => (
    <form className="expense-form form-surface" onSubmit={submit}>
      <label>
        <span className="field-label">What did you pay for? <span className="optional">(optional)</span></span>
        <input
          value={expense.name}
          onChange={(event) => updateForm("name", event.target.value, editing)}
          placeholder="e.g. Hotel"
        />
      </label>
      <div className="form-row">
        <label>
          <span className="field-label">Category <span className="optional">(optional)</span></span>
          <select
            value={expense.category}
            onChange={(event) => updateForm("category", event.target.value, editing)}
          >
            <option value="">Not specified</option>
            {expenseCategories.map((category) => (
              <option key={category.value} value={category.value}>{category.label}</option>
            ))}
          </select>
        </label>
        <label>
          Amount ({trip.currency})
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={expense.amount}
            onChange={(event) => updateForm("amount", event.target.value, editing)}
            required
          />
        </label>
        <label>
          <span className="field-label">Date <span className="optional">(optional)</span></span>
          <input
            type="date"
            value={expense.expenseDate}
            onChange={(event) => updateForm("expenseDate", event.target.value, editing)}
          />
        </label>
      </div>
      {formError && <p className="form-error">{formError}</p>}
      <div className="form-actions">
        <button
          className="text-button"
          type="button"
          onClick={() => editing ? setEditingExpenseId(null) : cancelAdding()}
        >
          Cancel
        </button>
        <button className="primary-button" type="submit" disabled={isSaving}>
          {isSaving ? "Saving…" : editing ? "Save changes" : "Save"}
        </button>
      </div>
    </form>
  );

  const actualSpending = expenses.reduce((total, expense) => total + expense.amount, 0);
  const actualRemaining = trip.budget === null ? null : trip.budget - actualSpending;

  const categoryGroups = [
    ...expenseCategories.map((category) => ({
      label: category.label,
      expenses: sortExpenses(expenses.filter((expense) => expense.category === category.value)),
    })),
    {
      label: "Uncategorised",
      expenses: sortExpenses(expenses.filter((expense) => expense.category === null)),
    },
  ].filter((group) => group.expenses.length > 0);

  const dayGroups = [
    ...Array.from(new Set(expenses
      .map((expense) => expense.expenseDate)
      .filter((date): date is string => date !== null)))
      .sort((first, second) => second.localeCompare(first))
      .map((date) => ({
        label: formatDate(date),
        category: null,
        expenses: sortExpenses(expenses.filter((expense) => expense.expenseDate === date)),
      })),
    {
      label: "Undated",
      category: null,
      expenses: sortExpenses(expenses.filter((expense) => expense.expenseDate === null)),
    },
  ].filter((group) => group.expenses.length > 0);

  const groups = grouping === "category" ? categoryGroups : dayGroups;

  return (
    <section className="detail-section expense-section">
      <div className="section-title-row">
        <h3>Expenses</h3>
        <div className="expense-header-actions">
          <label>
            Group by
            <select value={grouping} onChange={(event) => setGrouping(event.target.value as ExpenseGrouping)}>
              <option value="category">Category</option>
              <option value="day">Day</option>
            </select>
          </label>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              setEditingExpenseId(null);
              setNewExpense(createEmptyExpenseForm());
              setFormError(null);
              setIsAdding(true);
            }}
          >
            Add expense
          </button>
        </div>
      </div>
      <div className="expense-overview">
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
      {isAdding && form(newExpense, saveNewExpense)}
      {isLoading && <p className="detail-message">Loading expenses…</p>}
      {error && <p className="detail-message form-error">{error}</p>}
      {pendingDeletion && (
        <button className="undo-toast" type="button" onClick={undoDelete}>
          <span>Expense deleted.</span>
          <strong>Undo</strong>
        </button>
      )}
      {!isLoading && !error && expenses.length === 0 && (
        <p className="detail-message">No expenses yet.</p>
      )}
      {!isLoading && !error && groups.map((group) => {
        const subtotal = group.expenses.reduce((total, expense) => total + expense.amount, 0);
        return (
          <section className="expense-category" key={group.label}>
            <div className="expense-category-heading">
              <div className="expense-category-title">
                <h4>{group.label}</h4>
                {grouping === "category" && (
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => {
                      setEditingExpenseId(null);
                      setNewExpense({ ...createEmptyExpenseForm(), category: group.label === "Uncategorised" ? "" : expenseCategories.find((category) => category.label === group.label)?.value ?? "" });
                      setFormError(null);
                      setIsAdding(true);
                    }}
                    aria-label={`Add an expense to ${group.label}`}
                  >
                    <Plus size={17} />
                  </button>
                )}
              </div>
              <strong>{formatMoney(subtotal, trip.currency)}</strong>
            </div>
            <ul className="list-items">
              {group.expenses.map((expense) => editingExpenseId === expense.id ? (
                <li className="expense-editing" key={expense.id}>{form(editingExpense, saveEdit, true)}</li>
              ) : (
                <li className="list-row" key={expense.id}>
                  <div className="expense-description">
                    <strong>{expense.name}</strong>
                    <span>{formatMoney(expense.amount, trip.currency)}{expense.expenseDate ? ` · ${formatDate(expense.expenseDate)}` : ""}</span>
                  </div>
                  <div className="item-actions">
                    <button className="icon-button" type="button" onClick={() => startEditing(expense)} aria-label={`Edit ${expense.name}`}>
                      <Pencil size={17} />
                    </button>
                    <button className="icon-button danger-button" type="button" onClick={() => deleteExpense(expense)} aria-label={`Delete ${expense.name}`}>
                      <Trash2 size={17} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </section>
  );
}
