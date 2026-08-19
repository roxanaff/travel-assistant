import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { apiBaseUrl } from "../api/travelAssistantApi";
import type { Trip } from "../types/trip";
import {
  createEmptyPlannedCostForm,
  plannedCostCategories,
  type PlannedCost,
  type PlannedCostCategory,
  type PlannedCostForm,
} from "../types/plannedCost";
import { formatMoney } from "../utils/format";

import "./PlannedBudget.css";

type PlannedBudgetProps = {
  trip: Trip;
  onFormOpenChange: (isOpen: boolean) => void;
  onExpenseAdded: () => void;
};

type PendingDeletion = {
  cost: PlannedCost;
};

const localToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/** Displays and manages the trip's planned spending by category. */
export function PlannedBudget({ trip, onFormOpenChange, onExpenseAdded }: PlannedBudgetProps) {
  const [costs, setCosts] = useState<PlannedCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newCost, setNewCost] = useState<PlannedCostForm>(createEmptyPlannedCostForm());
  const [isAdding, setIsAdding] = useState(false);
  const [addingForCategory, setAddingForCategory] = useState<PlannedCostCategory | null>(null);
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [editingCost, setEditingCost] = useState<PlannedCostForm>(createEmptyPlannedCostForm());
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
  const [copyingCostId, setCopyingCostId] = useState<string | null>(null);
  const deleteTimerRef = useRef<number | null>(null);

  useEffect(() => {
    onFormOpenChange(isAdding || editingCostId !== null);
    return () => onFormOpenChange(false);
  }, [editingCostId, isAdding, onFormOpenChange]);

  useEffect(() => {
    const loadCosts = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/trips/${trip.id}/planned-costs`);
        if (!response.ok) throw new Error();
        setCosts(await response.json());
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
    const update = (current: PlannedCostForm) => ({ ...current, [field]: value });
    if (editing) setEditingCost(update);
    else setNewCost(update);
  };

  const toRequest = (cost: PlannedCostForm) => ({
    name: cost.name.trim() || null,
    category: cost.category || null,
    amount: Number(cost.amount),
  });

  const validate = (cost: PlannedCostForm) => {
    if (!cost.category) return "Choose a category.";
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
      const response = await fetch(`${apiBaseUrl}/api/trips/${trip.id}/planned-costs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toRequest(newCost)),
      });
      if (!response.ok) throw new Error(await response.text());

      const created: PlannedCost = await response.json();
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
      category: cost.category,
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
      const response = await fetch(
        `${apiBaseUrl}/api/trips/${trip.id}/planned-costs/${editingCostId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toRequest(editingCost)),
        },
      );
      if (!response.ok) throw new Error(await response.text());

      const updated: PlannedCost = await response.json();
      setCosts((current) => current.map((cost) => cost.id === updated.id ? updated : cost));
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
      const response = await fetch(
        `${apiBaseUrl}/api/trips/${trip.id}/planned-costs/${cost.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error();
    } catch {
      setCosts((current) => [...current, cost]);
      setError("Could not delete this planned cost. It was restored.");
    } finally {
      setPendingDeletion((current) => current?.cost.id === cost.id ? null : current);
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

  const copyToExpenses = async (cost: PlannedCost) => {
    setCopyingCostId(cost.id);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/trips/${trip.id}/budget-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cost.name,
          category: cost.category === "EmergencyBuffer" ? null : cost.category,
          amount: cost.amount,
          expenseDate: localToday(),
          plannedCostId: cost.id,
        }),
      });
      if (!response.ok) throw new Error();
      setCosts((current) => current.map((currentCost) =>
        currentCost.id === cost.id
          ? { ...currentCost, expenseAdded: true }
          : currentCost,
      ));
      onExpenseAdded();
    } catch {
      setError("Could not add this planned cost to expenses.");
    } finally {
      setCopyingCostId(null);
    }
  };

  const form = (
    cost: PlannedCostForm,
    submit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>,
    editing = false,
  ) => (
    <form className="planned-cost-form" onSubmit={submit}>
      <label>
        <span className="field-label">Name <span className="optional">(optional)</span></span>
        <input
          value={cost.name}
          onChange={(event) => updateForm("name", event.target.value, editing)}
          placeholder="Cost item"
        />
      </label>
      <div className="form-row">
        <label>
          Category
          <select
            value={cost.category}
            onChange={(event) => updateForm("category", event.target.value, editing)}
            required
          >
            <option value="" disabled>Choose a category</option>
            {plannedCostCategories.map((category) => (
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
            value={cost.amount}
            onChange={(event) => updateForm("amount", event.target.value, editing)}
            required
          />
        </label>
      </div>
      {formError && <p className="form-error">{formError}</p>}
      <div className="form-actions">
        <button
          className="text-button"
          type="button"
          onClick={() => editing ? setEditingCostId(null) : cancelAdding()}
        >
          Cancel
        </button>
        <button className="primary-button" type="submit" disabled={isSaving}>
          {isSaving ? "Saving…" : editing ? "Save changes" : "Save"}
        </button>
      </div>
    </form>
  );

  const totalPlannedCosts = costs.reduce((total, cost) => total + cost.amount, 0);
  const theoreticalRemaining = trip.budget === null ? null : trip.budget - totalPlannedCosts;

  return (
    <section className="detail-section planned-budget-section">
      <div className="section-title-row">
        <h3>Planned budget</h3>
        <button className="primary-button" type="button" onClick={() => startAdding()}>
          Add planned cost
        </button>
      </div>
      <div className="planned-budget-overview">
        <div>
          <span>Target budget</span>
          <strong>{trip.budget === null ? "Not set" : formatMoney(trip.budget, trip.currency)}</strong>
        </div>
        <div>
          <span>Total planned</span>
          <strong>{formatMoney(totalPlannedCosts, trip.currency)}</strong>
        </div>
        {theoreticalRemaining !== null && (
          <div className={theoreticalRemaining < 0 ? "over-budget" : ""}>
            <span>{theoreticalRemaining < 0 ? "Over budget" : "Theoretical remaining"}</span>
            <strong>{formatMoney(Math.abs(theoreticalRemaining), trip.currency)}</strong>
          </div>
        )}
      </div>
      {isAdding && !addingForCategory && form(newCost, saveNewCost)}
      {isLoading && <p className="detail-message">Loading planned costs…</p>}
      {error && <p className="detail-message form-error">{error}</p>}
      {pendingDeletion && (
        <div className="planned-cost-undo" role="status">
          <span>Planned cost deleted.</span>
          <button className="text-button" type="button" onClick={undoDelete}>Undo</button>
        </div>
      )}
      {!isLoading && !error && costs.length === 0 && (
        <p className="detail-message">No planned costs yet.</p>
      )}
      {!isLoading && !error && plannedCostCategories.map((category) => {
        const categoryCosts = costs.filter((cost) => cost.category === category.value);
        if (categoryCosts.length === 0) return null;
        const categoryTotal = categoryCosts.reduce((total, cost) => total + cost.amount, 0);

        return (
          <section className="planned-cost-category" key={category.value}>
            <div className="planned-cost-category-heading">
              <div className="planned-cost-category-title">
                <h4>{category.label}</h4>
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => startAdding(category.value)}
                  aria-label={`Add a planned cost to ${category.label}`}
                >
                  <Plus size={17} />
                </button>
              </div>
              <strong>{formatMoney(categoryTotal, trip.currency)}</strong>
            </div>
            <ul>
              {categoryCosts.map((cost) => editingCostId === cost.id ? (
                <li className="planned-cost-editing" key={cost.id}>{form(editingCost, saveEdit, true)}</li>
              ) : (
                <li key={cost.id}>
                  <div className="planned-cost-description">
                    <strong>{cost.name}</strong>
                    <span>{formatMoney(cost.amount, trip.currency)}</span>
                  </div>
                  <div className="budget-item-actions">
                    {cost.category !== "EmergencyBuffer" && (
                      cost.expenseAdded ? (
                        <span className="planned-cost-expense-added">Expense added</span>
                      ) : (
                        <button className="text-button" type="button" onClick={() => void copyToExpenses(cost)} disabled={copyingCostId === cost.id}>
                          {copyingCostId === cost.id ? "Adding…" : "Add to expenses"}
                        </button>
                      )
                    )}
                    <button className="icon-button" type="button" onClick={() => startEditing(cost)} aria-label={`Edit ${cost.name}`}>
                      <Pencil size={17} />
                    </button>
                    <button className="icon-button danger-button" type="button" onClick={() => deleteCost(cost)} aria-label={`Delete ${cost.name}`}>
                      <Trash2 size={17} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {isAdding && addingForCategory === category.value && form(newCost, saveNewCost)}
          </section>
        );
      })}
    </section>
  );
}
