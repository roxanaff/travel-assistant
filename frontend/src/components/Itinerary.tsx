import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { apiBaseUrl } from "../api/travelAssistantApi";
import { formatDate, formatMoney } from "../utils/format";
import type { Trip } from "../types/trip";
import type { ItineraryItem, ItineraryItemForm } from "../types/itineraryItem";
import { createEmptyItineraryItemForm } from "../types/itineraryItem";

import "./Itinerary.css";

type ItineraryProps = { trip: Trip };

const formatTime = (time: string | null) =>
  time ? time.slice(0, 5) : "Any time";

export function Itinerary({ trip }: ItineraryProps) {
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<ItineraryItemForm>(
    createEmptyItineraryItemForm(trip.startDate ?? ""),
  );
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ItineraryItemForm>(
    createEmptyItineraryItemForm(trip.startDate ?? ""),
  );

  useEffect(() => {
    const loadItems = async () => {
      try {
        const response = await fetch(
          `${apiBaseUrl}/api/trips/${trip.id}/itinerary-items`,
        );
        if (!response.ok) throw new Error();
        setItems(await response.json());
      } catch {
        setError("Could not load itinerary items.");
      } finally {
        setIsLoading(false);
      }
    };
    void loadItems();
  }, [trip.id]);

  const updateForm = (
    field: keyof ItineraryItemForm,
    value: string,
    editing = false,
  ) => {
    const update = (current: ItineraryItemForm) => ({
      ...current,
      [field]: value,
    });
    if (editing) setEditingItem(update);
    else setNewItem(update);
  };

  const toRequest = (item: ItineraryItemForm) => ({
    ...item,
    startTime: item.startTime || null,
    endTime: item.endTime || null,
    cost: item.cost === "" ? null : Number(item.cost),
    note: item.note.trim() || null,
  });

  const saveNewItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setFormError(null);
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/trips/${trip.id}/itinerary-items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toRequest(newItem)),
        },
      );
      if (!response.ok) throw new Error();
      const created: ItineraryItem = await response.json();
      setItems((current) =>
        [...current, created].sort(
          (a, b) =>
            a.date.localeCompare(b.date) ||
            (a.startTime ?? "").localeCompare(b.startTime ?? ""),
        ),
      );
      setNewItem(createEmptyItineraryItemForm(trip.startDate ?? ""));
      setIsAdding(false);
    } catch {
      setFormError("Could not save this itinerary item.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingItemId) return;
    setIsSaving(true);
    setFormError(null);
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/trips/${trip.id}/itinerary-items/${editingItemId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toRequest(editingItem)),
        },
      );
      if (!response.ok) throw new Error();
      const updated: ItineraryItem = await response.json();
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setEditingItemId(null);
    } catch {
      setFormError("Could not save these changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteItem = async (item: ItineraryItem) => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/trips/${trip.id}/itinerary-items/${item.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error();
      setItems((current) =>
        current.filter((currentItem) => currentItem.id !== item.id),
      );
    } catch {
      setError("Could not delete this itinerary item.");
    }
  };

  const startEditing = (item: ItineraryItem) => {
    setIsAdding(false);
    setEditingItemId(item.id);
    setEditingItem({
      name: item.name,
      date: item.date,
      startTime: item.startTime?.slice(0, 5) ?? "",
      endTime: item.endTime?.slice(0, 5) ?? "",
      category: item.category,
      cost: item.cost?.toString() ?? "",
      note: item.note ?? "",
    });
  };

  const form = (
    item: ItineraryItemForm,
    submit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>,
    editing = false,
  ) => (
    <form className="itinerary-form" onSubmit={submit}>
      <label>
        Name
        <input
          value={item.name}
          onChange={(event) => updateForm("name", event.target.value, editing)}
          placeholder="e.g. Sagrada Família"
          required
        />
      </label>
      <div className="form-row">
        <label>
          Date
          <input
            type="date"
            min={trip.startDate ?? undefined}
            max={trip.endDate ?? undefined}
            value={item.date}
            onChange={(event) =>
              updateForm("date", event.target.value, editing)
            }
            required
          />
        </label>
        <label>
          Category
          <select
            value={item.category}
            onChange={(event) =>
              updateForm("category", event.target.value, editing)
            }
          >
            <option value="Sightseeing">Sightseeing</option>
            <option value="FoodAndDrink">Food & drink</option>
            <option value="Transport">Transport</option>
            <option value="Event">Event</option>
            <option value="Activity">Activity</option>
            <option value="Other">Other</option>
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>
          Start time
          <input
            type="time"
            value={item.startTime}
            onChange={(event) =>
              updateForm("startTime", event.target.value, editing)
            }
          />
        </label>
        <label>
          End time
          <input
            type="time"
            value={item.endTime}
            onChange={(event) =>
              updateForm("endTime", event.target.value, editing)
            }
          />
        </label>
        <label>
          Cost ({trip.currency})
          <input
            type="number"
            min="0"
            step="0.01"
            value={item.cost}
            onChange={(event) =>
              updateForm("cost", event.target.value, editing)
            }
          />
        </label>
      </div>
      <label>
        Note <span className="optional">(optional)</span>
        <textarea
          value={item.note}
          onChange={(event) => updateForm("note", event.target.value, editing)}
          rows={2}
        />
      </label>
      {formError && <p className="form-error">{formError}</p>}
      <div className="form-actions">
        <button
          className="text-button"
          type="button"
          onClick={() =>
            editing ? setEditingItemId(null) : setIsAdding(false)
          }
        >
          Cancel
        </button>
        <button className="primary-button" type="submit" disabled={isSaving}>
          {isSaving ? "Saving…" : editing ? "Save changes" : "Add item"}
        </button>
      </div>
    </form>
  );

  return (
    <section className="detail-section itinerary-section">
      <h2>Itinerary</h2>
      <div className="itinerary-actions">
        <button
          className="text-button"
          type="button"
          onClick={() => {
            setEditingItemId(null);
            setIsAdding(true);
          }}
        >
          Add itinerary item +
        </button>
      </div>
      {isAdding && form(newItem, saveNewItem)}
      {isLoading && <p className="detail-message">Loading itinerary…</p>}
      {error && <p className="detail-message form-error">{error}</p>}
      {!isLoading && !error && items.length === 0 && (
        <p className="detail-message">No itinerary items yet.</p>
      )}
      <ul className="itinerary-list">
        {items.map((item) =>
          editingItemId === item.id ? (
            <li key={item.id}>{form(editingItem, saveEdit, true)}</li>
          ) : (
            <li key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <span>
                  {formatDate(item.date)} · {formatTime(item.startTime)} ·{" "}
                  {item.category.replace("And", " & ")}
                </span>
                {item.note && <span>{item.note}</span>}
              </div>
              <div className="itinerary-item-actions">
                {item.cost !== null && (
                  <strong>{formatMoney(item.cost, trip.currency)}</strong>
                )}
                <button
                  className="icon-button"
                  onClick={() => startEditing(item)}
                  aria-label={`Edit ${item.name}`}
                  title="Edit itinerary item"
                >
                  <Pencil size={17} />
                </button>
                <button
                  className="icon-button danger-button"
                  onClick={() => void deleteItem(item)}
                  aria-label={`Delete ${item.name}`}
                  title="Delete itinerary item"
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
}
