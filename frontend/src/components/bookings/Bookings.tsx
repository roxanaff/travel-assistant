import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useSearchParams } from "react-router-dom";
import { createBooking, deleteBooking, getBookings, updateBooking } from "../../api/bookingsApi";
import type { Booking, BookingCategory, BookingForm } from "../../types/booking";
import { createEmptyBookingForm } from "../../types/booking";
import type { Trip } from "../../types/trip";
import { formatDate, formatMoney } from "../../utils/format";
import { normalizeMoneyInput } from "../../utils/numberInput";
import { useExpandableCards } from "../../utils/useExpandableCards";
import { ExpandedCardDetails } from "../shared/ExpandedCardDetails";
import { FieldLabel, FormActions, FormSurface } from "../shared/FormPrimitives";
import { FormDetailsToggle } from "../shared/FormDetailsToggle";
import { ExpandableCardActions } from "../shared/ExpandableCardActions";
import { InlineMessage } from "../shared/InlineMessage";
import { SectionCard } from "../shared/SectionCard";
import { SectionHeader } from "../shared/SectionHeader";
import { StatusPill } from "../shared/StatusPill";
import "./Bookings.css";

type Props = {
    trip: Trip;
    setHasUnsavedForm?: Dispatch<SetStateAction<boolean>>;
};

type FormErrors = Partial<Record<keyof BookingForm, string>>;

const immediateErrorFields: Array<keyof BookingForm> = [
    "endDate",
    "endTime",
    "totalCost",
    "amountPaid",
    "amountRefunded",
    "returnStartDate",
    "returnEndDate",
    "returnEndTime",
];

const categoryOptions: Array<{ value: BookingCategory; label: string }> = [
    { value: "Accommodation", label: "Accommodation" },
    { value: "Flight", label: "Flight" },
    { value: "RailBusFerry", label: "Rail, bus & ferry" },
    { value: "LocalTransport", label: "Local transport" },
    { value: "CarHire", label: "Car hire" },
    { value: "MuseumAttraction", label: "Museum / attraction" },
    { value: "TourActivity", label: "Tour / activity" },
    { value: "ConcertEvent", label: "Concert / event" },
    { value: "Restaurant", label: "Restaurant" },
    { value: "Other", label: "Other" },
];

const categoryLabels = Object.fromEntries(categoryOptions.map((option) => [option.value, option.label]));
const financialLabels: Record<string, string> = {
    Free: "Free",
    Unpaid: "Unpaid",
    PartiallyPaid: "Partially paid",
    Paid: "Paid",
    NotRefunded: "Not refunded",
    PartiallyRefunded: "Partially refunded",
    FullyRefunded: "Fully refunded",
};

const isJourney = (category: BookingForm["category"]) =>
    category === "Flight" || category === "RailBusFerry";
const showsLocations = (category: BookingForm["category"]) =>
    category === "Flight" || category === "RailBusFerry" || category === "CarHire";

const labelsFor = (category: BookingForm["category"]) => {
    if (category === "Accommodation") {
        return { start: "Check-in", end: "Check-out", startLocation: "Location", endLocation: "Location" };
    }
    if (category === "Flight" || category === "RailBusFerry") {
        return { start: "Departure", end: "Arrival", startLocation: "From", endLocation: "To" };
    }
    if (category === "LocalTransport") {
        return { start: "Valid from", end: "Valid until", startLocation: "Location", endLocation: "Location" };
    }
    if (category === "CarHire") {
        return { start: "Pick-up", end: "Drop-off", startLocation: "Pick-up location", endLocation: "Drop-off location" };
    }
    return { start: "Start", end: "End", startLocation: "Location", endLocation: "Location" };
};

