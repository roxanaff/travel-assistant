import { useEffect, useMemo, useState } from "react";
import { TripCard } from "./TripCard";
import { TripForm } from "./TripForm";
import {
    createTrip,
    deleteTrip as deleteTripRequest,
    getTrips,
    updateTrip,
} from "../../api/tripsApi";
import {
    initialTripFormValues,
    tripToFormValues,
    type Trip,
    type TripRequest,
} from "../../types/trip";
import "./TripsDashboard.css";

// Dashboard-specific workflow: loads the user's trip index and coordinates create, edit, and delete actions.
const statusOrder = {
    Ongoing: 0,
    Upcoming: 1,
    Draft: 2,
    Past: 3,
} as const;

/** Keeps the most relevant trips at the top while retaining useful chronological ordering within each status. */
const sortTrips = (trips: Trip[]) =>
    [...trips].sort((a, b) => {
        const statusDifference = statusOrder[a.status] - statusOrder[b.status];

        if (statusDifference) return statusDifference;

        if (a.status === "Upcoming")
            return (a.startDate ?? "").localeCompare(b.startDate ?? "");

        if (a.status === "Past")
            return (b.endDate ?? "").localeCompare(a.endDate ?? "");

        return b.createdAtUtc.localeCompare(a.createdAtUtc);
    });

/** Renders the top-level trip list and keeps its local view in sync after each mutation. */
export function TripsDashboard() {
    const [trips, setTrips] = useState<Trip[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [editingTrip, setEditingTrip] = useState<Trip | null | undefined>(
        undefined,
    );
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Load once when the dashboard mounts; child workspaces load individual trips separately.
    useEffect(() => {
        void (async () => {
            try {
                setTrips(await getTrips());
            } catch {
                setError("Could not connect to the Travel Assistant API.");
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const orderedTrips = useMemo(() => sortTrips(trips), [trips]);

    /** Sends one create-or-update request, then updates the list without another full reload. */
    const saveTrip = async (request: TripRequest) => {
        setIsSaving(true);
        setFormError(null);

        try {
            const isEditing = editingTrip !== null;
            const saved = isEditing
                ? await updateTrip(editingTrip!.id, request)
                : await createTrip(request);

            setTrips((current) =>
                isEditing
                    ? current.map((trip) =>
                          trip.id === saved.id ? saved : trip,
                      )
                    : [...current, saved],
            );

            setEditingTrip(undefined);
        } catch (exception) {
            setFormError(
                exception instanceof Error
                    ? exception.message
                    : "Could not save this trip.",
            );
        } finally {
            setIsSaving(false);
        }
    };

    /** Deletes and removes a trip from both the API and the displayed list. */
    const deleteTrip = async (trip: Trip) => {
        if (!window.confirm(`Delete “${trip.name}”? This cannot be undone.`))
            return;

        setActionError(null);
        setDeletingId(trip.id);

        try {
            await deleteTripRequest(trip.id);

            setTrips((current) =>
                current.filter((currentTrip) => currentTrip.id !== trip.id),
            );
        } catch {
            setActionError("Could not delete this trip. Please try again.");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <section className="trips-section" aria-labelledby="trips-heading">
            <div className="section-heading">
                <div>
                    <h2 id="trips-heading">Your trips</h2>
                </div>
                <button
                    className="primary-button"
                    type="button"
                    onClick={() => {
                        setFormError(null);
                        setEditingTrip(null);
                    }}
                >
                    New trip <span aria-hidden="true">+</span>
                </button>
                {/*<span className="trip-count">{trips.length} total</span>*/}
            </div>
            {editingTrip === null && (
                <TripForm
                    heading="New trip"
                    submitLabel="Save trip"
                    initialValues={initialTripFormValues}
                    isSaving={isSaving}
                    error={formError}
                    onCancel={() => setEditingTrip(undefined)}
                    onSubmit={saveTrip}
                />
            )}
            {isLoading && <p className="status-message">Loading your trips…</p>}
            {error && <p className="status-message error-message">{error}</p>}
            {actionError && (
                <p className="status-message error-message">{actionError}</p>
            )}
            {!isLoading && !error && trips.length === 0 && (
                <div className="empty-state">
                    <h3>No trips yet</h3>
                    <p>Your next adventure will appear here.</p>
                </div>
            )}
            {!isLoading && !error && trips.length > 0 && (
                <div className="trip-grid">
                    {orderedTrips.map((trip) =>
                        editingTrip?.id === trip.id ? (
                            <TripForm
                                key={trip.id}
                                className="trip-card-edit-form"
                                heading="Edit trip"
                                submitLabel="Save changes"
                                initialValues={tripToFormValues(trip)}
                                isSaving={isSaving}
                                error={formError}
                                onCancel={() => setEditingTrip(undefined)}
                                onSubmit={saveTrip}
                            />
                        ) : (
                            <TripCard
                                key={trip.id}
                                trip={trip}
                                isDeleting={deletingId === trip.id}
                                onEdit={() => {
                                    setFormError(null);
                                    setEditingTrip(trip);
                                }}
                                onDelete={() => void deleteTrip(trip)}
                            />
                        ),
                    )}
                </div>
            )}
        </section>
    );
}
