import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";

import {
    createItineraryItem,
    deleteItineraryItem,
    getItineraryItems,
    updateItineraryItem,
    type ItineraryItemRequest,
} from "../../api/itineraryApi";
import { formatDate, formatMoney } from "../../utils/format";
import { SectionCard } from "../shared/SectionCard";
import { SectionHeader } from "../shared/SectionHeader";
import { FormActions, FormSurface } from "../shared/FormPrimitives";
import { FormDiscardDialog } from "../shared/FormDiscardDialog";
import { UndoToast } from "../shared/UndoToast";
import { normalizeMoneyInput } from "../../utils/numberInput";
import { useFormKeyboardInteraction } from "../../utils/useFormKeyboardInteraction";
import type { Trip } from "../../types/trip";
import type { ItineraryItem, ItineraryItemForm } from "../../types/itineraryItem";
import { createEmptyItineraryItemForm } from "../../types/itineraryItem";
import {
    formatCategory,
    formatDuration,
    formatOpeningHours,
    formatPriority,
    formatTime,
    getOpeningHoursWarning,
    getTripDays,
    sortDatedItems,
    sortUnscheduledItems,
} from "./itineraryUtils";

import "./Itinerary.css";

type ItineraryProps = {
    trip: Trip;
    setHasUnsavedForm?: Dispatch<SetStateAction<boolean>>;
};

type ItineraryFormErrors = Partial<Record<keyof ItineraryItemForm, string>>;

type PendingDeletion = {
    item: ItineraryItem;
};

// This component owns the itinerary workflow: scheduling, optional activity details, inline editing, and Undo.

