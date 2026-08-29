import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TripForm } from "../trips/TripForm";
import { deleteTrip, updateTrip } from "../../api/tripsApi";
import { formatDateRange, formatMoney } from "../../utils/format";
import { formatTripType } from "../../utils/tripType";
import { tripToFormValues, type TripRequest } from "../../types/trip";
import type { TripWorkspaceContext } from "../../pages/Workspace";
import "./TripSetup.css";

/** Displays the complete trip setup and provides the edit/delete actions. */
export function TripSetup({
    trip,
    setTrip,
    setHasUnsavedForm,
}: TripWorkspaceContext) {
    const navigate = useNavigate();
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [itineraryMessage, setItineraryMessage] = useState<string | null>(
        null,
    );

    // An open trip form should be protected from accidental tab changes.
    useEffect(() => {
        setHasUnsavedForm(editing);
        return () => setHasUnsavedForm(false);
    }, [editing, setHasUnsavedForm]);

    /** Saves the edited trip and refreshes the workspace header through shared state. */
    const save = async (request: TripRequest) => {
        setSaving(true);
        setError(null);
        setItineraryMessage(null);

        try {
            const updatedTrip = await updateTrip(trip.id, request);
            setTrip(updatedTrip);
            if (updatedTrip.unscheduledActivityCount > 0) {
                setItineraryMessage(
                    `${updatedTrip.unscheduledActivityCount} itinerary ${updatedTrip.unscheduledActivityCount === 1 ? "activity was" : "activities were"} moved to Unscheduled because the trip dates changed.`,
                );
            }
            setEditing(false);
        } catch (exception) {
            setError(
                exception instanceof Error && exception.message
                    ? exception.message
                    : "Could not save this trip.",
            );
        } finally {
            setSaving(false);
        }
    };
    /** Deletes the current trip, then returns the user to the dashboard. */
    const remove = async () => {
        if (!window.confirm(`Delete “${trip.name}”? This cannot be undone.`))
            return;

        setError(null);

        try {
            await deleteTrip(trip.id);
            navigate("/");
        } catch {
            setError("Could not delete this trip. Please try again.");
        }
    };

    return (
        <section className="detail-section trip-setup">
            <div className="section-title-row">
                <h2>Trip details</h2>
                <div className="item-actions" aria-label="Trip actions">
                    <button
                        className="icon-button"
                        type="button"
                        aria-label="Edit trip"
                        onClick={() => setEditing(true)}
                    >
                        <Pencil size={20} />
                    </button>
                    <button
                        className="icon-button danger-button"
                        type="button"
                        aria-label="Delete trip"
                        onClick={() => void remove()}
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>
            {error && <p className="form-error">{error}</p>}
            {itineraryMessage && (
                <p className="detail-message">{itineraryMessage}</p>
            )}
            {editing ? (
                <TripForm
                    heading="Edit trip"
                    submitLabel="Save changes"
                    initialValues={tripToFormValues(trip)}
                    isSaving={saving}
                    error={error}
                    onCancel={() => setEditing(false)}
                    onSubmit={save}
                />
            ) : (
                <dl className="trip-setup-list">
                    <div>
                        <dt>Destination</dt>
                        <dd>{trip.destination ?? "Not set"}</dd>
                    </div>
                    <div>
                        <dt>Dates</dt>
                        <dd>
                            {trip.startDate && trip.endDate
                                ? formatDateRange(trip.startDate, trip.endDate)
                                : "Not set"}
                        </dd>
                    </div>
                    <div>
                        <dt>Trip type</dt>
                        <dd>{formatTripType(trip.type)}</dd>
                    </div>
                    <div>
                        <dt>Target budget</dt>
                        <dd>
                            {trip.budget == null
                                ? "Not set"
                                : formatMoney(trip.budget, trip.currency)}
                        </dd>
                    </div>
                    <div>
                        <dt>Notes</dt>
                        <dd className="trip-setup-note">
                            {trip.note ?? "No notes"}
                        </dd>
                    </div>
                </dl>
            )}
        </section>
    );
}