const getImmediateErrors = (values: BookingForm): FormErrors => {
    const errors: FormErrors = {};
    const total = values.totalCost === "" ? null : Number(values.totalCost);
    const paid = values.amountPaid === "" ? 0 : Number(values.amountPaid);
    const refunded = values.amountRefunded === "" ? 0 : Number(values.amountRefunded);

    if (values.endDate && values.startDate && values.endDate < values.startDate) {
        errors.endDate = "End cannot be before start.";
    }
    if (
        values.endDate === values.startDate
        && values.endTime
        && values.startTime
        && values.endTime < values.startTime
    ) {
        errors.endTime = "End cannot be before start.";
    }
    if (values.costState === "HasCost") {
        if (total !== null && total <= 0) {
            errors.totalCost = "Enter a positive total cost.";
        }
        if (total !== null && paid > total) {
            errors.amountPaid = "Amount paid cannot exceed the total cost.";
        }
        if (refunded > paid) {
            errors.amountRefunded = "Amount refunded cannot exceed the amount paid.";
        }
        if (refunded > 0 && values.status !== "Cancelled") {
            errors.amountRefunded = "Refunds can be recorded only for a cancelled booking.";
        }
    }
    if (values.returnStartDate && values.startDate && values.returnStartDate < values.startDate) {
        errors.returnStartDate = "Return cannot depart before the outbound journey.";
    }
    if (
        values.returnStartDate === values.startDate
        && values.returnStartTime
        && values.startTime
        && values.returnStartTime < values.startTime
    ) {
        errors.returnStartDate = "Return cannot depart before the outbound journey.";
    }

    const returnEndDate = values.returnEndDate || (values.returnEndTime ? values.returnStartDate : "");
    if (returnEndDate && values.returnStartDate && returnEndDate < values.returnStartDate) {
        errors.returnEndDate = "Return arrival cannot be before return departure.";
    }
    if (
        returnEndDate === values.returnStartDate
        && values.returnEndTime
        && values.returnStartTime
        && values.returnEndTime < values.returnStartTime
    ) {
        errors.returnEndTime = "Return arrival cannot be before return departure.";
    }

    return errors;
};

const toForm = (booking: Booking): BookingForm => ({
    name: booking.name,
    category: booking.category ?? "",
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
    costState: booking.totalCost === 0 ? "Free" : booking.totalCost === null ? "NotEntered" : "HasCost",
    totalCost: booking.totalCost && booking.totalCost > 0 ? booking.totalCost.toString() : "",
    amountPaid: booking.amountPaid ? booking.amountPaid.toString() : "",
    isRefunded: booking.amountRefunded !== null && booking.amountRefunded > 0,
    amountRefunded: booking.amountRefunded?.toString() ?? "",
});

