import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Link } from "react-router-dom";

import {
    getBookings,
    dismissBookingActivityUpdateReview,
    linkBookingActivity,
    unlinkBookingActivity,
    type BookingActivityRole,
} from "../../api/bookingsApi";
import {
    createItineraryItem,
    deleteItineraryItem,
    dismissActivityDeletedBookingNotice,
    getItineraryItems,
    updateItineraryItem,
} from "../../api/itineraryApi";
import { formatDate, formatMoney } from "../../utils/format";
import { SectionCard } from "../shared/SectionCard";
import { SectionHeader } from "../shared/SectionHeader";
import { GroupAddButton } from "../shared/GroupAddButton";
import { ExpandableCardActions } from "../shared/ExpandableCardActions";
import { ExpandedCardDetails } from "../shared/ExpandedCardDetails";
import { FormDiscardDialog } from "../shared/FormDiscardDialog";
import { InlineMessage } from "../shared/InlineMessage";
import { ExistingRecordLinkForm } from "../shared/ExistingRecordLinkForm";
import { StatusPill } from "../shared/StatusPill";
import { UndoToast } from "../shared/UndoToast";
import { Bookings } from "../bookings/Bookings";
import { normalizeMoneyInput } from "../../utils/numberInput";
import { formatLinkChangeFields } from "../../utils/linkChangeNotice";
import {
    formatBookingRole,
    getAvailableBookingRoles,
} from "../../utils/bookingActivityLinks";
import { useFormKeyboardInteraction } from "../../utils/useFormKeyboardInteraction";
import { useExpandableCards } from "../../utils/useExpandableCards";
import {
    getItineraryResponseFormErrors,
    itineraryFormToRequest,
    validateItineraryForm,
    type ItineraryFormErrors,
} from "../../utils/itineraryForm";
import {
    createCardFocusState,
    useNavigationCardFocus,
} from "../../utils/useNavigationCardFocus";
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
import { ActivityForm } from "./ActivityForm";

import "./Itinerary.css";

type ItineraryProps = {
    trip: Trip;
    setHasUnsavedForm?: Dispatch<SetStateAction<boolean>>;
};

type PendingDeletion = {
    item: ItineraryItem;
};

