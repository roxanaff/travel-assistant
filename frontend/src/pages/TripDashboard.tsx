import { Link } from "react-router-dom"
import { useEffect, useState } from "react"

import { apiBaseUrl } from "../api/travelAssistantApi"
import { formatDate, formatMoney } from "../utils/format"
import type { Trip, NewTripForm } from "../types/trip"
import { initialNewTripForm } from "../types/trip"

export function TripDashboard() {
    const [trips, setTrips] = useState<Trip[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isCreatingTrip, setIsCreatingTrip] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [newTrip, setNewTrip] = useState<NewTripForm>(initialNewTripForm)

    useEffect(() => {
        const loadTrips = async () => {
            try {
                const response = await fetch(`${apiBaseUrl}/api/trips`)

                if (!response.ok) {
                    throw new Error('Unable to load your trips.')
                }

                setTrips(await response.json())
            } catch {
                setError('We could not connect to the Travel Assistant API.')
            } finally {
                setIsLoading(false)
            }
        }

        void loadTrips()
    }, [])

    const updateNewTrip = (field: keyof NewTripForm, value: string) => {
        setNewTrip((current) => ({ ...current, [field]: value }))
    }

    const createTrip = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setFormError(null)
        setIsSubmitting(true)

        try {
            const response = await fetch(`${apiBaseUrl}/api/trips`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newTrip, budget: Number(newTrip.budget) }),
            })

            if (!response.ok) {
                throw new Error('Unable to create the trip.')
            }

            const createdTrip: Trip = await response.json()
            setTrips((current) => [...current, createdTrip].sort((a, b) => a.startDate.localeCompare(b.startDate)))
            setNewTrip(initialNewTripForm)
            setIsCreatingTrip(false)
        } catch {
            setFormError('We could not save this trip. Please make sure the API is running and try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <section className="trips-section" aria-labelledby="trips-heading">
            <div className="section-heading">
                <div>
                    <h2 id="trips-heading">Upcoming trips</h2>
                </div>
                <span className="trip-count">{trips.length} total</span>
            </div>
            <button className="primary-button" type="button" onClick={() => setIsCreatingTrip(true)}>
                New trip <span aria-hidden="true">+</span>
            </button>

            {isCreatingTrip && (
                <form className="new-trip-form" onSubmit={createTrip}>
                    <div className="form-heading">
                        <h3>New trip</h3>
                        <button className="text-button" type="button" onClick={() => setIsCreatingTrip(false)}>
                            Cancel
                        </button>
                    </div>

                    <label>
                        Destination
                        <input
                            value={newTrip.destination}
                            onChange={(event) => updateNewTrip('destination', event.target.value)}
                            placeholder="e.g. Barcelona"
                            required
                        />
                    </label>

                    <div className="form-row">
                        <label>
                            Start date
                            <input type="date" value={newTrip.startDate} onChange={(event) => updateNewTrip('startDate', event.target.value)} required />
                        </label>
                        <label>
                            End date
                            <input type="date" value={newTrip.endDate} onChange={(event) => updateNewTrip('endDate', event.target.value)} required />
                        </label>
                    </div>

                    <div className="form-row">
                        <label>
                            Trip type
                            <select value={newTrip.type} onChange={(event) => updateNewTrip('type', event.target.value)}>
                                <option value="CityBreak">City break</option>
                                <option value="Beach">Beach</option>
                                <option value="Hiking">Hiking</option>
                                <option value="Skiing">Skiing</option>
                                <option value="Other">Other</option>
                            </select>
                        </label>
                        <label>
                            Total budget
                            <input type="number" min="0" step="0.01" value={newTrip.budget} onChange={(event) => updateNewTrip('budget', event.target.value)} placeholder="0" required />
                        </label>
                        <label>
                            Currency
                            <select value={newTrip.currency} onChange={(event) => updateNewTrip('currency', event.target.value)}>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                                <option value="USD">USD</option>
                            </select>
                        </label>
                    </div>

                    {formError && <p className="form-error">{formError}</p>}
                    <button className="primary-button" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving…' : 'Save trip'}
                    </button>
                </form>
            )}

            {isLoading && <p className="status-message">Loading your trips…</p>}
            {error && <p className="status-message error-message">{error}</p>}

            {!isLoading && !error && trips.length === 0 && (
                <div className="empty-state">
                    <h3>No trips yet</h3>
                    <p>Your next adventure will appear here.</p>
                </div>
            )}

            {!isLoading && !error && trips.length > 0 && (
                <div className="trip-grid">
                    {trips.map((trip) => (
                        <Link className="trip-card-link" key={trip.id} to={`/trips/${trip.id}`}>
                            <article className="trip-card">
                                <div className="card-topline">
                                    <span className="trip-type">{trip.type.replace(/([A-Z])/g, ' $1').trim()}</span>
                                    <span className="status-pill">Planned</span>
                                </div>
                                <h3>{trip.destination}</h3>
                                <p className="trip-dates">
                                    {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                                </p>
                                <div className="budget-row">
                                    <span>Total budget</span>
                                    <strong>
                                        {formatMoney(trip.budget, trip.currency)}
                                    </strong>
                                </div>
                            </article>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    )
}
