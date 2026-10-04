import type {
    FormEventHandler,
    KeyboardEventHandler,
    Ref,
} from "react";

import type { ItineraryItemForm } from "../../types/itineraryItem";
import type { Trip } from "../../types/trip";
import type { ItineraryFormErrors } from "../../utils/itineraryForm";
import { FormActions, FormSurface } from "../shared/FormPrimitives";
import { FormDetailsToggle } from "../shared/FormDetailsToggle";

type Props = {
    trip: Trip;
    value: ItineraryItemForm;
    errors: ItineraryFormErrors;
    generalError: string | null;
    isSaving: boolean;
    isEditing?: boolean;
    isBookingRequiredLocked?: boolean;
    isMoreDetailsOpen: boolean;
    formRef?: Ref<HTMLFormElement>;
    onKeyDown?: KeyboardEventHandler<HTMLFormElement>;
    onChange: (field: keyof ItineraryItemForm, value: string | boolean) => void;
    onToggleMoreDetails: () => void;
    onCancel: () => void;
    onSubmit: FormEventHandler<HTMLFormElement>;
};

/** Shared activity form used by the itinerary and booking-to-itinerary workflows. */
export function ActivityForm({
    trip,
    value,
    errors,
    generalError,
    isSaving,
    isEditing = false,
    isBookingRequiredLocked = false,
    isMoreDetailsOpen,
    formRef,
    onKeyDown,
    onChange,
    onToggleMoreDetails,
    onCancel,
    onSubmit,
}: Props) {
    const detailsId = isEditing ? "itinerary-edit-more-details" : "itinerary-add-more-details";

    return (
        <FormSurface
            formRef={formRef}
            className="itinerary-form"
            onKeyDown={onKeyDown}
            onSubmit={onSubmit}
        >
            <div className="itinerary-form-row itinerary-form-row-name">
                <label className="itinerary-field itinerary-name-field">
                    <span className="field-label field-label-required">Name</span>
                    <input
                        value={value.name}
                        maxLength={150}
                        onChange={(event) => onChange("name", event.target.value)}
                        placeholder="e.g. Sagrada Família"
                        required
                        aria-invalid={Boolean(errors.name)}
                    />
                    {errors.name && <span className="form-field-error">{errors.name}</span>}
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
                                value={value.date}
                                onChange={(event) => {
                                    onChange("date", event.target.value);
                                    if (!event.target.value) onChange("startTime", "");
                                }}
                                aria-invalid={Boolean(errors.date)}
                            />
                            {errors.date && <span className="form-field-error">{errors.date}</span>}
                        </label>
                        <label className="itinerary-field itinerary-time-field">
                            <span className="field-label">Time</span>
                            <input
                                type="time"
                                value={value.startTime}
                                disabled={!value.date}
                                onChange={(event) => onChange("startTime", event.target.value)}
                                aria-invalid={Boolean(errors.startTime)}
                            />
                            {errors.startTime && <span className="form-field-error">{errors.startTime}</span>}
                        </label>
                    </>
                ) : null}
                <label className="itinerary-field itinerary-duration-field">
                    <span className="field-label">Duration</span>
                    <input
                        type="time"
                        step="60"
                        value={value.duration}
                        onChange={(event) => onChange("duration", event.target.value)}
                        aria-invalid={Boolean(errors.duration)}
                    />
                    {errors.duration && <span className="form-field-error">{errors.duration}</span>}
                </label>
            </div>
            <div className="itinerary-form-row itinerary-form-row-planning">
                <label className="itinerary-field itinerary-priority-field">
                    <span className="field-label">Priority</span>
                    <select
                        value={value.priority}
                        onChange={(event) => onChange("priority", event.target.value)}
                    >
                        <option value="MustDo">Must do</option>
                        <option value="WouldLikeToDo">Want to do</option>
                        <option value="Optional">Optional</option>
                    </select>
                </label>
                <label className="itinerary-field itinerary-category-field">
                    <span className="field-label">Category</span>
                    <select
                        value={value.category}
                        onChange={(event) => onChange("category", event.target.value)}
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
                        value={value.cost}
                        onChange={(event) => onChange("cost", event.target.value)}
                        aria-invalid={Boolean(errors.cost)}
                    />
                    {errors.cost && <span className="form-field-error">{errors.cost}</span>}
                </label>
            </div>
            <label className="itinerary-booking-required">
                <input
                    type="checkbox"
                    checked={value.bookingRequired}
                    disabled={isBookingRequiredLocked}
                    onChange={(event) => onChange("bookingRequired", event.target.checked)}
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
                controlsId={detailsId}
                onToggle={onToggleMoreDetails}
            />
            {isMoreDetailsOpen && (
                <div className="itinerary-form-row itinerary-form-row-details" id={detailsId}>
                    <label className="itinerary-field itinerary-opening-hours-field">
                        <span className="field-label">Opening hours</span>
                        <span className="opening-hours">
                            <input
                                type="time"
                                aria-label="Opening time"
                                value={value.openingTime}
                                onChange={(event) => onChange("openingTime", event.target.value)}
                            />
                            <span aria-hidden="true">–</span>
                            <input
                                type="time"
                                aria-label="Closing time"
                                value={value.closingTime}
                                onChange={(event) => onChange("closingTime", event.target.value)}
                            />
                        </span>
                    </label>
                    <label className="itinerary-field">
                        <span className="field-label">Location</span>
                        <input
                            value={value.location}
                            maxLength={300}
                            onChange={(event) => onChange("location", event.target.value)}
                            placeholder="e.g. Carrer de Mallorca, 401"
                        />
                    </label>
                    <label className="itinerary-field">
                        <span className="field-label">Link</span>
                        <input
                            type="url"
                            value={value.externalLink}
                            maxLength={2000}
                            onChange={(event) => onChange("externalLink", event.target.value)}
                            placeholder="https://…"
                        />
                    </label>
                    <label className="itinerary-field itinerary-notes-field">
                        <span className="field-label">Notes</span>
                        <textarea
                            value={value.note}
                            maxLength={1000}
                            onChange={(event) => onChange("note", event.target.value)}
                            rows={2}
                        />
                    </label>
                </div>
            )}
            {generalError && <p className="form-error">{generalError}</p>}
            <FormActions>
                <button className="text-button" type="button" onClick={onCancel}>
                    Cancel
                </button>
                <button className="primary-button" type="submit" disabled={isSaving}>
                    {isSaving ? "Saving…" : isEditing ? "Save changes" : "Save"}
                </button>
            </FormActions>
        </FormSurface>
    );
}