/** Renders and coordinates all activities belonging to the current trip. */
export function Itinerary({ trip, setHasUnsavedForm }: ItineraryProps) {
    const [items, setItems] = useState<ItineraryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [addingForDate, setAddingForDate] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<ItineraryFormErrors>({});
    const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
    const deleteTimerRef = useRef<number | null>(null);
    const [newItem, setNewItem] = useState<ItineraryItemForm>(createEmptyItineraryItemForm());
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<ItineraryItemForm>(createEmptyItineraryItemForm());
    const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());
    const [isMoreDetailsOpen, setIsMoreDetailsOpen] = useState(false);

    useEffect(() => {
        setHasUnsavedForm?.(isAdding || editingItemId !== null);
        return () => setHasUnsavedForm?.(false);
    }, [editingItemId, isAdding, setHasUnsavedForm]);

    useEffect(() => {
        const loadItems = async () => {
            try {
                setItems(await getItineraryItems(trip.id));
            } catch {
                setError("Could not load itinerary items.");
            } finally {
                setIsLoading(false);
            }
        };
        void loadItems();
    }, [trip.id]);

    const updateForm = (field: keyof ItineraryItemForm, value: string, editing = false) => {
        if (field === "cost") {
            const normalized = normalizeMoneyInput(value);
            if (normalized === null) return;
            value = normalized;
        }

        const update = (current: ItineraryItemForm) => ({
            ...current,
            [field]: value,
        });
        if (editing) setEditingItem(update);
        else setNewItem(update);
        setFormErrors((current) => ({ ...current, [field]: undefined }));
    };

    const toRequest = (item: ItineraryItemForm): ItineraryItemRequest => ({
        name: item.name.trim(),
        date: trip.startDate && trip.endDate ? item.date || null : null,
        startTime: trip.startDate && trip.endDate && item.date ? item.startTime || null : null,
        durationMinutes: getDurationInMinutes(item),
        openingTime: item.openingTime || null,
        closingTime: item.closingTime || null,
        category: item.category || null,
        cost: item.cost === "" ? null : Number(item.cost),
        location: item.location.trim() || null,
        externalLink: item.externalLink.trim() || null,
        priority: item.priority,
        note: item.note.trim() || null,
    });

    const getDurationInMinutes = (item: ItineraryItemForm) => {
        if (!item.duration) return null;

        const [hours, minutes] = item.duration.split(":").map(Number);

        return hours === 0 && minutes === 0 ? null : hours * 60 + minutes;
    };

    const validateForm = (item: ItineraryItemForm): ItineraryFormErrors => {
        const errors: ItineraryFormErrors = {};

        if (!item.name.trim()) {
            errors.name = "Enter an activity name.";
        }
        if (item.startTime && !item.date) {
            errors.startTime = "Choose a date before setting a start time.";
        }
        if (item.date && trip.startDate && trip.endDate && (item.date < trip.startDate || item.date > trip.endDate)) {
            errors.date = "Choose a date within the trip dates.";
        }
        if (item.cost && Number(item.cost) < 0) {
            errors.cost = "Cost cannot be negative.";
        }

        return errors;
    };

    /** Maps known backend validation messages back to the corresponding browser form field. */
    const getResponseFormErrors = (message: string): ItineraryFormErrors => {
        if (message.includes("name is required")) return { name: message };
        if (message.includes("start time requires")) return { startTime: message };
        if (message.includes("date must fall")) return { date: message };
        if (message.includes("Duration")) return { duration: message };
        if (message.includes("Cost")) return { cost: message };

        return {};
    };

    const restoreItem = (item: ItineraryItem) => {
        setItems((current) => [...current, item]);
    };

    /** Permanently removes an activity after its Undo period. */
    const commitDelete = async (item: ItineraryItem) => {
        try {
            await deleteItineraryItem(trip.id, item.id);
        } catch {
            restoreItem(item);
            setError("Could not delete this itinerary item. It was restored.");
        } finally {
            setPendingDeletion((current) => (current?.item.id === item.id ? null : current));
        }
    };

    const saveNewItem = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const validationErrors = validateForm(newItem);
        if (Object.keys(validationErrors).length > 0) {
            setFormErrors(validationErrors);
            return;
        }

        setIsSaving(true);
        setFormError(null);
        setFormErrors({});
        try {
            const created = await createItineraryItem(trip.id, toRequest(newItem));
            setItems((current) =>
                [...current, created].sort(
                    (a, b) =>
                        (a.date ?? "").localeCompare(b.date ?? "") ||
                        (a.startTime ?? "").localeCompare(b.startTime ?? ""),
                ),
            );
            setNewItem(createEmptyItineraryItemForm());
            setIsAdding(false);
            setAddingForDate(null);
        } catch (exception) {
            const message = exception instanceof Error ? exception.message : "Could not save this itinerary item.";
            const responseErrors = getResponseFormErrors(message);
            if (Object.keys(responseErrors).length > 0) setFormErrors(responseErrors);
            else setFormError(message);
        } finally {
            setIsSaving(false);
        }
    };

    const saveEdit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingItemId) return;
        const validationErrors = validateForm(editingItem);
        if (Object.keys(validationErrors).length > 0) {
            setFormErrors(validationErrors);
            return;
        }

        setIsSaving(true);
        setFormError(null);
        setFormErrors({});

        try {
            const updated = await updateItineraryItem(trip.id, editingItemId, toRequest(editingItem));
            setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
            setEditingItemId(null);
        } catch (exception) {
            const message = exception instanceof Error ? exception.message : "Could not save these changes.";
            const responseErrors = getResponseFormErrors(message);
            if (Object.keys(responseErrors).length > 0) {
                setFormErrors(responseErrors);
            } else {
                setFormError(message);
            }
        } finally {
            setIsSaving(false);
        }
    };

    /** Optimistically removes an activity while preserving it locally for five seconds of Undo. */
    const deleteItem = async (item: ItineraryItem) => {
        if (pendingDeletion) {
            if (deleteTimerRef.current !== null) {
                window.clearTimeout(deleteTimerRef.current);
            }
            void commitDelete(pendingDeletion.item);
        }

        setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));

        setExpandedItemIds((current) => {
            const updated = new Set(current);
            updated.delete(item.id);
            return updated;
        });

        setPendingDeletion({ item });

        deleteTimerRef.current = window.setTimeout(() => {
            void commitDelete(item);
            deleteTimerRef.current = null;
        }, 5000);
    };

    const undoDelete = () => {
        if (!pendingDeletion) return;

        if (deleteTimerRef.current !== null) {
            window.clearTimeout(deleteTimerRef.current);
            deleteTimerRef.current = null;
        }

        restoreItem(pendingDeletion.item);
        setPendingDeletion(null);
    };

    const startEditing = (item: ItineraryItem) => {
        setIsAdding(false);
        setEditingItemId(item.id);
        setIsMoreDetailsOpen(false);
        setEditingItem({
            name: item.name,
            date: item.date ?? "",
            startTime: item.startTime?.slice(0, 5) ?? "",
            category: item.category ?? "",
            duration: item.durationMinutes
                ? `${Math.floor(item.durationMinutes / 60)
                      .toString()
                      .padStart(2, "0")}:${(item.durationMinutes % 60).toString().padStart(2, "0")}`
                : "",
            openingTime: item.openingTime?.slice(0, 5) ?? "",
            closingTime: item.closingTime?.slice(0, 5) ?? "",
            cost: item.cost?.toString() ?? "",
            location: item.location ?? "",
            externalLink: item.externalLink ?? "",
            priority: item.priority,
            note: item.note ?? "",
        });
    };

    const startAdding = (date = "") => {
        setEditingItemId(null);
        setIsMoreDetailsOpen(false);
        setNewItem({ ...createEmptyItineraryItemForm(), date });
        setAddingForDate(date || null);
        setIsAdding(true);
    };

    const cancelAdding = () => {
        setIsMoreDetailsOpen(false);
        setIsAdding(false);
        setAddingForDate(null);
    };

    const cancelOpenForm = () => {
        if (editingItemId !== null) setEditingItemId(null);
        else cancelAdding();
    };
    const { formRef, onFormKeyDown, cancelForm, isConfirmingDiscard, cancelDiscardConfirmation, discardChanges } =
        useFormKeyboardInteraction(isAdding || editingItemId !== null, cancelOpenForm);

    const toggleDetails = (itemId: string) => {
        setExpandedItemIds((current) => {
            const updated = new Set(current);

            if (updated.has(itemId)) {
                updated.delete(itemId);
            } else {
                updated.add(itemId);
            }

            return updated;
        });
    };

    const expandableItemIds = items
        .filter((item) => item.openingTime || item.closingTime || item.location || item.externalLink || item.note)
        .map((item) => item.id);
    const areAllExpandableItemsExpanded =
        expandableItemIds.length > 0 && expandableItemIds.every((itemId) => expandedItemIds.has(itemId));

    const toggleAllDetails = () => {
        setExpandedItemIds(areAllExpandableItemsExpanded ? new Set() : new Set(expandableItemIds));
    };

    /** Shared inline activity form for both adding and editing. */
    const form = (
        item: ItineraryItemForm,
        submit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>,
        editing = false,
    ) => (
        <FormSurface formRef={formRef} className="itinerary-form" onKeyDown={onFormKeyDown} onSubmit={submit}>
            <div className="itinerary-form-row itinerary-form-row-name">
                <label className="itinerary-field itinerary-name-field">
                    <span className="field-label field-label-required">Name</span>
                    <input
                        value={item.name}
                        onChange={(event) => updateForm("name", event.target.value, editing)}
                        placeholder="e.g. Sagrada Família"
                        required
                        aria-invalid={Boolean(formErrors.name)}
                    />
                    {formErrors.name && <span className="form-field-error">{formErrors.name}</span>}
                </label>
            </div>
            <div className="itinerary-form-row itinerary-form-row-schedule">
                {trip.startDate && trip.endDate ? (
                    <>
                        <label className="itinerary-field itinerary-date-field">
                            <span className="field-label">Date</span>
                            <input
                                type="date"
                                min={trip.startDate}
                                max={trip.endDate}
                                value={item.date}
                                onChange={(event) => {
                                    updateForm("date", event.target.value, editing);
                                    if (!event.target.value) updateForm("startTime", "", editing);
                                }}
                                aria-invalid={Boolean(formErrors.date)}
                            />
                            {formErrors.date && <span className="form-field-error">{formErrors.date}</span>}
                        </label>
                        <label className="itinerary-field itinerary-time-field">
                            <span className="field-label">Time</span>
                            <input
                                type="time"
                                value={item.startTime}
                                disabled={!item.date}
                                onChange={(event) => updateForm("startTime", event.target.value, editing)}
                                aria-invalid={Boolean(formErrors.startTime)}
                            />
                            {formErrors.startTime && <span className="form-field-error">{formErrors.startTime}</span>}
                        </label>
                    </>
                ) : null}
                <label className="itinerary-field itinerary-duration-field">
                    <span className="field-label">Duration</span>
                    <input
                        type="time"
                        step="60"
                        value={item.duration}
                        onChange={(event) => updateForm("duration", event.target.value, editing)}
                        aria-invalid={Boolean(formErrors.duration)}
                    />
                    {formErrors.duration && <span className="form-field-error">{formErrors.duration}</span>}
                </label>
            </div>
            <div className="itinerary-form-row itinerary-form-row-planning">
                <label className="itinerary-field itinerary-priority-field">
                    <span className="field-label">Priority</span>
                    <select
                        value={item.priority}
                        onChange={(event) => updateForm("priority", event.target.value, editing)}
                    >
                        <option value="MustDo">Must do</option>
                        <option value="WouldLikeToDo">Want to do</option>
                        <option value="Optional">Optional</option>
                    </select>
                </label>
                <label className="itinerary-field itinerary-category-field">
                    <span className="field-label">Category</span>
                    <select
                        value={item.category}
                        onChange={(event) => updateForm("category", event.target.value, editing)}
                    >
                        <option value="">Not specified</option>
                        <option value="Museum">Museum</option>
                        <option value="Tour">Tour</option>
                        <option value="Event">Event</option>
                        <option value="Food">Food</option>
                        <option value="Beach">Beach</option>
                        <option value="Bar">Bar</option>
                        <option value="Attraction">Attraction</option>
                        <option value="Other">Other</option>
                    </select>
                </label>
                <label className="itinerary-field itinerary-price-field">
                    <span className="field-label">Price ({trip.currency})</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={item.cost}
                        onChange={(event) => updateForm("cost", event.target.value, editing)}
                        aria-invalid={Boolean(formErrors.cost)}
                    />
                    {formErrors.cost && <span className="form-field-error">{formErrors.cost}</span>}
                </label>
            </div>
            {!trip.startDate || !trip.endDate ? (
                <p className="detail-message">
                    Add trip dates in Details before scheduling activities. This draft item will stay unscheduled.
                </p>
            ) : null}
            <button
                className="text-button itinerary-more-details-toggle"
                type="button"
                aria-expanded={isMoreDetailsOpen}
                aria-controls={editing ? "itinerary-edit-more-details" : "itinerary-add-more-details"}
                onClick={() => setIsMoreDetailsOpen((current) => !current)}
            >
                {isMoreDetailsOpen ? "Hide details" : "More details"}
            </button>
            {isMoreDetailsOpen && (
                <div
                    className="itinerary-form-row itinerary-form-row-details"
                    id={editing ? "itinerary-edit-more-details" : "itinerary-add-more-details"}
                >
                    <label className="itinerary-field itinerary-opening-hours-field">
                        <span className="field-label">Opening hours</span>
                        <span className="opening-hours">
                            <input
                                type="time"
                                aria-label="Opening time"
                                value={item.openingTime}
                                onChange={(event) => updateForm("openingTime", event.target.value, editing)}
                            />
                            <span aria-hidden="true">–</span>
                            <input
                                type="time"
                                aria-label="Closing time"
                                value={item.closingTime}
                                onChange={(event) => updateForm("closingTime", event.target.value, editing)}
                            />
                        </span>
                    </label>
                    <label className="itinerary-field">
                        <span className="field-label">Location</span>
                        <input
                            value={item.location}
                            onChange={(event) => updateForm("location", event.target.value, editing)}
                            placeholder="e.g. Carrer de Mallorca, 401"
                        />
                    </label>
                    <label className="itinerary-field">
                        <span className="field-label">Link</span>
                        <input
                            type="url"
                            value={item.externalLink}
                            onChange={(event) => updateForm("externalLink", event.target.value, editing)}
                            placeholder="https://…"
                        />
                    </label>
                    <label className="itinerary-field itinerary-notes-field">
                        <span className="field-label">Notes</span>
                        <textarea
                            value={item.note}
                            onChange={(event) => updateForm("note", event.target.value, editing)}
                            rows={2}
                        />
                    </label>
                </div>
            )}
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

    /** Renders a compact itinerary card, with secondary details available on demand. */
    const renderItem = (item: ItineraryItem) => {
        if (editingItemId === item.id) {
            return <li key={item.id}>{form(editingItem, saveEdit, true)}</li>;
        }

        const summaryDetails = [
            item.startTime ? { label: "Time", value: formatTime(item.startTime) } : null,
            item.durationMinutes !== null
                ? {
                      label: "Duration",
                      value: formatDuration(item.durationMinutes),
                  }
                : null,
            item.cost !== null
                ? {
                      label: "Price",
                      value: formatMoney(item.cost, trip.currency),
                  }
                : null,
        ].filter(Boolean);
        const openingHours = formatOpeningHours(item);
        const hasAdditionalDetails = Boolean(openingHours || item.location || item.externalLink || item.note);
        const isExpanded = expandedItemIds.has(item.id);
        const detailsId = `itinerary-details-${item.id}`;
        const openingHoursWarning = getOpeningHoursWarning(item);

        return (
            <li className="item-card" key={item.id}>
                <div className="itinerary-item-summary">
                    <div>
                        <div className="itinerary-item-title">
                            <strong>{item.name}</strong>
                        </div>
                        {(item.category || item.priority) && (
                            <div className="itinerary-item-meta">
                                {item.category && (
                                    <span className="item-metadata-label">{formatCategory(item.category)}</span>
                                )}
                                {item.priority && (
                                    <span className="item-metadata-detail">{formatPriority(item.priority)}</span>
                                )}
                            </div>
                        )}
                        {summaryDetails.length > 0 && (
                            <span className="itinerary-item-details item-metadata-detail">
                                {summaryDetails.map((detail) =>
                                    detail ? (
                                        <span key={detail.label}>
                                            <strong>{detail.label}:</strong> {detail.value}
                                        </span>
                                    ) : null,
                                )}
                            </span>
                        )}
                        {openingHoursWarning && (
                            <p className="itinerary-warning" role="status">
                                {openingHoursWarning}
                            </p>
                        )}
                    </div>
                    <div className="item-actions">
                        {hasAdditionalDetails && (
                            <button
                                className="icon-button"
                                type="button"
                                onClick={() => toggleDetails(item.id)}
                                aria-label={`${isExpanded ? "Collapse" : "Expand"} ${item.name} details`}
                                aria-expanded={isExpanded}
                                aria-controls={detailsId}
                                title={isExpanded ? "Collapse details" : "Expand details"}
                            >
                                {isExpanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                            </button>
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
                </div>
                {isExpanded && (
                    <div className="itinerary-expanded-details" id={detailsId}>
                        {openingHours && (
                            <p>
                                <strong>Opening hours:</strong> {openingHours}
                            </p>
                        )}
                        {item.location && (
                            <p>
                                <strong>Location:</strong> {item.location}
                            </p>
                        )}
                        {item.externalLink && (
                            <p>
                                <strong>Link:</strong>{" "}
                                <a href={item.externalLink} target="_blank" rel="noreferrer">
                                    {item.externalLink}
                                </a>
                            </p>
                        )}
                        {item.note && (
                            <p>
                                <strong>Notes:</strong> {item.note}
                            </p>
                        )}
                    </div>
                )}
            </li>
        );
    };

    return (
        <SectionCard className="itinerary-section">
            <SectionHeader
                title="Itinerary"
                actions={
                    <div className="itinerary-section-actions">
                        {expandableItemIds.length > 0 && (
                            <button className="text-button" type="button" onClick={toggleAllDetails}>
                                {areAllExpandableItemsExpanded ? "Collapse all" : "Expand all"}
                            </button>
                        )}
                        <button className="primary-button" type="button" onClick={() => startAdding()}>
                            Add item
                        </button>
                    </div>
                }
            />
            {isAdding && !addingForDate && form(newItem, saveNewItem)}
            {isLoading && <p className="detail-message">Loading itinerary…</p>}
            {error && <p className="detail-message form-error">{error}</p>}
            {pendingDeletion && <UndoToast message="Activity deleted." onUndo={undoDelete} />}
            {!isLoading && !error && (
                <div className="itinerary-list">
                    {getTripDays(trip).map((day) => {
                        const dayItems = sortDatedItems(items.filter((item) => item.date === day));

                        if (dayItems.length === 0) return null;

                        return (
                            <section className="itinerary-day" key={day}>
                                <div className="itinerary-day-heading">
                                    <div className="itinerary-day-title">
                                        <h3>{formatDate(day)}</h3>
                                        <button
                                            className="icon-button itinerary-day-add"
                                            type="button"
                                            onClick={() => startAdding(day)}
                                            aria-label={`Add an item for ${formatDate(day)}`}
                                            title="Add item for this day"
                                        >
                                            <Plus size={17} />
                                        </button>
                                    </div>
                                </div>
                                <ul className="list-items">{dayItems.map(renderItem)}</ul>
                                {isAdding && addingForDate === day && form(newItem, saveNewItem)}
                            </section>
                        );
                    })}
                    {sortUnscheduledItems(items.filter((item) => !item.date)).length > 0 && (
                        <section className="itinerary-day itinerary-unscheduled">
                            <h3>Unscheduled</h3>
                            <ul className="list-items">
                                {sortUnscheduledItems(items.filter((item) => !item.date)).map(renderItem)}
                            </ul>
                        </section>
                    )}
                </div>
            )}
            <FormDiscardDialog
                isOpen={isConfirmingDiscard}
                onCancel={cancelDiscardConfirmation}
                onConfirm={discardChanges}
            />
        </SectionCard>
    );
}
