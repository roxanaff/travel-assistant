import { useEffect, useState } from "react";
import {
    initialTripFormValues,
    type TripFormValues,
    type TripRequest,
} from "../../types/trip";

type Props = {
    initialValues?: TripFormValues;
    heading: string;
    submitLabel: string;
    isSaving: boolean;
    error: string | null;
    onCancel: () => void;
    onSubmit: (request: TripRequest) => Promise<void>;
};

/** Reusable trip setup form used when creating or editing a trip. */
export function TripForm({
                             initialValues = initialTripFormValues,
                             heading,
                             submitLabel,
                             isSaving,
                             error,
                             onCancel,
                             onSubmit,
                         }: Props) {
    // Local string values suit controlled HTML inputs; they are converted to API values only on submit.
    const [values, setValues] = useState(initialValues);
    useEffect(() => setValues(initialValues), [initialValues]);

    // Keeps form values as strings for HTML controls until the request is submitted.
    /** Updates one field and provides a helpful next-day default when the user first chooses a start date. */
    const update = (field: keyof TripFormValues, value: string) =>
        setValues((current) => {
            const next = { ...current, [field]: value };
            if (field === "startDate" && value && !current.endDate) {
                const followingDay = new Date(`${value}T00:00:00`);
                followingDay.setDate(followingDay.getDate() + 1);
                next.endDate = followingDay.toISOString().slice(0, 10);
            }
            return next;
        });

    // Convert optional blank form values to null so the API can store them as absent.
    // Convert optional blank form values to null so the API can store them as absent.
    const request: TripRequest = {
        name: values.name.trim(),
        destination: values.destination.trim() || null,
        startDate: values.startDate || null,
        endDate: values.endDate || null,
        arrivalTime: values.arrivalTime || null,
        type: values.type || null,
        budget: values.budget === "" ? null : Number(values.budget),
        currency: values.currency,
        note: values.note.trim() || null,
    };
    return (
        <form
            className="new-trip-form form-surface"
            onSubmit={(event) => {
                event.preventDefault();
                void onSubmit(request);
            }}
        >
            <div className="form-heading">
                <h3>{heading}</h3>
                <button className="text-button" type="button" onClick={onCancel}>
                    Cancel
                </button>
            </div>
            <label>
                Trip name
                <input
                    value={values.name}
                    onChange={(e) => update("name", e.target.value)}
                    required
                />
            </label>
            <label>
                <span className="field-label">Primary destination <span className="optional">(optional for drafts)</span></span>
                <input
                    value={values.destination}
                    onChange={(e) => update("destination", e.target.value)}
                    placeholder="e.g. Barcelona"
                />
            </label>
            <div className="form-row">
                <label>
                    Start date
                    <input
                        type="date"
                        value={values.startDate}
                        onChange={(e) => update("startDate", e.target.value)}
                    />
                </label>
                <label>
                    End date
                    <input
                        type="date"
                        min={values.startDate || undefined}
                        value={values.endDate}
                        onChange={(e) => update("endDate", e.target.value)}
                    />
                </label>
            </div>
            <div className="form-row">
                <label>
                    Trip type
                    <select
                        value={values.type}
                        onChange={(e) => update("type", e.target.value)}
                    >
                        <option value="">Not specified</option>
                        <option value="CityBreak">City break</option>
                        <option value="Beach">Beach</option>
                        <option value="Hiking">Hiking</option>
                        <option value="Skiing">Skiing</option>
                        <option value="Other">Other</option>
                    </select>
                </label>
                <label>
                    <span className="field-label">Target budget <span className="optional">(optional)</span></span>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={values.budget}
                        onChange={(e) => update("budget", e.target.value)}
                    />
                </label>
                <label>
                    Currency
                    <select
                        value={values.currency}
                        onChange={(e) => update("currency", e.target.value)}
                    >
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="USD">USD</option>
                    </select>
                </label>
            </div>
            <label>
                <span className="field-label">Notes <span className="optional">(optional)</span></span>
                <textarea
                    value={values.note}
                    onChange={(e) => update("note", e.target.value)}
                    rows={3}
                />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button" type="submit" disabled={isSaving}>
                {isSaving ? "Saving…" : submitLabel}
            </button>
        </form>
    );
}
