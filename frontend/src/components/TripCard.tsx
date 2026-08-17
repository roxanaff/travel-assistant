import { Link } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { useEffect } from "react";
import { formatDate, formatMoney } from "../utils/format";
import type { Trip } from "../types/trip";

type Props = {
  trip: Trip;
  isMenuOpen: boolean;
  isDeleting: boolean;
  onToggleMenu: () => void;
  onEdit: () => void;
  onDelete: () => void;
};
/** Converts the API enum string (for example, CityBreak) into a readable label. */
const typeLabel = (type: string) => type.replace(/([A-Z])/g, " $1").trim();

/** Displays one trip on the dashboard and delegates edit/delete actions to its parent. */
export function TripCard({
  trip,
  isMenuOpen,
  isDeleting,
  onToggleMenu,
  onEdit,
  onDelete,
}: Props) {
  const prompts = [
    !trip.destination && "Destination not set",
    (!trip.startDate || !trip.endDate) && "Dates not set",
  ].filter(Boolean);
  // Escape closes an open actions menu for keyboard users.
  useEffect(() => {
    if (!isMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onToggleMenu();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isMenuOpen, onToggleMenu]);
  return (
    <article
      className={`trip-card ${trip.status === "Past" ? "trip-card-past" : ""}`}
    >
      <div>
        <div className="card-topline">
          <span className="status-pill">{trip.status}</span>
        </div>
        <h3>
          <Link className="trip-name-link" to={`/trips/${trip.id}`}>
            {trip.name}
          </Link>
        </h3>
        {trip.destination && (
          <p className="trip-destination">{trip.destination}</p>
        )}
        {trip.startDate && trip.endDate && (
          <p className="trip-dates">
            {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
          </p>
        )}
        {trip.type && <span className="trip-type">{typeLabel(trip.type)}</span>}
        {trip.budget !== null && (
          <div className="budget-row">
            <span>Target budget</span>
            <strong>{formatMoney(trip.budget, trip.currency)}</strong>
          </div>
        )}
        {prompts.length > 0 && (
          <p className="draft-prompt">{prompts.join(" · ")}</p>
        )}
        {trip.note && <p className="trip-note">{trip.note}</p>}
      </div>
      <div className="card-menu">
        <button
          className="icon-button"
          type="button"
          onClick={onToggleMenu}
          aria-label={`Actions for ${trip.name}`}
          aria-expanded={isMenuOpen}
        >
          <MoreHorizontal size={18} />
        </button>
        {isMenuOpen && (
          <div className="card-menu-popover">
            <button type="button" onClick={onEdit}>
              Edit
            </button>
            <button type="button" onClick={onDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
