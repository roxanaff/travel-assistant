import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { useEffect, useState, type Dispatch, type MouseEvent, type SetStateAction } from "react";
import { getTrip } from "../api/tripsApi";
import { formatDate } from "../utils/format";
import type { Trip } from "../types/trip";
import "./Workspace.css";

/** Data shared by every section nested inside one trip workspace. */
export type TripWorkspaceContext = {
    trip: Trip;
    setTrip: Dispatch<SetStateAction<Trip | null>>;
    setHasUnsavedForm: Dispatch<SetStateAction<boolean>>;
};

/**
 * Loads one trip and renders the workspace header and tab navigation.
 * Nested section pages receive the loaded trip through the Outlet context.
 */
export function TripWorkspace() {
    const { id } = useParams();
    const [trip, setTrip] = useState<Trip | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasUnsavedForm, setHasUnsavedForm] = useState(false);

    // The workspace is responsible for loading the trip.
    useEffect(() => {
        void (async () => {
            try {
                if (!id) {
                    setError("This trip no longer exists.");
                    return;
                }

                const loadedTrip = await getTrip(id);
                if (loadedTrip === null) {
                    setError("This trip no longer exists.");
                    return;
                }

                setTrip(loadedTrip);
            } catch {
                setError("Could not connect to the Travel Assistant API.");
            }
        })();
    }, [id]);

    if (error)
        return (
            <section className="trip-workspace">
                <Link className="back-link" to="/">
                    ← All trips
                </Link>
                <p className="status-message error-message">{error}</p>
            </section>
        );

    if (!trip)
        return (
            <section className="trip-workspace">
                <Link className="back-link" to="/">
                    ← All trips
                </Link>
                <p className="status-message">Loading your trip…</p>
            </section>
        );

    // Draft trips can be useful before every setup field has been entered.
    const prompts = [
        !trip.destination && "Destination not set",
        (!trip.startDate || !trip.endDate) && "Dates not set",
    ].filter(Boolean);

    const confirmSectionChange = (event: MouseEvent<HTMLAnchorElement>) => {
        if (
            hasUnsavedForm &&
            !window.confirm("Discard your unsaved changes and switch sections?")
        ) {
            event.preventDefault();
        }
    };

    return (
        <section className="trip-workspace">
            <Link className="back-link" to="/">
                ← All trips
            </Link>
            <header className="workspace-header">
                <div>
                    <div className="card-topline">
                        <span className="status-pill">{trip.status}</span>
                    </div>
                    <h1>{trip.name}</h1>
                    {trip.destination && (
                        <p className="workspace-destination">{trip.destination}</p>
                    )}
                    {trip.startDate && trip.endDate && (
                        <p className="trip-dates">
                            {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                        </p>
                    )}
                    {prompts.length > 0 && (
                        <p className="draft-prompt">{prompts.join(" · ")}</p>
                    )}
                </div>
            </header>
            <nav className="workspace-tabs" aria-label="Trip sections">
                {/* Do not silently discard a currently open Add/Edit form when changing tabs. */}
                <NavLink end to={`/trips/${trip.id}`} onClick={confirmSectionChange}>
                    Itinerary
                </NavLink>
                <NavLink to={`/trips/${trip.id}/budget`} onClick={confirmSectionChange}>
                    Budget &amp; expenses
                </NavLink>
                <NavLink to={`/trips/${trip.id}/packing`} onClick={confirmSectionChange}>
                    Packing
                </NavLink>
                <NavLink to={`/trips/${trip.id}/details`} onClick={confirmSectionChange}>
                    Details
                </NavLink>
            </nav>
            <Outlet
                context={
                    { trip, setTrip, setHasUnsavedForm } satisfies TripWorkspaceContext
                }
            />
        </section>
    );
}
