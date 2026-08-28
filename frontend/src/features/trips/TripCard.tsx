import { Link } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { useRef } from "react";
import { formatDateRange, formatMoney } from "../../utils/format";
import { formatTripType } from "../../utils/tripType";
import { useDismissibleMenu } from "../../utils/useDismissibleMenu";
import type { Trip } from "../../types/trip";

type Props = {
    trip: Trip;
    isMenuOpen: boolean;
    isDeleting: boolean;
    onToggleMenu: () => void;
    onEdit: () => void;
    onDelete: () => void;
};
/** Displays one trip on the dashboard and delegates edit/delete actions to its parent. */
export function TripCard({
    trip,
    isMenuOpen,
    isDeleting,
    onToggleMenu,
    onEdit,
    onDelete,
}: Props) {
    const menuRef = useRef<HTMLDivElement>(null);
    const prompts = [
        !trip.destination && "Destination not set",
        (!trip.startDate || !trip.endDate) && "Dates not set",
    ].filter(Boolean);
    useDismissibleMenu(isMenuOpen, menuRef, onToggleMenu);
    return (
        <article
            className={`trip-card ${trip.status === "Past" ? "trip-card-past" : ""}`}
        >
            <div>
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
                {trip.budget !== null && (
                    <div className="budget-row">
                        <span>Target budget</span>
                        <strong>
                            {formatMoney(trip.budget, trip.currency)}
                        </strong>
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
            </div>
            <div className="card-menu" ref={menuRef}>
                <button
                    className="icon-button"
                    type="button"
                    onClick={onToggleMenu}
                    aria-label={`Actions for ${trip.name}`}
                    aria-expanded={isMenuOpen}
                    aria-haspopup="menu"
                    data-menu-trigger
                >
                    <MoreHorizontal size={18} />
                </button>
                {isMenuOpen && (
                    <div className="action-menu-popover">
                        <button type="button" onClick={onEdit}>
                            Edit
                        </button>
                        <button
                            type="button"
                            onClick={onDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? "Deleting…" : "Delete"}
                        </button>
                    </div>
                )}
            </div>
        </article>
    );
}
