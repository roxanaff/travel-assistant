import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { createBooking, deleteBooking, getBookings, updateBooking } from "../../api/bookingsApi";
import type { Booking, BookingForm, BookingType } from "../../types/booking";
import { createEmptyBookingForm } from "../../types/booking";
import type { Trip } from "../../types/trip";
import { formatDate, formatMoney } from "../../utils/format";
import { normalizeMoneyInput } from "../../utils/numberInput";
import { FieldLabel, FormActions, FormSurface } from "../shared/FormPrimitives";
import { SectionCard } from "../shared/SectionCard";
import { SectionHeader } from "../shared/SectionHeader";
import "./Bookings.css";

type Props = {
    trip: Trip;
    setHasUnsavedForm?: Dispatch<SetStateAction<boolean>>;
};

type FormErrors = Partial<Record<keyof BookingForm, string>>;

const typeOptions: Array<{ value: BookingType; label: string }> = [
    { value: "Accommodation", label: "Accommodation" },
    { value: "Flight", label: "Flight" },
    { value: "TrainBusFerry", label: "Train / bus / ferry" },
    { value: "LocalTransport", label: "Local transport" },
    { value: "CarHire", label: "Car hire" },
    { value: "MuseumAttraction", label: "Museum / attraction" },
    { value: "TourActivity", label: "Tour / activity" },
    { value: "ConcertEvent", label: "Concert / event" },
    { value: "Restaurant", label: "Restaurant" },
    { value: "Other", label: "Other" },
];

const typeLabels = Object.fromEntries(typeOptions.map((option) => [option.value, option.label]));
const financialLabels: Record<string, string> = {
    Free: "Free",
    Unpaid: "Unpaid",
    PartiallyPaid: "Partially paid",
    Paid: "Paid",
    NotRefunded: "Not refunded",
    PartiallyRefunded: "Partially refunded",
    FullyRefunded: "Fully refunded",
};

const isJourney = (type: BookingForm["type"]) => type === "Flight" || type === "TrainBusFerry";
const showsLocations = (type: BookingForm["type"]) =>
    type === "Flight" || type === "TrainBusFerry" || type === "CarHire";

const labelsFor = (type: BookingForm["type"]) => {
    if (type === "Accommodation") {
        return { start: "Check-in", end: "Check-out", startLocation: "Location", endLocation: "Location" };
    }
    if (type === "Flight" || type === "TrainBusFerry") {
        return { start: "Departure", end: "Arrival", startLocation: "From", endLocation: "To" };
    }
    if (type === "LocalTransport") {
        return { start: "Valid from", end: "Valid until", startLocation: "Location", endLocation: "Location" };
    }
    if (type === "CarHire") {
        return { start: "Pick-up", end: "Drop-off", startLocation: "Pick-up location", endLocation: "Drop-off location" };
    }
    return { start: "Start", end: "End", startLocation: "Location", endLocation: "Location" };
};

const toForm = (booking: Booking): BookingForm => ({
    name: booking.name,
    type: booking.type ?? "",
    status: booking.status ?? "",
    provider: booking.provider ?? "",
    confirmationNumber: booking.confirmationNumber ?? "",
    startDate: booking.startDate,
    startTime: booking.startTime?.slice(0, 5) ?? "",
    endDate: booking.endDate ?? "",
    endTime: booking.endTime?.slice(0, 5) ?? "",
    location: booking.location ?? "",
    startLocation: booking.startLocation ?? "",
    endLocation: booking.endLocation ?? "",
    hasReturnJourney: booking.returnStartDate !== null,
    returnStartDate: booking.returnStartDate ?? "",
    returnStartTime: booking.returnStartTime?.slice(0, 5) ?? "",
    returnStartLocation: booking.returnStartLocation ?? "",
    returnEndDate: booking.returnEndDate ?? "",
    returnEndTime: booking.returnEndTime?.slice(0, 5) ?? "",
    returnEndLocation: booking.returnEndLocation ?? "",
    externalLink: booking.externalLink ?? "",
    note: booking.note ?? "",
    isFree: booking.totalCost === 0,
    totalCost: booking.totalCost && booking.totalCost > 0 ? booking.totalCost.toString() : "",
    amountPaid: booking.amountPaid ? booking.amountPaid.toString() : "",
    isRefunded: booking.amountRefunded !== null && booking.amountRefunded > 0,
    amountRefunded: booking.amountRefunded?.toString() ?? "",
});

