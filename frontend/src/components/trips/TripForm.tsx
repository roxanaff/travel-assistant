import { useState } from "react";
import { initialTripFormValues, type TripFormValues, type TripRequest } from "../../types/trip";
import { normalizeMoneyInput } from "../../utils/numberInput";
import { tripTypeOptions } from "../../utils/tripType";
import { useFormKeyboardInteraction } from "../../utils/useFormKeyboardInteraction";
import { FieldLabel, FieldRow, FormActions, FormSurface } from "../shared/FormPrimitives";
import { FormDiscardDialog } from "../shared/FormDiscardDialog";

type Props = {
    initialValues?: TripFormValues;
    heading: string;
    submitLabel: string;
    isSaving: boolean;
    error: string | null;
    onCancel: () => void;
    onSubmit: (request: TripRequest) => Promise<void>;
    className?: string;
};

/** Reusable trip form used when creating or editing a trip. */
export function TripForm({
    initialValues = initialTripFormValues,
    heading,
    submitLabel,
    isSaving,
    error,
    onCancel,
    onSubmit,
    className,
}: Props) {
    // Local string values suit controlled HTML inputs; they are converted to API values only on submit.
    const [values, setValues] = useState(initialValues);
    const [validationError, setValidationError] = useState<string | null>(null);
    const { formRef, onFormKeyDown, cancelForm, isConfirmingDiscard, cancelDiscardConfirmation, discardChanges } =
        useFormKeyboardInteraction(true, onCancel);

    // Keeps form values as strings for HTML controls until the request is submitted.
    /** Updates one field and provides a helpful next-day default when the user first chooses a start date. */
    const update = (field: keyof TripFormValues, value: string) => {
        if (field === "budget") {
            const normalized = normalizeMoneyInput(value);
            if (normalized === null) return;
            value = normalized;
        }

        setValidationError(null);
        setValues((current) => {
            const next = { ...current, [field]: value };
            if (field === "startDate" && value && !current.endDate) {
                const followingDay = new Date(`${value}T00:00:00`);
                followingDay.setDate(followingDay.getDate() + 1);
                next.endDate = followingDay.toISOString().slice(0, 10);
            }
            return next;
        });
    };

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
        <>
            <FormSurface
                formRef={formRef}
                className={`trip-form${className ? ` ${className}` : ""}`}
                onKeyDown={onFormKeyDown}
                onSubmit={(event) => {
                    event.preventDefault();
                    const hasStartDate = Boolean(values.startDate);
                    const hasEndDate = Boolean(values.endDate);
                    if (hasStartDate !== hasEndDate) {
                        setValidationError(
                            "Enter both a start date and an end date, or leave both blank for a Draft trip.",
                        );
                        return;
                    }
                    if (values.startDate && values.endDate && values.endDate < values.startDate) {
                        setValidationError("The end date cannot be before the start date.");
                        return;
                    }
                    setValidationError(null);
                    void onSubmit(request);
                }}
            >
                <div className="form-heading">
                    <h3>{heading}</h3>
                </div>
                <label>
                    <FieldLabel required>Trip name</FieldLabel>
                    <input
                        value={values.name}
                        onChange={(e) => update("name", e.target.value)}
                        required
                        maxLength={150}
                    />
                </label>
                <label>
                    <FieldLabel>Destination</FieldLabel>
                    <input
                        value={values.destination}
                        onChange={(e) => update("destination", e.target.value)}
                        placeholder="e.g. Barcelona"
                    />
                </label>
                <FieldRow>
                    <label>
                        <FieldLabel>Start date</FieldLabel>
                        <input
                            type="date"
                            value={values.startDate}
                            onChange={(e) => update("startDate", e.target.value)}
                        />
                    </label>
                    <label>
                        <FieldLabel>End date</FieldLabel>
                        <input
                            type="date"
                            min={values.startDate || undefined}
                            value={values.endDate}
                            onChange={(e) => update("endDate", e.target.value)}
                        />
                    </label>
                </FieldRow>
                <FieldRow>
                    <label>
                        <FieldLabel>Trip type</FieldLabel>
                        <select value={values.type} onChange={(e) => update("type", e.target.value)}>
                            <option value="">Not specified</option>
                            {tripTypeOptions.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <FieldLabel>Target budget</FieldLabel>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={values.budget}
                            onChange={(e) => update("budget", e.target.value)}
                        />
                    </label>
                    <label>
                        <FieldLabel>Currency</FieldLabel>
                        <select value={values.currency} onChange={(e) => update("currency", e.target.value)}>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                            <option value="USD">USD</option>
                        </select>
                    </label>
                </FieldRow>
                <label>
                    <FieldLabel>Notes</FieldLabel>
                    <textarea value={values.note} onChange={(e) => update("note", e.target.value)} rows={3} />
                </label>
                {(validationError || error) && <p className="form-error">{validationError ?? error}</p>}
                <FormActions>
                    <button className="text-button" type="button" onClick={cancelForm}>
                        Cancel
                    </button>
                    <button className="primary-button" type="submit" disabled={isSaving}>
                        {isSaving ? "Saving…" : submitLabel}
                    </button>
                </FormActions>
            </FormSurface>
            <FormDiscardDialog
                isOpen={isConfirmingDiscard}
                onCancel={cancelDiscardConfirmation}
                onConfirm={discardChanges}
            />
        </>
    );
}
