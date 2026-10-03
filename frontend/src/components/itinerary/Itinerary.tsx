import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Link } from "react-router-dom";

import {
    getBookings,
    linkBookingActivity,
    unlinkBookingActivity,
    type BookingActivityRole,
} from "../../api/bookingsApi";
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
import { GroupAddButton } from "../shared/GroupAddButton";
import { FormActions, FormSurface } from "../shared/FormPrimitives";
import { ExpandableCardActions } from "../shared/ExpandableCardActions";
import { ExpandedCardDetails } from "../shared/ExpandedCardDetails";
import { FormDetailsToggle } from "../shared/FormDetailsToggle";
import { FormDiscardDialog } from "../shared/FormDiscardDialog";
import { InlineMessage } from "../shared/InlineMessage";
import { StatusPill } from "../shared/StatusPill";
import { UndoToast } from "../shared/UndoToast";
import { normalizeMoneyInput } from "../../utils/numberInput";
import { useFormKeyboardInteraction } from "../../utils/useFormKeyboardInteraction";
import { useExpandableCards } from "../../utils/useExpandableCards";
import type { Trip } from "../../types/trip";
import type { Booking } from "../../types/booking";
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
    const [bookings, setBookings] = useState<Booking[]>([]);
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
    const [isMoreDetailsOpen, setIsMoreDetailsOpen] = useState(false);
    const [linkingActivityId, setLinkingActivityId] = useState<string | null>(null);
    const [selectedBookingId, setSelectedBookingId] = useState("");
    const [selectedBookingRole, setSelectedBookingRole] = useState<BookingActivityRole>("General");
    const [bookingLinkError, setBookingLinkError] = useState<string | null>(null);
    const [isLinkingBooking, setIsLinkingBooking] = useState(false);
    const expandableItemIds = items
        .filter((item) =>
            item.openingTime
            || item.closingTime
            || item.location
            || item.externalLink
            || item.note
            || item.bookingRequired
            || item.bookingId,
        )
        .map((item) => item.id);
    const {
        areAllExpanded: areAllExpandableItemsExpanded,
        collapse,
        isExpanded,
        toggleAll: toggleAllDetails,
        toggleExpanded: toggleDetails,
    } = useExpandableCards(expandableItemIds);

    useEffect(() => {
        setHasUnsavedForm?.(isAdding || editingItemId !== null);
        return () => setHasUnsavedForm?.(false);
    }, [editingItemId, isAdding, setHasUnsavedForm]);

    useEffect(() => {
        const loadItems = async () => {
            try {
                setItems(await getItineraryItems(trip.id));
                try {
                    setBookings(await getBookings(trip.id));
                } catch {
                    setBookings([]);
                }
            } catch {
                setError("Could not load itinerary items.");
            } finally {
                setIsLoading(false);
            }
        };
        void loadItems();
    }, [trip.id]);

    const updateForm = (field: keyof ItineraryItemForm, value: string | boolean, editing = false) => {
        if (field === "cost") {
            const normalized = normalizeMoneyInput(value as string);
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
        bookingRequired: item.bookingRequired,
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
        } else if (item.name.trim().length > 150) {
            errors.name = "Activity name cannot exceed 150 characters.";
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
        if (message.toLowerCase().includes("name")) return { name: message };
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

        collapse(item.id);

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

    const startLinkingBooking = (itemId: string) => {
        setLinkingActivityId(itemId);
        setSelectedBookingId("");
        setSelectedBookingRole("General");
        setBookingLinkError(null);
    };

    const linkSelectedBooking = async (item: ItineraryItem) => {
        const booking = bookings.find((candidate) => candidate.id === selectedBookingId);
        if (!booking) return;

        setIsLinkingBooking(true);
        setBookingLinkError(null);
        try {
            await linkBookingActivity(trip.id, booking.id, item.id, selectedBookingRole);
            setItems((current) => current.map((candidate) => candidate.id === item.id
                ? {
                    ...candidate,
                    bookingRequired: true,
                    bookingId: booking.id,
                    bookingRole: selectedBookingRole,
                    bookingName: booking.name,
                    bookingStatus: booking.status,
                }
                : candidate));
            setBookings((current) => current.map((candidate) => candidate.id === booking.id
                ? {
                    ...candidate,
                    activityLinks: [
                        ...candidate.activityLinks.filter((link) => link.id !== item.id),
                        {
                            id: item.id,
                            name: item.name,
                            date: item.date,
                            startTime: item.startTime,
                            role: selectedBookingRole,
                        },
                    ],
                }
                : candidate));
            setLinkingActivityId(null);
        } catch (exception) {
            setBookingLinkError(exception instanceof Error ? exception.message : "Could not link this booking.");
        } finally {
            setIsLinkingBooking(false);
        }
    };

    const unlinkBooking = async (item: ItineraryItem) => {
        if (!item.bookingId) return;

        setIsLinkingBooking(true);
        setBookingLinkError(null);
        try {
            await unlinkBookingActivity(trip.id, item.bookingId, item.id);
            setItems((current) => current.map((candidate) => candidate.id === item.id
                ? {
                    ...candidate,
                    bookingId: null,
                    bookingRole: null,
                    bookingName: null,
                    bookingStatus: null,
                }
                : candidate));
            setBookings((current) => current.map((booking) => ({
                ...booking,
                activityLinks: booking.activityLinks.filter((link) => link.id !== item.id),
            })));
        } catch (exception) {
            setBookingLinkError(exception instanceof Error ? exception.message : "Could not unlink this booking.");
        } finally {
            setIsLinkingBooking(false);
        }
    };

    const startEditing = (item: ItineraryItem) => {
        setIsAdding(false);
        setAddingForDate(null);
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
            bookingRequired: item.bookingRequired,
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
                        maxLength={150}
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
            <label className="itinerary-booking-required">
                <input
                    type="checkbox"
                    checked={item.bookingRequired}
                    onChange={(event) => updateForm("bookingRequired", event.target.checked, editing)}
                />
                Booking required
            </label>
            {!trip.startDate || !trip.endDate ? (
                <p className="detail-message">
                    Add trip dates in Details before scheduling activities. This draft item will stay unscheduled.
                </p>
            ) : null}
            <FormDetailsToggle
                isExpanded={isMoreDetailsOpen}
                controlsId={editing ? "itinerary-edit-more-details" : "itinerary-add-more-details"}
                onToggle={() => setIsMoreDetailsOpen((current) => !current)}
            />
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
                            maxLength={300}
                            onChange={(event) => updateForm("location", event.target.value, editing)}
                            placeholder="e.g. Carrer de Mallorca, 401"
                        />
                    </label>
                    <label className="itinerary-field">
                        <span className="field-label">Link</span>
                        <input
                            type="url"
                            value={item.externalLink}
                            maxLength={2000}
                            onChange={(event) => updateForm("externalLink", event.target.value, editing)}
                            placeholder="https://…"
                        />
                    </label>
                    <label className="itinerary-field itinerary-notes-field">
                        <span className="field-label">Notes</span>
                        <textarea
                            value={item.note}
                            maxLength={1000}
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
        const hasAdditionalDetails = Boolean(
            openingHours
            || item.location
            || item.externalLink
            || item.note
            || item.bookingRequired
            || item.bookingId,
        );
        const itemIsExpanded = isExpanded(item.id);
        const detailsId = `itinerary-details-${item.id}`;
        const openingHoursWarning = getOpeningHoursWarning(item);
        const bookingState = getBookingState(item);
        const selectedBooking = bookings.find((booking) => booking.id === selectedBookingId);
        const roleOptions = getAvailableBookingRoles(selectedBooking);

        return (
            <li className="item-card" key={item.id}>
                <div className="itinerary-item-summary">
                    <div
                        className={hasAdditionalDetails ? "itinerary-item-main itinerary-item-main-expandable" : "itinerary-item-main"}
                        role={hasAdditionalDetails ? "button" : undefined}
                        tabIndex={hasAdditionalDetails ? 0 : undefined}
                        aria-expanded={hasAdditionalDetails ? itemIsExpanded : undefined}
                        aria-controls={hasAdditionalDetails ? detailsId : undefined}
                        onClick={hasAdditionalDetails ? () => toggleDetails(item.id) : undefined}
                        onKeyDown={hasAdditionalDetails ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                toggleDetails(item.id);
                            }
                        } : undefined}
                    >
                        <div className="itinerary-item-title">
                            <strong>{item.name}</strong>
                        </div>
                        {(item.category || summaryDetails.length > 0) && (
                            <div className="itinerary-item-meta item-metadata-detail">
                                {item.category && (
                                <span className="item-metadata-label">{formatCategory(item.category)}</span>
                                )}
                                {summaryDetails.map((detail) =>
                                    detail ? (
                                        <span key={detail.label}>
                                            <strong>{detail.label}:</strong> {detail.value}
                                        </span>
                                    ) : null,
                                )}
                            </div>
                        )}
                        {openingHoursWarning && (
                            <InlineMessage variant="warning">
                                {openingHoursWarning}
                            </InlineMessage>
                        )}
                    </div>
                    <div className="itinerary-item-controls">
                        <div className="itinerary-statuses">
                            {item.priority && (
                                <StatusPill>
                                    {formatPriority(item.priority)}
                                </StatusPill>
                            )}
                            {bookingState && <StatusPill>{bookingState}</StatusPill>}
                        </div>
                        <ExpandableCardActions
                            itemName={item.name}
                            hasAdditionalDetails={hasAdditionalDetails}
                            isExpanded={itemIsExpanded}
                            detailsId={detailsId}
                            onToggle={() => toggleDetails(item.id)}
                            onEdit={() => startEditing(item)}
                            onDelete={() => void deleteItem(item)}
                        />
                    </div>
                </div>
                {itemIsExpanded && (
                    <ExpandedCardDetails className="itinerary-expanded-details" id={detailsId}>
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
                                <a
                                    className="itinerary-inline-link"
                                    href={item.externalLink}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {item.externalLink}
                                </a>
                            </p>
                        )}
                        {(item.bookingRequired || item.bookingId) && (
                            <section className="itinerary-booking-section">
                                <strong>Booking:</strong>
                                {item.bookingId ? (
                                    <div className="itinerary-linked-booking">
                                        <Link
                                            className="itinerary-inline-link"
                                            to={`/trips/${trip.id}/bookings?focus=${item.bookingId}`}
                                        >
                                            {item.bookingName ?? "View booking"}
                                        </Link>
                                        <button
                                            className="text-button"
                                            type="button"
                                            disabled={isLinkingBooking}
                                            onClick={() => void unlinkBooking(item)}
                                        >
                                            Unlink
                                        </button>
                                    </div>
                                ) : linkingActivityId === item.id ? (
                                    <div className="itinerary-booking-link-form">
                                        <select
                                            aria-label="Booking"
                                            value={selectedBookingId}
                                            onChange={(event) => {
                                                setSelectedBookingId(event.target.value);
                                                setSelectedBookingRole("General");
                                            }}
                                        >
                                            <option value="" disabled hidden>Select a booking</option>
                                            {bookings.map((booking) => (
                                                <option key={booking.id} value={booking.id}>{booking.name}</option>
                                            ))}
                                        </select>
                                        {roleOptions.length > 1 && (
                                            <select
                                                aria-label="Journey part"
                                                value={selectedBookingRole}
                                                onChange={(event) => setSelectedBookingRole(event.target.value as BookingActivityRole)}
                                            >
                                                {roleOptions.map((role) => (
                                                    <option key={role} value={role}>{formatBookingRole(role)}</option>
                                                ))}
                                            </select>
                                        )}
                                        <button
                                            className="primary-button"
                                            type="button"
                                            disabled={!selectedBookingId || isLinkingBooking}
                                            onClick={() => void linkSelectedBooking(item)}
                                        >
                                            {isLinkingBooking ? "Linking…" : "Link booking"}
                                        </button>
                                        <button
                                            className="text-button"
                                            type="button"
                                            onClick={() => setLinkingActivityId(null)}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    bookings.length > 0 ? (
                                        <button
                                            className="text-button"
                                            type="button"
                                            onClick={() => startLinkingBooking(item.id)}
                                        >
                                            Link existing booking
                                        </button>
                                    ) : <span>No bookings yet</span>
                                )}
                                {bookingLinkError && <InlineMessage variant="error">{bookingLinkError}</InlineMessage>}
                            </section>
                        )}
                        {item.note && (
                            <p className="itinerary-detail-row itinerary-notes-detail">
                                <strong>Notes:</strong>
                                <span>{item.note}</span>
                            </p>
                        )}
                    </ExpandedCardDetails>
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
                                        <GroupAddButton
                                            label={`Add an item for ${formatDate(day)}`}
                                            onClick={() => startAdding(day)}
                                        />
                                    </div>
                                </div>
                                {isAdding && addingForDate === day && form(newItem, saveNewItem)}
                                <ul className="list-items card-list">{dayItems.map(renderItem)}</ul>
                            </section>
                        );
                    })}
                    {sortUnscheduledItems(items.filter((item) => !item.date)).length > 0 && (
                        <section className="itinerary-day itinerary-unscheduled">
                            <h3>Unscheduled</h3>
                            <ul className="list-items card-list">
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

function getBookingState(item: ItineraryItem) {
    if (item.bookingId) {
        if (item.bookingStatus === "Requested") return "Booking requested";
        if (item.bookingStatus === "Confirmed") return "Booked";
        if (item.bookingStatus === "Cancelled") return "Booking cancelled";
        return "Booking linked";
    }

    return item.bookingRequired ? "Booking required" : null;
}

function getAvailableBookingRoles(booking: Booking | undefined): BookingActivityRole[] {
    if (!booking || (booking.category !== "Flight" && booking.category !== "RailBusFerry")) {
        return ["General"];
    }

    const usedRoles = new Set(booking.activityLinks.map((link) => link.role));
    return [
        "General",
        ...(!usedRoles.has("Outbound") ? ["Outbound" as const] : []),
        ...(booking.returnStartDate && !usedRoles.has("Return") ? ["Return" as const] : []),
    ];
}

function formatBookingRole(role: BookingActivityRole) {
    if (role === "Outbound") return "Outbound journey";
    if (role === "Return") return "Return journey";
    return "General activity";
}
