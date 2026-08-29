import { Link } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import { formatDateRange, formatMoney } from "../../utils/format";
import { formatTripType } from "../../utils/tripType";
import type { Trip } from "../../types/trip";

type Props = {
    trip: Trip;
    isDeleting: boolean;
    onEdit: () => void;
    onDelete: () => void;
};
/** Displays one trip on the dashboard and delegates edit/delete actions to its parent. */
export function TripCard({ trip, isDeleting, onEdit, onDelete }: Props) {
    const prompts = [
        !trip.destination && "Destination not set",
        (!trip.startDate || !trip.endDate) && "Dates not set",
    ].filter(Boolean);

    return (
        <article
            className={`trip-card ${trip.status === "Past" ? "trip-card-past" : ""}`}
        >
            <div className="trip-card-summary">
                <div className="card-topline">
                    <span className="status-pill">{trip.status}</span>
                </div>
                <Link className="trip-name-link" to={`/trips/${trip.id}`}>
                    <h3>{trip.name}</h3>
                    {trip.destination && (
                        <p className="trip-destination">{trip.destination}</p>
                    )}
                    {trip.startDate && trip.endDate && (
                        <p className="trip-dates">
                            {formatDateRange(trip.startDate, trip.endDate)}
                        </p>
                    )}
                    {trip.type && (
                        <p className="trip-type">
                            {formatTripType(trip.type)}
                        </p>
                    )}
                </Link>
            </div>
            <div className="trip-card-actions" aria-label={`Actions for ${trip.name}`}>
                <button
                    className="icon-button danger-button"
                    type="button"
                    onClick={onDelete}
                    aria-label={`Delete ${trip.name}`}
                    disabled={isDeleting}
                >
                    <Trash2 size={20} />
                </button>
                <button
                    className="icon-button"
                    type="button"
                    onClick={onEdit}
                    aria-label={`Edit ${trip.name}`}
                >
                    <Pencil size={20} />
                </button>
            </div>
            {trip.budget !== null && (
                <div className="budget-row">
                    <span>Target budget</span>
                    <strong>{formatMoney(trip.budget, trip.currency)}</strong>
                </div>
            )}
            {prompts.length > 0 && (
                <div className="draft-prompts">
                    {prompts.map((prompt) => (
                        <span key={String(prompt)}>{prompt}</span>
                    ))}
                </div>
            )}
            {trip.note && (
                <div className="trip-note-preview">
                    <span className="trip-note-label">Notes</span>
                    <p className="trip-note">{trip.note}</p>
                </div>
            )}
        </article>
    );
}