const describeBookingDetails = (
    booking: Booking,
    role: BookingActivityRole,
    currency: string,
) => {
    const isReturn = role === "Return";
    const date = isReturn ? booking.returnStartDate : booking.startDate;
    const time = isReturn ? booking.returnStartTime : booking.startTime;
    const location = isReturn
        ? booking.returnStartLocation
        : role === "Outbound"
            ? booking.startLocation
            : booking.location;
    const details = [
        date ? `${formatDate(date)}${time ? ` at ${time.slice(0, 5)}` : ""}` : null,
        location,
        booking.totalCost !== null
            ? booking.totalCost === 0
                ? "Free"
                : formatMoney(booking.totalCost, currency)
            : null,
    ];

    return details.filter(Boolean).join(" · ");
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
    const [bookingLinkError, setBookingLinkError] = useState<{
        activityId: string;
        message: string;
    } | null>(null);
    const [isLinkingBooking, setIsLinkingBooking] = useState(false);
    const [creatingBookingForActivityId, setCreatingBookingForActivityId] = useState<string | null>(null);
    const [dismissingDeletedNoticeId, setDismissingDeletedNoticeId] = useState<string | null>(null);
    const [dismissingBookingChangeId, setDismissingBookingChangeId] = useState<string | null>(null);
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
        expand,
        isExpanded,
        toggleAll: toggleAllDetails,
        toggleExpanded: toggleDetails,
    } = useExpandableCards(expandableItemIds);

    const highlightedActivityId = useNavigationCardFocus({
        availableIds: items.map((item) => item.id),
        elementIdPrefix: "activity",
        expand,
    });

    useEffect(() => {
        setHasUnsavedForm?.(
            isAdding
            || editingItemId !== null
            || creatingBookingForActivityId !== null,
        );
        return () => setHasUnsavedForm?.(false);
    }, [creatingBookingForActivityId, editingItemId, isAdding, setHasUnsavedForm]);

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
        const validationErrors = validateItineraryForm(newItem, trip);
        if (Object.keys(validationErrors).length > 0) {
            setFormErrors(validationErrors);
            return;
        }

        setIsSaving(true);
        setFormError(null);
        setFormErrors({});
        try {
            const created = await createItineraryItem(trip.id, itineraryFormToRequest(newItem, trip));
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
            const responseErrors = getItineraryResponseFormErrors(message);
            if (Object.keys(responseErrors).length > 0) setFormErrors(responseErrors);
            else setFormError(message);
        } finally {
            setIsSaving(false);
        }
    };

    const saveEdit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingItemId) return;
        const validationErrors = validateItineraryForm(editingItem, trip);
        if (Object.keys(validationErrors).length > 0) {
            setFormErrors(validationErrors);
            return;
        }

        setIsSaving(true);
        setFormError(null);
        setFormErrors({});

        try {
            const updated = await updateItineraryItem(
                trip.id,
                editingItemId,
                itineraryFormToRequest(editingItem, trip),
            );
            setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
            setEditingItemId(null);
        } catch (exception) {
            const message = exception instanceof Error ? exception.message : "Could not save these changes.";
            const responseErrors = getItineraryResponseFormErrors(message);
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
                            hasPendingBookingUpdateReview: false,
                            hasPendingActivityUpdateReview: false,
                            pendingBookingChangeFields: null,
                            pendingActivityChangeFields: null,
                        },
                    ],
                }
                : candidate));
            setLinkingActivityId(null);
        } catch (exception) {
            setBookingLinkError({
                activityId: item.id,
                message: exception instanceof Error ? exception.message : "Could not link this booking.",
            });
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
            setBookingLinkError({
                activityId: item.id,
                message: exception instanceof Error ? exception.message : "Could not unlink this booking.",
            });
        } finally {
            setIsLinkingBooking(false);
        }
    };

    const dismissDeletedBookingNotice = async (itemId: string) => {
        setDismissingDeletedNoticeId(itemId);
        try {
            await dismissActivityDeletedBookingNotice(trip.id, itemId);
            setItems((current) => current.map((item) => item.id === itemId
                ? { ...item, hasPendingDeletedBookingNotice: false }
                : item));
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : "Could not dismiss this message.");
        } finally {
            setDismissingDeletedNoticeId(null);
        }
    };

    const dismissLinkedBookingChangeNotice = async (item: ItineraryItem) => {
        if (!item.bookingId) return;

        setDismissingBookingChangeId(item.id);
        try {
            await dismissBookingActivityUpdateReview(
                trip.id,
                item.bookingId,
                item.id,
                "activity",
            );
            setItems((current) => current.map((candidate) => candidate.id === item.id
                ? {
                    ...candidate,
                    hasPendingActivityUpdateReview: false,
                    pendingActivityChangeFields: null,
                }
                : candidate));
        } catch (exception) {
            setBookingLinkError({
                activityId: item.id,
                message: exception instanceof Error
                    ? exception.message
                    : "Could not dismiss this review.",
            });
        } finally {
            setDismissingBookingChangeId(null);
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
        <ActivityForm
            trip={trip}
            value={item}
            errors={formErrors}
            generalError={formError}
            isSaving={isSaving}
            isEditing={editing}
            isMoreDetailsOpen={isMoreDetailsOpen}
            formRef={formRef}
            onKeyDown={onFormKeyDown}
            onChange={(field, value) => updateForm(field, value, editing)}
            onToggleMoreDetails={() => setIsMoreDetailsOpen((current) => !current)}
            onCancel={cancelForm}
            onSubmit={(event) => void submit(event)}
        />
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
        const linkedBooking = bookings.find((booking) => booking.id === item.bookingId);
        const roleOptions = getAvailableBookingRoles(selectedBooking);

        return (
            <li
                id={`activity-${item.id}`}
                className={`item-card${highlightedActivityId === item.id ? " itinerary-item-highlighted" : ""}`}
                key={item.id}
            >
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
                {item.hasPendingDeletedBookingNotice && (
                    <InlineMessage
                        className="itinerary-deleted-link-notice"
                        variant="warning"
                        dismissLabel="Dismiss deleted booking message"
                        isDismissDisabled={dismissingDeletedNoticeId === item.id}
                        onDismiss={() => void dismissDeletedBookingNotice(item.id)}
                    >
                        The linked booking was deleted. This activity was kept.
                    </InlineMessage>
                )}
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
                                    <>
                                        <div className="itinerary-linked-booking">
                                            <Link
                                                className="internal-record-link"
                                                to={`/trips/${trip.id}/bookings`}
                                                state={createCardFocusState(item.bookingId)}
                                            >
                                                {item.bookingName ?? "View booking"}
                                                {item.bookingRole && item.bookingRole !== "General"
                                                    ? ` · ${formatBookingRole(item.bookingRole)}`
                                                    : ""}
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
                                        {item.hasPendingActivityUpdateReview && linkedBooking && (
                                            <InlineMessage
                                                variant="warning"
                                                dismissLabel="Dismiss linked booking change notice"
                                                isDismissDisabled={dismissingBookingChangeId === item.id}
                                                onDismiss={() => void dismissLinkedBookingChangeNotice(item)}
                                            >
                                                The linked booking’s{" "}
                                                {formatLinkChangeFields(
                                                    item.pendingActivityChangeFields,
                                                    item.bookingRole === "Return"
                                                        ? "return schedule"
                                                        : item.bookingRole === "Outbound"
                                                            ? "outbound schedule"
                                                            : "schedule",
                                                )}{" "}
                                                changed. Current details:{" "}
                                                {describeBookingDetails(
                                                    linkedBooking,
                                                    item.bookingRole ?? "General",
                                                    trip.currency,
                                                ) || "No schedule, location, or cost information."}
                                            </InlineMessage>
                                        )}
                                    </>
                                ) : linkingActivityId === item.id ? (
                                    <ExistingRecordLinkForm
                                        ariaLabel="Booking"
                                        value={selectedBookingId}
                                        options={bookings.map((booking) => ({
                                            value: booking.id,
                                            label: booking.name,
                                        }))}
                                        onChange={(value) => {
                                            setSelectedBookingId(value);
                                            setSelectedBookingRole("General");
                                        }}
                                        placeholder="Select a booking"
                                        actionLabel="Link booking"
                                        pendingActionLabel="Linking…"
                                        isPending={isLinkingBooking}
                                        onSubmit={() => void linkSelectedBooking(item)}
                                        onCancel={() => setLinkingActivityId(null)}
                                        secondarySelect={roleOptions.length > 1 ? {
                                            ariaLabel: "Journey part",
                                            value: selectedBookingRole,
                                            options: roleOptions.map((role) => ({
                                                value: role,
                                                label: formatBookingRole(role),
                                            })),
                                            onChange: (value) => {
                                                setSelectedBookingRole(value as BookingActivityRole);
                                            },
                                        } : undefined}
                                    />
                                ) : creatingBookingForActivityId !== item.id ? (
                                    <div className="itinerary-booking-actions">
                                        <button
                                            className="text-button"
                                            type="button"
                                            onClick={() => {
                                                setLinkingActivityId(null);
                                                setCreatingBookingForActivityId(item.id);
                                            }}
                                        >
                                            Create booking
                                        </button>
                                        {bookings.length > 0 && (
                                        <button
                                            className="text-button"
                                            type="button"
                                            onClick={() => startLinkingBooking(item.id)}
                                        >
                                            Link existing booking
                                        </button>
                                        )}
                                    </div>
                                ) : <span>Creating a booking</span>}
                                {bookingLinkError?.activityId === item.id && (
                                    <InlineMessage variant="error">
                                        {bookingLinkError.message}
                                    </InlineMessage>
                                )}
                                {creatingBookingForActivityId === item.id && (
                                    <div className="itinerary-create-booking-form">
                                        <Bookings
                                            trip={trip}
                                            embeddedDraft={{
                                                activity: item,
                                                onCancel: () => setCreatingBookingForActivityId(null),
                                                onCreated: (booking, wasLinked) => {
                                                    setBookings((current) => [...current, booking]);
                                                    if (wasLinked) {
                                                        setItems((current) => current.map((activity) => activity.id === item.id
                                                            ? {
                                                                ...activity,
                                                                bookingRequired: true,
                                                                bookingId: booking.id,
                                                                bookingRole: "General",
                                                                bookingName: booking.name,
                                                                bookingStatus: booking.status,
                                                            }
                                                            : activity));
                                                    } else {
                                                        setBookingLinkError({
                                                            activityId: item.id,
                                                            message: `“${booking.name}” was created, but it could not be linked. You can link it here as an existing booking.`,
                                                        });
                                                    }
                                                    setCreatingBookingForActivityId(null);
                                                },
                                            }}
                                        />
                                    </div>
                                )}
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
