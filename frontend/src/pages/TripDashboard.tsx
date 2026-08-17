import { useEffect, useMemo, useState } from "react";
import { TripCard } from "../components/TripCard";
import { TripForm } from "../components/TripForm";
import { apiBaseUrl } from "../api/travelAssistantApi";
import {
  initialTripFormValues,
  tripToFormValues,
  type Trip,
  type TripRequest,
} from "../types/trip";
import "./TripDashboard.css";

const statusOrder = { Ongoing: 0, Upcoming: 1, Draft: 2, Past: 3 } as const;

const sortTrips = (trips: Trip[]) =>
  [...trips].sort((a, b) => {
    const statusDifference = statusOrder[a.status] - statusOrder[b.status];
    
    if (statusDifference) 
      return statusDifference;
    
    if (a.status === "Upcoming")
      return (a.startDate ?? "").localeCompare(b.startDate ?? "");
    
    if (a.status === "Past")
      return (b.endDate ?? "").localeCompare(a.endDate ?? "");
    
    return b.createdAtUtc.localeCompare(a.createdAtUtc);
  });

export function TripDashboard() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | null | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/trips`);
        if (!response.ok) 
          throw new Error();

        setTrips(await response.json());
      } catch {
        setError("Could not connect to the Travel Assistant API.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);
  
  const orderedTrips = useMemo(() => sortTrips(trips), [trips]);
  
  const saveTrip = async (request: TripRequest) => {
    setIsSaving(true);
    setFormError(null);
    
    try {
      const isEditing = editingTrip !== null;
      const url = isEditing
        ? `${apiBaseUrl}/api/trips/${editingTrip!.id}`
        : `${apiBaseUrl}/api/trips`;
      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Unable to save this trip.");
      }
      
      const saved: Trip = await response.json();
      
      setTrips((current) =>
        isEditing
          ? current.map((trip) => (trip.id === saved.id ? saved : trip))
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
  
  const deleteTrip = async (trip: Trip) => {
    if (!window.confirm(`Delete “${trip.name}”? This cannot be undone.`))
      return;
    
    setActionError(null);
    setDeletingId(trip.id);
    
    try {
      const response = await fetch(`${apiBaseUrl}/api/trips/${trip.id}`, { method: "DELETE" });
      
      if (!response.ok) 
        throw new Error();
      
      setTrips((current) => current.filter((currentTrip) => currentTrip.id !== trip.id));
      setOpenMenuId(null);
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
        <span className="trip-count">{trips.length} total</span>
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
      {editingTrip !== undefined && (
        <TripForm
          heading={editingTrip ? "Edit trip" : "New trip"}
          submitLabel={editingTrip ? "Save changes" : "Save trip"}
          initialValues={
            editingTrip ? tripToFormValues(editingTrip) : initialTripFormValues
          }
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
          {orderedTrips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              isMenuOpen={openMenuId === trip.id}
              isDeleting={deletingId === trip.id}
              onToggleMenu={() =>
                setOpenMenuId((current) =>
                  current === trip.id ? null : trip.id,
                )
              }
              onEdit={() => {
                setFormError(null);
                setOpenMenuId(null);
                setEditingTrip(trip);
              }}
              onDelete={() => void deleteTrip(trip)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
