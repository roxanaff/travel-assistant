import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Itinerary } from "../components/Itinerary";

import { apiBaseUrl } from "../api/travelAssistantApi";
import { formatDate, formatMoney } from "../utils/format";
import type { Trip } from "../types/trip";
import type { BudgetItem, NewBudgetItemForm } from "../types/budgetItem";
import { initialNewBudgetItemForm } from "../types/budgetItem";

import "./TripDetails.css";

export function TripDetails() {
  const { id } = useParams();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [isLoadingBudgetItems, setIsLoadingBudgetItems] = useState(true);
  const [budgetItemsError, setBudgetItemsError] = useState<string | null>(null);
  const [isAddingBudgetItem, setIsAddingBudgetItem] = useState(false);
  const [isSavingBudgetItem, setIsSavingBudgetItem] = useState(false);
  const [budgetItemFormError, setBudgetItemFormError] = useState<string | null>(
    null,
  );
  const [newBudgetItem, setNewBudgetItem] = useState<NewBudgetItemForm>(
    initialNewBudgetItemForm,
  );
  const [editingBudgetItemId, setEditingBudgetItemId] = useState<string | null>(
    null,
  );
  const [editingBudgetItem, setEditingBudgetItem] = useState<NewBudgetItemForm>(
    initialNewBudgetItemForm,
  );
  const [isDeletingBudgetItemId, setIsDeletingBudgetItemId] = useState<
    string | null
  >(null);

  useEffect(() => {
    const loadTrip = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/trips/${id}`);

        if (response.status === 404) {
          setError("This trip no longer exists.");
          return;
        }

        if (!response.ok) {
          throw new Error("Unable to load this trip.");
        }

        setTrip(await response.json());
      } catch {
        setError("Could not connect to the Travel Assistant API.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadTrip();
  }, [id]);

  useEffect(() => {
    const loadBudgetItems = async () => {
      try {
        const response = await fetch(
          `${apiBaseUrl}/api/trips/${id}/budget-items`,
        );

        if (!response.ok) {
          throw new Error("Unable to load expenses.");
        }

        setBudgetItems(await response.json());
      } catch {
        setBudgetItemsError("Could not load expenses.");
      } finally {
        setIsLoadingBudgetItems(false);
      }
    };

    void loadBudgetItems();
  }, [id]);

  const updateBudgetItem = (field: keyof NewBudgetItemForm, value: string) => {
    setNewBudgetItem((current) => ({ ...current, [field]: value }));
  };

  const createBudgetItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBudgetItemFormError(null);
    setIsSavingBudgetItem(true);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/trips/${id}/budget-items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...newBudgetItem,
            amount: Number(newBudgetItem.amount),
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Unable to save expense.");
      }

      const createdBudgetItem: BudgetItem = await response.json();
      setBudgetItems((current) => [...current, createdBudgetItem]);
      setNewBudgetItem(initialNewBudgetItemForm);
      setIsAddingBudgetItem(false);
    } catch {
      setBudgetItemFormError(
        "Could not save this expense. Please try again.",
      );
    } finally {
      setIsSavingBudgetItem(false);
    }
  };

  const startEditingBudgetItem = (item: BudgetItem) => {
    setIsAddingBudgetItem(false);
    setBudgetItemFormError(null);
    setEditingBudgetItemId(item.id);
    setEditingBudgetItem({
      name: item.name,
      category: item.category,
      amount: String(item.amount),
      expenseDate: item.expenseDate ?? "",
    });
  };

  const updateEditingBudgetItem = (
    field: keyof NewBudgetItemForm,
    value: string,
  ) => {
    setEditingBudgetItem((current) => ({ ...current, [field]: value }));
  };

  const saveBudgetItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingBudgetItemId) return;

    setBudgetItemFormError(null);
    setIsSavingBudgetItem(true);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/trips/${id}/budget-items/${editingBudgetItemId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...editingBudgetItem,
            amount: Number(editingBudgetItem.amount),
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Unable to save expense.");
      }

      const updatedBudgetItem: BudgetItem = await response.json();
      setBudgetItems((current) =>
        current.map((item) =>
          item.id === updatedBudgetItem.id ? updatedBudgetItem : item,
        ),
      );
      setEditingBudgetItemId(null);
    } catch {
      setBudgetItemFormError(
        "Could not save these changes. Please try again.",
      );
    } finally {
      setIsSavingBudgetItem(false);
    }
  };

  const deleteBudgetItem = async (item: BudgetItem) => {
    setIsDeletingBudgetItemId(item.id);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/trips/${id}/budget-items/${item.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error("Unable to delete expense.");
      }

      setBudgetItems((current) =>
        current.filter((currentItem) => currentItem.id !== item.id),
      );
    } catch {
      setBudgetItemsError(
        "Could not delete this expense. Please try again.",
      );
    } finally {
      setIsDeletingBudgetItemId(null);
    }
  };

  const expensesTotal = budgetItems.reduce(
    (total, item) => total + item.amount,
    0,
  );
  const spentTotal = expensesTotal;

  return (
    <section className="trip-details">
      <Link className="back-link" to="/">
        ← All trips
      </Link>

      {isLoading && <p className="status-message">Loading your trip…</p>}
      {error && <p className="status-message error-message">{error}</p>}

      {trip && (
        <>
          <div className="trip-details-header">
            <div>
              <div className="card-topline">
                <span className="trip-type">
                  {trip.type?.replace(/([A-Z])/g, " $1").trim() ?? "Not specified"}
                </span>
                <span className="status-pill">Planned</span>
              </div>
              <h1>{trip.name}</h1>
              <p className="trip-dates">
                {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
              </p>
              {trip.note && <p className="trip-details-note">{trip.note}</p>}
            </div>
            <div className="trip-budget-summary">
              <span>Total budget</span>
              <strong>{formatMoney(trip.budget, trip.currency)}</strong>
            </div>
          </div>

          <div className="trip-detail-grid">
            <Itinerary trip={trip} />
            <section className="detail-section">
              <h2>Budget & expenses</h2>

              <div className="budget-overview">
                <div>
                  <span>Spent</span>
                  <strong>{formatMoney(spentTotal, trip.currency)}</strong>
                </div>
                <div>
                  <span>Remaining</span>
                  <strong>
                    {formatMoney((trip.budget ?? 0) - spentTotal, trip.currency)}
                  </strong>
                </div>
              </div>

              <div className="budget-actions">
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setEditingBudgetItemId(null);
                    setIsAddingBudgetItem(true);
                  }}
                >
                  Add expense +
                </button>
              </div>

              {isAddingBudgetItem && (
                <form className="budget-item-form" onSubmit={createBudgetItem}>
                  <label>
                    What did you pay for?
                    <input
                      value={newBudgetItem.name}
                      onChange={(event) =>
                        updateBudgetItem("name", event.target.value)
                      }
                      placeholder="e.g. Hotel"
                      required
                    />
                  </label>
                  <div className="form-row">
                    <label>
                      Category
                      <select
                        value={newBudgetItem.category}
                        onChange={(event) =>
                          updateBudgetItem("category", event.target.value)
                        }
                      >
                        <option value="Accommodation">Accommodation</option>
                        <option value="Transport">Local transport</option>
                        <option value="Food">Food</option>
                        <option value="Activities">Activities</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>
                    <label>
                      Amount ({trip.currency})
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={newBudgetItem.amount}
                        onChange={(event) =>
                          updateBudgetItem("amount", event.target.value)
                        }
                        placeholder="0"
                        required
                      />
                    </label>
                  </div>
                  <label>
                    Expense date
                    <input
                      type="date"
                      value={newBudgetItem.expenseDate}
                      onChange={(event) =>
                        updateBudgetItem("expenseDate", event.target.value)
                      }
                      required
                    />
                  </label>
                  {budgetItemFormError && (
                    <p className="form-error">{budgetItemFormError}</p>
                  )}
                  <div className="form-actions">
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => setIsAddingBudgetItem(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="primary-button"
                      type="submit"
                      disabled={isSavingBudgetItem}
                    >
                      {isSavingBudgetItem ? "Saving…" : "Add expense"}
                    </button>
                  </div>
                </form>
              )}

              {isLoadingBudgetItems && (
                <p className="detail-message">Loading expenses…</p>
              )}
              {budgetItemsError && (
                <p className="detail-message form-error">{budgetItemsError}</p>
              )}
              {!isLoadingBudgetItems &&
                !budgetItemsError &&
                budgetItems.length === 0 && (
                  <p className="detail-message">No expenses yet.</p>
                )}
              {budgetItems.length > 0 && (
                <ul className="budget-item-list">
                  {budgetItems.map((item) =>
                    editingBudgetItemId === item.id ? (
                      <li className="budget-item-editing" key={item.id}>
                        <form
                          className="budget-item-form"
                          onSubmit={saveBudgetItem}
                        >
                          <label>
                            What did you pay for?
                            <input
                              value={editingBudgetItem.name}
                              onChange={(event) =>
                                updateEditingBudgetItem(
                                  "name",
                                  event.target.value,
                                )
                              }
                              required
                            />
                          </label>
                          <div className="form-row">
                            <label>
                              Category
                              <select
                                value={editingBudgetItem.category}
                                onChange={(event) =>
                                  updateEditingBudgetItem(
                                    "category",
                                    event.target.value,
                                  )
                                }
                              >
                                <option value="Accommodation">
                                  Accommodation
                                </option>
                                <option value="Transport">
                                  Local transport
                                </option>
                                <option value="Food">Food</option>
                                <option value="Activities">Activities</option>
                                <option value="Other">Other</option>
                              </select>
                            </label>
                            <label>
                              Amount ({trip.currency})
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={editingBudgetItem.amount}
                                onChange={(event) =>
                                  updateEditingBudgetItem(
                                    "amount",
                                    event.target.value,
                                  )
                                }
                                required
                              />
                            </label>
                          </div>
                          <label>
                            Expense date
                            <input
                              type="date"
                              value={editingBudgetItem.expenseDate}
                              onChange={(event) =>
                                updateEditingBudgetItem(
                                  "expenseDate",
                                  event.target.value,
                                )
                              }
                              required
                            />
                          </label>
                          {budgetItemFormError && (
                            <p className="form-error">{budgetItemFormError}</p>
                          )}
                          <div className="form-actions">
                            <button
                              className="text-button"
                              type="button"
                              onClick={() => setEditingBudgetItemId(null)}
                            >
                              Cancel
                            </button>
                            <button
                              className="primary-button"
                              type="submit"
                              disabled={isSavingBudgetItem}
                            >
                              {isSavingBudgetItem ? "Saving…" : "Save changes"}
                            </button>
                          </div>
                        </form>
                      </li>
                    ) : (
                      <li key={item.id}>
                        <div className="budget-item-description">
                          <strong>{item.name}</strong>
                          <span>{item.category}</span>
                        </div>
                        <div className="budget-item-actions">
                          <strong>
                            {formatMoney(item.amount, trip.currency)}
                          </strong>
                          <button
                            className="icon-button"
                            type="button"
                            onClick={() => startEditingBudgetItem(item)}
                            aria-label={`Edit ${item.name}`}
                            title="Edit expense"
                          >
                            <Pencil aria-hidden="true" size={17} />
                          </button>
                          <button
                            className="icon-button danger-button"
                            type="button"
                            onClick={() => void deleteBudgetItem(item)}
                            disabled={isDeletingBudgetItemId === item.id}
                            aria-label={`Delete ${item.name}`}
                            title="Delete expense"
                          >
                            <Trash2 aria-hidden="true" size={17} />
                          </button>
                        </div>
                      </li>
                    ),
                  )}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