/** Renders the trip's reservation register and its create/edit workflow. */
export function Bookings({ trip, setHasUnsavedForm }: Props) {
    const [searchParams] = useSearchParams();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<BookingForm>(createEmptyBookingForm());
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isMoreDetailsOpen, setIsMoreDetailsOpen] = useState(false);
    const [costInfo, setCostInfo] = useState<string | null>(null);
    const [highlightedBookingId, setHighlightedBookingId] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const handledFocusIdRef = useRef<string | null>(null);

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
    const expandableBookingIds = useMemo(
        () => bookings.filter(hasAdditionalBookingDetails).map((booking) => booking.id),
        [bookings],
    );
    const {
        areAllExpanded: allExpanded,
        expand,
        isExpanded,
        toggleAll,
        toggleExpanded,
    } = useExpandableCards(expandableBookingIds);

    useEffect(() => {
        const focusId = searchParams.get("focus");
        if (!focusId || handledFocusIdRef.current === focusId) return;
        if (!bookings.some((booking) => booking.id === focusId)) return;

        handledFocusIdRef.current = focusId;
        let timer: number | undefined;
        const frame = window.requestAnimationFrame(() => {
            expand(focusId);
            setHighlightedBookingId(focusId);
            document.getElementById(`booking-${focusId}`)?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
            timer = window.setTimeout(() => setHighlightedBookingId(null), 2200);
        });
        return () => {
            window.cancelAnimationFrame(frame);
            if (timer !== undefined) window.clearTimeout(timer);
        };
    }, [bookings, expand, searchParams]);

    const updateField = (field: keyof BookingForm, value: string | boolean) => {
        if ((field === "totalCost" || field === "amountPaid" || field === "amountRefunded") && typeof value === "string") {
            const normalized = normalizeMoneyInput(value);
            if (normalized === null) return;
            value = normalized;
        }
        if (field === "amountPaid" && typeof value === "string" && Number(value) > Number(form.totalCost)) {
            setCostInfo("Total cost was updated to match the amount paid.");
        } else if (field === "totalCost" || field === "amountPaid") {
            setCostInfo(null);
        }
        const next = { ...form, [field]: value };
        if (field === "amountPaid" && typeof value === "string" && Number(value) > Number(form.totalCost)) {
            next.totalCost = value;
        }
        if (field === "category" && !isJourney(value as BookingForm["category"])) {
            next.hasReturnJourney = false;
            next.returnStartDate = "";
            next.returnStartTime = "";
            next.returnStartLocation = "";
            next.returnEndDate = "";
            next.returnEndTime = "";
            next.returnEndLocation = "";
        }

        setForm(next);
        const immediateErrors = getImmediateErrors(next);
        setFormErrors((current) => {
            const updated = { ...current };
            immediateErrorFields.forEach((errorField) => {
                updated[errorField] = immediateErrors[errorField];
            });
            updated[field] = immediateErrors[field];
            return updated;
        });
    };

    const validate = (): FormErrors => {
        const errors: FormErrors = {};
        if (!form.name.trim()) errors.name = "Enter a booking name.";
        if (!form.startDate) errors.startDate = "Choose a date.";
        if (form.externalLink && !/^https?:\/\//i.test(form.externalLink.trim())) {
            errors.externalLink = "Enter a full http or https link.";
        }
        if (form.costState === "HasCost" && form.totalCost === "") {
            errors.totalCost = "Enter a positive total cost.";
        }
        if (form.hasReturnJourney && !form.returnStartDate) errors.returnStartDate = "Choose a return departure date.";
        return { ...errors, ...getImmediateErrors(form) };
    };

    const focusFirstError = (errors: FormErrors) => {
        const firstField = Object.keys(errors)[0];
        const detailsFields: Array<keyof BookingForm> = [
            "externalLink",
            "totalCost",
            "amountPaid",
            "amountRefunded",
        ];
        if (detailsFields.includes(firstField as keyof BookingForm)) {
            setIsMoreDetailsOpen(true);
        }
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                const input = formRef.current?.querySelector<HTMLElement>(`[data-booking-field="${firstField}"]`);
                input?.scrollIntoView({ behavior: "smooth", block: "center" });
                input?.focus({ preventScroll: true });
            });
        });
    };

    const validateLink = () => {
        const externalLink = form.externalLink.trim();
        const message = externalLink && !/^https?:\/\//i.test(externalLink)
            ? "Enter a full http or https link."
            : undefined;
        setFormErrors((current) => ({ ...current, externalLink: message }));
    };

    const save = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const errors = validate();
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            focusFirstError(errors);
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
            expand(saved.id);
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
        setIsMoreDetailsOpen(false);
        setCostInfo(null);
        setIsAdding(true);
    };

    const startEditing = (booking: Booking) => {
        setIsAdding(false);
        setEditingId(booking.id);
        setForm(toForm(booking));
        setFormErrors({});
        setFormError(null);
        setIsMoreDetailsOpen(false);
        setCostInfo(null);
        expand(booking.id);
    };

    const closeForm = () => {
        setIsAdding(false);
        setEditingId(null);
        setForm(createEmptyBookingForm());
        setFormErrors({});
        setFormError(null);
        setIsMoreDetailsOpen(false);
        setCostInfo(null);
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

    const renderForm = () => {
        const labels = labelsFor(form.category);
        const hasPositiveCost = form.costState === "HasCost" && Number(form.totalCost) > 0;
        const showRefund = form.status === "Cancelled" && Number(form.amountPaid) > 0;
        const hasJourneyLegs = isJourney(form.category);

        const errorRow = (...fields: Array<keyof BookingForm>) => {
            const message = fields.map((field) => formErrors[field]).find(Boolean);
            return message ? (
                <InlineMessage className="booking-field-message" variant="error">
                    {message}
                </InlineMessage>
            ) : null;
        };

        const outsideTripWarning = (date: string, fieldDescription: string) => {
            const isOutsideTrip = Boolean(
                date &&
                trip.startDate &&
                trip.endDate &&
                (date < trip.startDate || date > trip.endDate),
            );

            return isOutsideTrip ? (
                <InlineMessage className="booking-field-message" variant="warning">
                    The {fieldDescription} is outside the trip dates. You can still save the booking.
                </InlineMessage>
            ) : null;
        };

        return (
            <FormSurface formRef={formRef} className="booking-form" onSubmit={save}>
                <div className="booking-form-grid booking-identity-grid">
                    <label className="booking-name-field">
                        <FieldLabel required>Name</FieldLabel>
                        <input
                            data-booking-field="name"
                            aria-invalid={Boolean(formErrors.name)}
                            value={form.name}
                            maxLength={150}
                            onChange={(event) => updateField("name", event.target.value)}
                        />
                    </label>
                    <label className="booking-category-field">
                        <FieldLabel>Category</FieldLabel>
                        <select
                            value={form.category}
                            onChange={(event) => updateField("category", event.target.value)}
                        >
                            <option value="">Not specified</option>
                            {categoryOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </label>
                    {errorRow("name")}
                </div>

                <div className="booking-form-grid booking-reference-grid">
                    <label>
                        <FieldLabel>Status</FieldLabel>
                        <select value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                            <option value="">Not specified</option>
                            <option value="Requested">Requested</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </label>
                    <label>
                        <FieldLabel>Provider</FieldLabel>
                        <input
                            value={form.provider}
                            maxLength={200}
                            placeholder="Hotel, airline, or restaurant"
                            onChange={(event) => updateField("provider", event.target.value)}
                        />
                    </label>
                    <label>
                        <FieldLabel>Confirmation number</FieldLabel>
                        <input
                            value={form.confirmationNumber}
                            maxLength={100}
                            onChange={(event) => updateField("confirmationNumber", event.target.value)}
                        />
                    </label>
                </div>

                {hasJourneyLegs && <h4>Outbound</h4>}
                {showsLocations(form.category) ? (
                    <>
                        <div className="booking-event-row">
                            <FieldLabel required>{labels.start}</FieldLabel>
                            <input
                                data-booking-field="startDate"
                                aria-label={`${labels.start} date`}
                                aria-invalid={Boolean(formErrors.startDate)}
                                type="date"
                                value={form.startDate}
                                onChange={(event) => updateField("startDate", event.target.value)}
                            />
                            <input
                                aria-label={`${labels.start} time`}
                                type="time"
                                value={form.startTime}
                                onChange={(event) => updateField("startTime", event.target.value)}
                            />
                            <input
                                aria-label={labels.startLocation}
                                placeholder={labels.startLocation}
                                value={form.startLocation}
                                onChange={(event) => updateField("startLocation", event.target.value)}
                            />
                        </div>
                        {errorRow("startDate")}
                        {outsideTripWarning(
                            form.startDate,
                            hasJourneyLegs ? "outbound departure" : labels.start.toLowerCase(),
                        )}
                        <div className="booking-event-row">
                            <FieldLabel>{labels.end}</FieldLabel>
                            <input
                                data-booking-field="endDate"
                                aria-label={`${labels.end} date`}
                                aria-invalid={Boolean(formErrors.endDate)}
                                type="date"
                                value={form.endDate}
                                onChange={(event) => updateField("endDate", event.target.value)}
                            />
                            <input
                                data-booking-field="endTime"
                                aria-label={`${labels.end} time`}
                                aria-invalid={Boolean(formErrors.endTime)}
                                type="time"
                                value={form.endTime}
                                onChange={(event) => updateField("endTime", event.target.value)}
                            />
                            <input
                                aria-label={labels.endLocation}
                                placeholder={labels.endLocation}
                                value={form.endLocation}
                                onChange={(event) => updateField("endLocation", event.target.value)}
                            />
                        </div>
                        {errorRow("endDate", "endTime")}
                        {outsideTripWarning(
                            form.endDate,
                            hasJourneyLegs ? "outbound arrival" : labels.end.toLowerCase(),
                        )}
                    </>
                ) : (
                    <>
                        <div className="booking-combined-schedule-row">
                            <div className="booking-datetime-group">
                                <FieldLabel required>{labels.start}</FieldLabel>
                                <input
                                    data-booking-field="startDate"
                                    aria-label={`${labels.start} date`}
                                    aria-invalid={Boolean(formErrors.startDate)}
                                    type="date"
                                    value={form.startDate}
                                    onChange={(event) => updateField("startDate", event.target.value)}
                                />
                                <input
                                    aria-label={`${labels.start} time`}
                                    type="time"
                                    value={form.startTime}
                                    onChange={(event) => updateField("startTime", event.target.value)}
                                />
                            </div>
                            <div className="booking-datetime-group">
                                <FieldLabel>{labels.end}</FieldLabel>
                                <input
                                    data-booking-field="endDate"
                                    aria-label={`${labels.end} date`}
                                    aria-invalid={Boolean(formErrors.endDate)}
                                    type="date"
                                    value={form.endDate}
                                    onChange={(event) => updateField("endDate", event.target.value)}
                                />
                                <input
                                    data-booking-field="endTime"
                                    aria-label={`${labels.end} time`}
                                    aria-invalid={Boolean(formErrors.endTime)}
                                    type="time"
                                    value={form.endTime}
                                    onChange={(event) => updateField("endTime", event.target.value)}
                                />
                            </div>
                        </div>
                        {errorRow("startDate", "endDate", "endTime")}
                        {outsideTripWarning(form.startDate, labels.start.toLowerCase())}
                        {outsideTripWarning(form.endDate, labels.end.toLowerCase())}
                    </>
                )}

                {hasJourneyLegs && (
                    <div className="booking-return-section">
                        <label className="booking-checkbox">
                            <input
                                type="checkbox"
                                checked={form.hasReturnJourney}
                                onChange={(event) => updateField("hasReturnJourney", event.target.checked)}
                            />
                            Add return journey
                        </label>
                        {form.hasReturnJourney && (
                            <>
                                <h4>Return</h4>
                                <div className="booking-event-row">
                                    <FieldLabel required>Departure</FieldLabel>
                                    <input
                                        data-booking-field="returnStartDate"
                                        aria-label="Return departure date"
                                        aria-invalid={Boolean(formErrors.returnStartDate)}
                                        type="date"
                                        value={form.returnStartDate}
                                        onChange={(event) => updateField("returnStartDate", event.target.value)}
                                    />
                                    <input
                                        aria-label="Return departure time"
                                        type="time"
                                        value={form.returnStartTime}
                                        onChange={(event) => updateField("returnStartTime", event.target.value)}
                                    />
                                    <input
                                        aria-label="Return from"
                                        placeholder="From"
                                        value={form.returnStartLocation}
                                        onChange={(event) => updateField("returnStartLocation", event.target.value)}
                                    />
                                </div>
                                {errorRow("returnStartDate")}
                                {outsideTripWarning(form.returnStartDate, "return departure")}
                                <div className="booking-event-row">
                                    <FieldLabel>Arrival</FieldLabel>
                                    <input
                                        data-booking-field="returnEndDate"
                                        aria-label="Return arrival date"
                                        aria-invalid={Boolean(formErrors.returnEndDate)}
                                        type="date"
                                        value={form.returnEndDate}
                                        onChange={(event) => updateField("returnEndDate", event.target.value)}
                                    />
                                    <input
                                        data-booking-field="returnEndTime"
                                        aria-label="Return arrival time"
                                        aria-invalid={Boolean(formErrors.returnEndTime)}
                                        type="time"
                                        value={form.returnEndTime}
                                        onChange={(event) => updateField("returnEndTime", event.target.value)}
                                    />
                                    <input
                                        aria-label="Return to"
                                        placeholder="To"
                                        value={form.returnEndLocation}
                                        onChange={(event) => updateField("returnEndLocation", event.target.value)}
                                    />
                                </div>
                                {errorRow("returnEndDate", "returnEndTime")}
                                {outsideTripWarning(form.returnEndDate, "return arrival")}
                            </>
                        )}
                    </div>
                )}

                <FormDetailsToggle
                    isExpanded={isMoreDetailsOpen}
                    onToggle={() => setIsMoreDetailsOpen((current) => !current)}
                />

                {isMoreDetailsOpen && (
                    <div className="booking-more-details">
                        <div className="booking-form-grid booking-details-grid">
                            {!showsLocations(form.category) && (
                                <label>
                                    <FieldLabel>Location</FieldLabel>
                                    <input value={form.location} onChange={(event) => updateField("location", event.target.value)} />
                                </label>
                            )}
                            <label>
                                <FieldLabel>Link</FieldLabel>
                                <input
                                    data-booking-field="externalLink"
                                    aria-invalid={Boolean(formErrors.externalLink)}
                                    type="url"
                                    value={form.externalLink}
                                    placeholder="Booking page, ticket, or confirmation link"
                                    onChange={(event) => updateField("externalLink", event.target.value)}
                                    onBlur={validateLink}
                                />
                            </label>
                            {errorRow("externalLink")}
                        </div>

                        <div className="booking-money-section">
                            <div className="booking-cost-choice" role="group" aria-label="Cost information">
                                <span className="field-label">Cost</span>
                                <button
                                    className={form.costState === "Free" ? "is-selected" : ""}
                                    type="button"
                                    aria-pressed={form.costState === "Free"}
                                    onClick={() => updateField("costState", form.costState === "Free" ? "NotEntered" : "Free")}
                                >
                                    Free
                                </button>
                                <button
                                    className={form.costState === "HasCost" ? "is-selected" : ""}
                                    type="button"
                                    aria-pressed={form.costState === "HasCost"}
                                    onClick={() => updateField("costState", form.costState === "HasCost" ? "NotEntered" : "HasCost")}
                                >
                                    Has cost
                                </button>
                            </div>
                            {form.costState === "HasCost" && (
                                <div className="booking-form-grid booking-money-grid">
                                    <label>
                                        <FieldLabel required>Total cost ({trip.currency})</FieldLabel>
                                        <input
                                            data-booking-field="totalCost"
                                            aria-invalid={Boolean(formErrors.totalCost)}
                                            inputMode="decimal"
                                            value={form.totalCost}
                                            onChange={(event) => updateField("totalCost", event.target.value)}
                                        />
                                    </label>
                                    {hasPositiveCost && (
                                        <label>
                                            <FieldLabel>Amount paid ({trip.currency})</FieldLabel>
                                            <input
                                                data-booking-field="amountPaid"
                                                aria-invalid={Boolean(formErrors.amountPaid)}
                                                inputMode="decimal"
                                                value={form.amountPaid}
                                                placeholder="0"
                                                onChange={(event) => updateField("amountPaid", event.target.value)}
                                            />
                                        </label>
                                    )}
                                    {showRefund && (
                                        <label className="booking-checkbox booking-refunded-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={form.isRefunded}
                                                onChange={(event) => {
                                                    updateField("isRefunded", event.target.checked);
                                                    if (event.target.checked && !form.amountRefunded) {
                                                        updateField("amountRefunded", form.amountPaid);
                                                    }
                                                }}
                                            />
                                            Refunded
                                        </label>
                                    )}
                                    {showRefund && form.isRefunded && (
                                        <label>
                                            <FieldLabel>Amount refunded ({trip.currency})</FieldLabel>
                                            <input
                                                data-booking-field="amountRefunded"
                                                aria-invalid={Boolean(formErrors.amountRefunded)}
                                                inputMode="decimal"
                                                value={form.amountRefunded}
                                                onChange={(event) => updateField("amountRefunded", event.target.value)}
                                            />
                                        </label>
                                    )}
                                </div>
                            )}
                            {form.costState === "HasCost" && errorRow("totalCost", "amountPaid", "amountRefunded")}
                            {form.costState === "HasCost" && costInfo && (
                                <InlineMessage className="booking-field-message" variant="info">
                                    {costInfo}
                                </InlineMessage>
                            )}
                        </div>

                        <label className="booking-notes-field">
                            <FieldLabel>Notes</FieldLabel>
                            <textarea rows={3} value={form.note} maxLength={1000} onChange={(event) => updateField("note", event.target.value)} />
                        </label>
                    </div>
                )}

                {formError && <InlineMessage variant="error">{formError}</InlineMessage>}
                <FormActions>
                    <button className="text-button" type="button" onClick={closeForm}>Cancel</button>
                    <button className="primary-button" type="submit" disabled={isSaving}>
                        {isSaving ? "Saving…" : editingId ? "Save changes" : "Add booking"}
                    </button>
                </FormActions>
            </FormSurface>
        );
    };

    const renderBooking = (booking: Booking) => {
        if (editingId === booking.id) {
            return <li key={booking.id}>{renderForm()}</li>;
        }

        const hasAdditionalDetails = hasAdditionalBookingDetails(booking);
        const expanded = isExpanded(booking.id);
        const outbound = formatBookingPeriod(
            booking.startDate,
            booking.startTime,
            booking.endDate,
            booking.endTime,
        );
        const outboundLocation = formatLocationRoute(
            booking.location ?? booking.startLocation,
            booking.endLocation,
        );
        const returnJourney = booking.returnStartDate
            ? formatBookingPeriod(
                booking.returnStartDate,
                booking.returnStartTime,
                booking.returnEndDate,
                booking.returnEndTime,
            )
            : null;
        const returnLocation = formatLocationRoute(
            booking.returnStartLocation,
            booking.returnEndLocation,
        );
        return (
            <li
                id={`booking-${booking.id}`}
                className={`item-card booking-card${booking.status === "Cancelled" ? " booking-card-cancelled" : ""}${highlightedBookingId === booking.id ? " booking-card-highlighted" : ""}`}
                key={booking.id}
            >
                <div className="booking-card-header">
                    <div
                        className={hasAdditionalDetails ? "booking-card-main booking-card-main-expandable" : "booking-card-main"}
                        role={hasAdditionalDetails ? "button" : undefined}
                        tabIndex={hasAdditionalDetails ? 0 : undefined}
                        aria-expanded={hasAdditionalDetails ? expanded : undefined}
                        onClick={hasAdditionalDetails ? () => toggleExpanded(booking.id) : undefined}
                        onKeyDown={hasAdditionalDetails ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                toggleExpanded(booking.id);
                            }
                        } : undefined}
                    >
                        <strong className="booking-card-name">{booking.name}</strong>
                        <div className="booking-summary-details">
                            <div className="booking-journey-summary">
                                {returnJourney && <strong>Outbound</strong>}
                                <span>{outbound}</span>
                                {outboundLocation && <span>{outboundLocation}</span>}
                            </div>
                            {returnJourney && (
                                <div className="booking-journey-summary">
                                    <strong>Return</strong>
                                    <span>{returnJourney}</span>
                                    {returnLocation && <span>{returnLocation}</span>}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="booking-card-price">
                        {booking.totalCost !== null && booking.totalCost > 0 && (
                            <strong>{formatMoney(booking.totalCost, trip.currency)}</strong>
                        )}
                    </div>
                    <div className="booking-statuses">
                        {booking.status && (
                            <StatusPill className="booking-status-pill">{booking.status}</StatusPill>
                        )}
                        {booking.financialStatus && (
                            <StatusPill className="booking-financial-status-pill">
                                {financialLabels[booking.financialStatus]}
                            </StatusPill>
                        )}
                    </div>
                    <ExpandableCardActions
                        itemName={booking.name}
                        hasAdditionalDetails={hasAdditionalDetails}
                        isExpanded={expanded}
                        onToggle={() => toggleExpanded(booking.id)}
                        onEdit={() => startEditing(booking)}
                        onDelete={() => void remove(booking)}
                    />
                </div>
                {hasAdditionalDetails && expanded && (
                    <ExpandedCardDetails className="booking-expanded-details">
                        <div className="booking-detail-grid">
                            {booking.provider && <p><strong>Provider:</strong> {booking.provider}</p>}
                            {booking.confirmationNumber && <p><strong>Confirmation number:</strong> {booking.confirmationNumber}</p>}
                            {booking.category && <p><strong>Category:</strong> {categoryLabels[booking.category]}</p>}
                            {booking.totalCost !== null && booking.totalCost > 0 && <p><strong>Amount paid:</strong> {formatMoney(booking.amountPaid, trip.currency)}</p>}
                            {booking.amountRefunded !== null && <p><strong>Amount refunded:</strong> {formatMoney(booking.amountRefunded, trip.currency)}{booking.netCost > 0 ? ` · Net cost ${formatMoney(booking.netCost, trip.currency)}` : ""}</p>}
                        </div>
                        {booking.externalLink && <p><strong>Link:</strong> <a href={booking.externalLink} target="_blank" rel="noreferrer">Open booking</a></p>}
                        {booking.note && <p><strong>Notes:</strong> {booking.note}</p>}
                    </ExpandedCardDetails>
                )}
            </li>
        );
    };

    return (
        <SectionCard className="bookings-section">
            <SectionHeader title="Bookings" actions={<div className="booking-section-actions">{expandableBookingIds.length > 0 && <button className="text-button" type="button" onClick={toggleAll}>{allExpanded ? "Collapse all" : "Expand all"}</button>}<button className="primary-button" type="button" onClick={startAdding}>Add booking</button></div>} />
            {isAdding && renderForm()}
            {isLoading && <p className="detail-message">Loading bookings…</p>}
            {error && <InlineMessage variant="error">{error}</InlineMessage>}
            {!isLoading && !error && bookings.length === 0 && !isAdding && <div className="booking-empty-state"><h3>No bookings yet</h3><p>Keep reservation details, confirmations, dates, and costs together.</p><button className="primary-button" type="button" onClick={startAdding}>Add booking</button></div>}
            {activeBookings.length > 0 && <ul className="list-items card-list booking-list">{activeBookings.map(renderBooking)}</ul>}
            {cancelledBookings.length > 0 && <section className="cancelled-bookings"><h3>Cancelled</h3><ul className="list-items card-list booking-list">{cancelledBookings.map(renderBooking)}</ul></section>}
        </SectionCard>
    );
}

function hasAdditionalBookingDetails(booking: Booking) {
    return Boolean(
        booking.provider
        || booking.confirmationNumber
        || booking.category
        || booking.amountPaid > 0
        || booking.amountRefunded !== null
        || booking.activityLinks.length > 0
        || booking.externalLink
        || booking.note,
    );
}

function formatBookingPeriod(
    startDate: string,
    startTime: string | null,
    endDate: string | null,
    endTime: string | null,
) {
    const formattedStartDate = formatDate(startDate);
    const formattedStartTime = startTime?.slice(0, 5) ?? null;
    const effectiveEndDate = endDate ?? (endTime ? startDate : null);
    const formattedEndTime = endTime?.slice(0, 5) ?? null;

    if (!effectiveEndDate) {
        return formattedStartTime
            ? `${formattedStartDate}, ${formattedStartTime}`
            : formattedStartDate;
    }

    if (effectiveEndDate === startDate) {
        if (formattedStartTime && formattedEndTime) {
            return `${formattedStartDate}, ${formattedStartTime} – ${formattedEndTime}`;
        }

        return `${formattedStartDate}${formattedStartTime || formattedEndTime ? `, ${formattedStartTime ?? formattedEndTime}` : ""}`;
    }

    const start = `${formattedStartDate}${formattedStartTime ? `, ${formattedStartTime}` : ""}`;
    const end = `${formatDate(effectiveEndDate)}${formattedEndTime ? `, ${formattedEndTime}` : ""}`;
    return `${start} – ${end}`;
}

function formatLocationRoute(startLocation: string | null, endLocation: string | null) {
    if (startLocation && endLocation) {
        return `${startLocation} → ${endLocation}`;
    }

    return startLocation ?? endLocation;
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