/** Renders the trip's reservation register and its create/edit workflow. */
export function Bookings({ trip, setHasUnsavedForm }: Props) {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [form, setForm] = useState<BookingForm>(createEmptyBookingForm());
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setHasUnsavedForm?.(isAdding || editingId !== null);
        return () => setHasUnsavedForm?.(false);
    }, [editingId, isAdding, setHasUnsavedForm]);

    useEffect(() => {
        void (async () => {
            try {
                setBookings(await getBookings(trip.id));
            } catch (exception) {
                setError(exception instanceof Error ? exception.message : "Could not load bookings.");
            } finally {
                setIsLoading(false);
            }
        })();
    }, [trip.id]);

    const activeBookings = useMemo(
        () => bookings.filter((booking) => booking.status !== "Cancelled"),
        [bookings],
    );
    const cancelledBookings = useMemo(
        () => bookings.filter((booking) => booking.status === "Cancelled"),
        [bookings],
    );

    const updateField = (field: keyof BookingForm, value: string | boolean) => {
        if ((field === "totalCost" || field === "amountPaid" || field === "amountRefunded") && typeof value === "string") {
            const normalized = normalizeMoneyInput(value);
            if (normalized === null) return;
            value = normalized;
        }
        setForm((current) => ({ ...current, [field]: value }));
        setFormErrors((current) => ({ ...current, [field]: undefined }));
    };

    const validate = (): FormErrors => {
        const errors: FormErrors = {};
        const total = form.totalCost === "" ? null : Number(form.totalCost);
        const paid = form.amountPaid === "" ? 0 : Number(form.amountPaid);
        const refunded = form.amountRefunded === "" ? 0 : Number(form.amountRefunded);

        if (!form.name.trim()) errors.name = "Enter a booking name.";
        if (!form.startDate) errors.startDate = "Choose a date.";
        if (form.endTime && !form.startTime) errors.endTime = "Add a start time first.";
        if (form.endDate && form.startDate && form.endDate < form.startDate) {
            errors.endDate = "End cannot be before start.";
        }
        if (form.endDate === form.startDate && form.endTime && form.startTime && form.endTime < form.startTime) {
            errors.endTime = "End cannot be before start.";
        }
        if (form.externalLink && !/^https?:\/\//i.test(form.externalLink.trim())) {
            errors.externalLink = "Enter a full http or https link.";
        }
        if (!form.isFree && total !== null && total <= 0) errors.totalCost = "Enter a positive cost or choose Free.";
        if (!form.isFree && total === null && paid > 0) errors.amountPaid = "Enter the total cost first.";
        if (total !== null && paid > total) errors.amountPaid = "Amount paid cannot exceed the total cost.";
        if (refunded > paid) errors.amountRefunded = "Amount refunded cannot exceed the amount paid.";
        if (form.hasReturnJourney && !form.returnStartDate) errors.returnStartDate = "Choose a return departure date.";
        if (form.returnStartDate && form.startDate && form.returnStartDate < form.startDate) {
            errors.returnStartDate = "Return cannot depart before the outbound journey.";
        }
        return errors;
    };

    const save = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const errors = validate();
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setIsSaving(true);
        setFormError(null);
        try {
            const saved = editingId
                ? await updateBooking(trip.id, editingId, form)
                : await createBooking(trip.id, form);
            setBookings((current) => {
                const next = editingId
                    ? current.map((booking) => (booking.id === saved.id ? saved : booking))
                    : [...current, saved];
                return next.sort(compareBookings);
            });
            setExpandedIds((current) => new Set(current).add(saved.id));
            closeForm();
        } catch (exception) {
            setFormError(exception instanceof Error ? exception.message : "Could not save this booking.");
        } finally {
            setIsSaving(false);
        }
    };

    const startAdding = () => {
        setEditingId(null);
        setForm(createEmptyBookingForm());
        setFormErrors({});
        setFormError(null);
        setIsAdding(true);
    };

    const startEditing = (booking: Booking) => {
        setIsAdding(false);
        setEditingId(booking.id);
        setForm(toForm(booking));
        setFormErrors({});
        setFormError(null);
        setExpandedIds((current) => new Set(current).add(booking.id));
    };

    const closeForm = () => {
        setIsAdding(false);
        setEditingId(null);
        setForm(createEmptyBookingForm());
        setFormErrors({});
        setFormError(null);
    };

    const remove = async (booking: Booking) => {
        const hasLinks = booking.activityLinks.length > 0 || booking.plannedCostId !== null;
        const message = hasLinks
            ? "Delete this booking? Its related activities and budget entries will be kept and unlinked."
            : "Delete this booking?";
        if (!window.confirm(message)) return;

        try {
            await deleteBooking(trip.id, booking.id);
            setBookings((current) => current.filter((item) => item.id !== booking.id));
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : "Could not delete this booking.");
        }
    };

    const toggleExpanded = (id: string) => {
        setExpandedIds((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const allExpanded = bookings.length > 0 && bookings.every((booking) => expandedIds.has(booking.id));
    const toggleAll = () => setExpandedIds(allExpanded ? new Set() : new Set(bookings.map((booking) => booking.id)));

    const renderFieldError = (field: keyof BookingForm) =>
        formErrors[field] ? <span className="form-field-error">{formErrors[field]}</span> : null;

    const renderForm = () => {
        const labels = labelsFor(form.type);
        const hasPositiveCost = !form.isFree && Number(form.totalCost) > 0;
        const showRefund = form.status === "Cancelled" && Number(form.amountPaid) > 0;
        const outsideTrip =
            form.startDate &&
            trip.startDate &&
            trip.endDate &&
            (form.startDate < trip.startDate || form.startDate > trip.endDate);

        return (
            <FormSurface className="booking-form" onSubmit={save}>
                <div className="booking-form-grid">
                    <label className="booking-name-field">
                        <FieldLabel required>Name</FieldLabel>
                        <input value={form.name} maxLength={150} onChange={(event) => updateField("name", event.target.value)} />
                        {renderFieldError("name")}
                    </label>
                    <label>
                        <FieldLabel>Type</FieldLabel>
                        <select value={form.type} onChange={(event) => updateField("type", event.target.value)}>
                            <option value="">Not specified</option>
                            {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    </label>
                    <label>
                        <FieldLabel>Booking status</FieldLabel>
                        <select value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                            <option value="">Not specified</option>
                            <option value="Requested">Requested</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </label>
                    <label>
                        <FieldLabel>Provider</FieldLabel>
                        <input value={form.provider} maxLength={200} placeholder="Hotel, airline, restaurant, or booking platform" onChange={(event) => updateField("provider", event.target.value)} />
                    </label>
                    <label>
                        <FieldLabel>Confirmation / reference number</FieldLabel>
                        <input value={form.confirmationNumber} maxLength={100} onChange={(event) => updateField("confirmationNumber", event.target.value)} />
                    </label>
                </div>

                {isJourney(form.type) && <h4>Outbound</h4>}
                <div className="booking-form-grid booking-schedule-grid">
                    <label>
                        <FieldLabel required>{labels.start} date</FieldLabel>
                        <input type="date" value={form.startDate} onChange={(event) => updateField("startDate", event.target.value)} />
                        {renderFieldError("startDate")}
                    </label>
                    <label>
                        <FieldLabel>{labels.start} time</FieldLabel>
                        <input type="time" value={form.startTime} onChange={(event) => updateField("startTime", event.target.value)} />
                    </label>
                    <label>
                        <FieldLabel>{labels.end} date</FieldLabel>
                        <input type="date" value={form.endDate} onChange={(event) => updateField("endDate", event.target.value)} />
                        {renderFieldError("endDate")}
                    </label>
                    <label>
                        <FieldLabel>{labels.end} time</FieldLabel>
                        <input type="time" value={form.endTime} onChange={(event) => updateField("endTime", event.target.value)} />
                        {renderFieldError("endTime")}
                    </label>
                    {showsLocations(form.type) ? (
                        <>
                            <label>
                                <FieldLabel>{labels.startLocation}</FieldLabel>
                                <input value={form.startLocation} onChange={(event) => updateField("startLocation", event.target.value)} />
                            </label>
                            <label>
                                <FieldLabel>{labels.endLocation}</FieldLabel>
                                <input value={form.endLocation} onChange={(event) => updateField("endLocation", event.target.value)} />
                            </label>
                        </>
                    ) : (
                        <label className="booking-location-field">
                            <FieldLabel>Location</FieldLabel>
                            <input value={form.location} onChange={(event) => updateField("location", event.target.value)} />
                        </label>
                    )}
                </div>
                {outsideTrip && <p className="booking-warning">This date is outside the trip dates. You can still save the booking.</p>}

                {isJourney(form.type) && (
                    <div className="booking-return-section">
                        <label className="booking-checkbox">
                            <input type="checkbox" checked={form.hasReturnJourney} onChange={(event) => updateField("hasReturnJourney", event.target.checked)} />
                            Add return journey
                        </label>
                        {form.hasReturnJourney && (
                            <>
                                <h4>Return</h4>
                                <div className="booking-form-grid booking-schedule-grid">
                                    <label><FieldLabel required>Departure date</FieldLabel><input type="date" value={form.returnStartDate} onChange={(event) => updateField("returnStartDate", event.target.value)} />{renderFieldError("returnStartDate")}</label>
                                    <label><FieldLabel>Departure time</FieldLabel><input type="time" value={form.returnStartTime} onChange={(event) => updateField("returnStartTime", event.target.value)} /></label>
                                    <label><FieldLabel>Arrival date</FieldLabel><input type="date" value={form.returnEndDate} onChange={(event) => updateField("returnEndDate", event.target.value)} /></label>
                                    <label><FieldLabel>Arrival time</FieldLabel><input type="time" value={form.returnEndTime} onChange={(event) => updateField("returnEndTime", event.target.value)} /></label>
                                    <label><FieldLabel>From</FieldLabel><input value={form.returnStartLocation} onChange={(event) => updateField("returnStartLocation", event.target.value)} /></label>
                                    <label><FieldLabel>To</FieldLabel><input value={form.returnEndLocation} onChange={(event) => updateField("returnEndLocation", event.target.value)} /></label>
                                </div>
                            </>
                        )}
                    </div>
                )}

                <div className="booking-money-section">
                    <label className="booking-checkbox">
                        <input type="checkbox" checked={form.isFree} onChange={(event) => updateField("isFree", event.target.checked)} />
                        Free
                    </label>
                    {!form.isFree && (
                        <div className="booking-form-grid booking-money-grid">
                            <label><FieldLabel>Total cost ({trip.currency})</FieldLabel><input inputMode="decimal" value={form.totalCost} onChange={(event) => updateField("totalCost", event.target.value)} />{renderFieldError("totalCost")}</label>
                            {hasPositiveCost && <label><FieldLabel>Amount paid ({trip.currency})</FieldLabel><input inputMode="decimal" value={form.amountPaid} placeholder="0" onChange={(event) => updateField("amountPaid", event.target.value)} />{renderFieldError("amountPaid")}</label>}
                            {showRefund && (
                                <label className="booking-checkbox booking-refunded-checkbox">
                                    <input type="checkbox" checked={form.isRefunded} onChange={(event) => {
                                        updateField("isRefunded", event.target.checked);
                                        if (event.target.checked && !form.amountRefunded) updateField("amountRefunded", form.amountPaid);
                                    }} />
                                    Refunded
                                </label>
                            )}
                            {showRefund && form.isRefunded && <label><FieldLabel>Amount refunded ({trip.currency})</FieldLabel><input inputMode="decimal" value={form.amountRefunded} onChange={(event) => updateField("amountRefunded", event.target.value)} />{renderFieldError("amountRefunded")}</label>}
                        </div>
                    )}
                </div>

                <div className="booking-form-grid booking-details-grid">
                    <label><FieldLabel>Link</FieldLabel><input type="url" value={form.externalLink} placeholder="Booking page, ticket, or confirmation link" onChange={(event) => updateField("externalLink", event.target.value)} />{renderFieldError("externalLink")}</label>
                    <label><FieldLabel>Notes</FieldLabel><textarea rows={3} value={form.note} maxLength={1000} onChange={(event) => updateField("note", event.target.value)} /></label>
                </div>
                {formError && <p className="form-error">{formError}</p>}
                <FormActions>
                    <button className="text-button" type="button" onClick={closeForm}>Cancel</button>
                    <button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? "Saving…" : editingId ? "Save changes" : "Add booking"}</button>
                </FormActions>
            </FormSurface>
        );
    };

    const renderBooking = (booking: Booking) => {
        const expanded = expandedIds.has(booking.id);
        const labels = labelsFor(booking.type ?? "");
        return (
            <li className={`item-card booking-card${booking.status === "Cancelled" ? " booking-card-cancelled" : ""}`} key={booking.id}>
                <div className="booking-summary">
                    <button className="booking-summary-button" type="button" onClick={() => toggleExpanded(booking.id)} aria-expanded={expanded}>
                        <span className="booking-title-line"><strong>{booking.name}</strong><span>{formatDate(booking.startDate)}{booking.startTime ? ` · ${booking.startTime.slice(0, 5)}` : ""}</span></span>
                        <span className="booking-summary-meta">
                            {booking.type && <span>{typeLabels[booking.type]}</span>}
                            {booking.totalCost !== null && <span>{booking.totalCost === 0 ? "Free" : formatMoney(booking.totalCost, trip.currency)}</span>}
                        </span>
                    </button>
                    <div className="booking-statuses">
                        {booking.status && <span className="status-pill">{booking.status}</span>}
                        {booking.financialStatus && <span className="status-pill booking-financial-pill">{financialLabels[booking.financialStatus]}</span>}
                    </div>
                    <div className="item-actions">
                        <button className="icon-button" type="button" aria-label={`Edit ${booking.name}`} onClick={() => startEditing(booking)}><Pencil size={17} /></button>
                        <button className="icon-button danger-button" type="button" aria-label={`Delete ${booking.name}`} onClick={() => void remove(booking)}><Trash2 size={17} /></button>
                        <button className="icon-button" type="button" aria-label={`${expanded ? "Collapse" : "Expand"} ${booking.name}`} onClick={() => toggleExpanded(booking.id)}>{expanded ? <ChevronUp size={19} /> : <ChevronDown size={19} />}</button>
                    </div>
                </div>
                {editingId === booking.id ? renderForm() : expanded && (
                    <div className="booking-expanded-details">
                        <div className="booking-detail-grid">
                            <p><strong>{labels.start}:</strong> {formatDate(booking.startDate)}{booking.startTime ? ` at ${booking.startTime.slice(0, 5)}` : ""}</p>
                            {(booking.endDate || booking.endTime) && <p><strong>{labels.end}:</strong> {formatDate(booking.endDate ?? booking.startDate)}{booking.endTime ? ` at ${booking.endTime.slice(0, 5)}` : ""}</p>}
                            {booking.provider && <p><strong>Provider:</strong> {booking.provider}</p>}
                            {booking.confirmationNumber && <p><strong>Reference:</strong> {booking.confirmationNumber}</p>}
                            {(booking.location || booking.startLocation) && <p><strong>Location:</strong> {booking.location ?? booking.startLocation}{booking.endLocation ? ` → ${booking.endLocation}` : ""}</p>}
                            {booking.totalCost !== null && booking.totalCost > 0 && <p><strong>Total cost:</strong> {formatMoney(booking.totalCost, trip.currency)}</p>}
                            {booking.totalCost !== null && booking.totalCost > 0 && <p><strong>Amount paid:</strong> {formatMoney(booking.amountPaid, trip.currency)}</p>}
                            {booking.amountRefunded !== null && <p><strong>Amount refunded:</strong> {formatMoney(booking.amountRefunded, trip.currency)}{booking.netCost > 0 ? ` · Net cost ${formatMoney(booking.netCost, trip.currency)}` : ""}</p>}
                            {booking.returnStartDate && <p><strong>Return:</strong> {formatDate(booking.returnStartDate)}{booking.returnStartTime ? ` at ${booking.returnStartTime.slice(0, 5)}` : ""}</p>}
                        </div>
                        {booking.externalLink && <p><strong>Link:</strong> <a href={booking.externalLink} target="_blank" rel="noreferrer">Open booking</a></p>}
                        {booking.note && <p><strong>Notes:</strong> {booking.note}</p>}
                    </div>
                )}
            </li>
        );
    };

    return (
        <SectionCard className="bookings-section">
            <SectionHeader title="Bookings" actions={<div className="booking-section-actions">{bookings.length > 0 && <button className="text-button" type="button" onClick={toggleAll}>{allExpanded ? "Collapse all" : "Expand all"}</button>}<button className="primary-button" type="button" onClick={startAdding}>Add booking</button></div>} />
            {isAdding && renderForm()}
            {isLoading && <p className="detail-message">Loading bookings…</p>}
            {error && <p className="detail-message form-error">{error}</p>}
            {!isLoading && !error && bookings.length === 0 && !isAdding && <div className="booking-empty-state"><h3>No bookings yet</h3><p>Keep reservation details, confirmations, dates, and costs together.</p><button className="primary-button" type="button" onClick={startAdding}>Add booking</button></div>}
            {activeBookings.length > 0 && <ul className="list-items booking-list">{activeBookings.map(renderBooking)}</ul>}
            {cancelledBookings.length > 0 && <section className="cancelled-bookings"><h3>Cancelled</h3><ul className="list-items booking-list">{cancelledBookings.map(renderBooking)}</ul></section>}
        </SectionCard>
    );
}

function compareBookings(left: Booking, right: Booking) {
    if ((left.status === "Cancelled") !== (right.status === "Cancelled")) {
        return left.status === "Cancelled" ? 1 : -1;
    }
    return left.startDate.localeCompare(right.startDate)
        || Number(left.startTime === null) - Number(right.startTime === null)
        || (left.startTime ?? "").localeCompare(right.startTime ?? "")
        || left.createdAtUtc.localeCompare(right.createdAtUtc);
}

