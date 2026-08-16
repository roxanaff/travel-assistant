import { useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Link, Route, Routes, useParams } from 'react-router-dom'
import './App.css'

type Trip = {
  id: string
  destination: string
  startDate: string
  endDate: string
  type: string
  budget: number
  currency: string
}

type NewTripForm = {
  destination: string
  startDate: string
  endDate: string
  type: string
  budget: string
  currency: string
}

type BudgetItem = {
  id: string
  tripId: string
  name: string
  category: string
  amount: number
}

type NewBudgetItemForm = {
  name: string
  category: string
  amount: string
}

const apiBaseUrl = 'http://localhost:5263'

const initialNewTripForm: NewTripForm = {
  destination: '',
  startDate: '',
  endDate: '',
  type: 'CityBreak',
  budget: '',
  currency: 'EUR',
}

const initialNewBudgetItemForm: NewBudgetItemForm = {
  name: '',
  category: 'Accommodation',
  amount: '',
}

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))

const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)

function Header() {
  return (
    <header className="topbar">
      <Link className="brand" to="/" aria-label="Travel Assistant home">
        <span className="brand-mark">T</span>
        <span>Travel Assistant</span>
      </Link>
    </header>
  )
}

function TripDashboard() {
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

function TripDetails() {
  const { id } = useParams()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])
  const [isLoadingBudgetItems, setIsLoadingBudgetItems] = useState(true)
  const [budgetItemsError, setBudgetItemsError] = useState<string | null>(null)
  const [isAddingBudgetItem, setIsAddingBudgetItem] = useState(false)
  const [isSavingBudgetItem, setIsSavingBudgetItem] = useState(false)
  const [budgetItemFormError, setBudgetItemFormError] = useState<string | null>(null)
  const [newBudgetItem, setNewBudgetItem] = useState<NewBudgetItemForm>(initialNewBudgetItemForm)
  const [editingBudgetItemId, setEditingBudgetItemId] = useState<string | null>(null)
  const [editingBudgetItem, setEditingBudgetItem] = useState<NewBudgetItemForm>(initialNewBudgetItemForm)
  const [isDeletingBudgetItemId, setIsDeletingBudgetItemId] = useState<string | null>(null)

  useEffect(() => {
    const loadTrip = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/trips/${id}`)

        if (response.status === 404) {
          setError('This trip no longer exists.')
          return
        }

        if (!response.ok) {
          throw new Error('Unable to load this trip.')
        }

        setTrip(await response.json())
      } catch {
        setError('We could not connect to the Travel Assistant API.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadTrip()
  }, [id])

  useEffect(() => {
    const loadBudgetItems = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/trips/${id}/budget-items`)

        if (!response.ok) {
          throw new Error('Unable to load planned costs.')
        }

        setBudgetItems(await response.json())
      } catch {
        setBudgetItemsError('We could not load planned costs.')
      } finally {
        setIsLoadingBudgetItems(false)
      }
    }

    void loadBudgetItems()
  }, [id])

  const updateBudgetItem = (field: keyof NewBudgetItemForm, value: string) => {
    setNewBudgetItem((current) => ({ ...current, [field]: value }))
  }

  const createBudgetItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBudgetItemFormError(null)
    setIsSavingBudgetItem(true)

    try {
      const response = await fetch(`${apiBaseUrl}/api/trips/${id}/budget-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newBudgetItem, amount: Number(newBudgetItem.amount) }),
      })

      if (!response.ok) {
        throw new Error('Unable to save planned cost.')
      }

      const createdBudgetItem: BudgetItem = await response.json()
      setBudgetItems((current) => [...current, createdBudgetItem])
      setNewBudgetItem(initialNewBudgetItemForm)
      setIsAddingBudgetItem(false)
    } catch {
      setBudgetItemFormError('We could not save this planned cost. Please try again.')
    } finally {
      setIsSavingBudgetItem(false)
    }
  }

  const startEditingBudgetItem = (item: BudgetItem) => {
    setIsAddingBudgetItem(false)
    setBudgetItemFormError(null)
    setEditingBudgetItemId(item.id)
    setEditingBudgetItem({ name: item.name, category: item.category, amount: String(item.amount) })
  }

  const updateEditingBudgetItem = (field: keyof NewBudgetItemForm, value: string) => {
    setEditingBudgetItem((current) => ({ ...current, [field]: value }))
  }

  const saveBudgetItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingBudgetItemId) return

    setBudgetItemFormError(null)
    setIsSavingBudgetItem(true)

    try {
      const response = await fetch(`${apiBaseUrl}/api/trips/${id}/budget-items/${editingBudgetItemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editingBudgetItem, amount: Number(editingBudgetItem.amount) }),
      })

      if (!response.ok) {
        throw new Error('Unable to save planned cost.')
      }

      const updatedBudgetItem: BudgetItem = await response.json()
      setBudgetItems((current) => current.map((item) => item.id === updatedBudgetItem.id ? updatedBudgetItem : item))
      setEditingBudgetItemId(null)
    } catch {
      setBudgetItemFormError('We could not save these changes. Please try again.')
    } finally {
      setIsSavingBudgetItem(false)
    }
  }

  const deleteBudgetItem = async (item: BudgetItem) => {
    if (!window.confirm(`Delete “${item.name}” from this trip’s planned costs?`)) return

    setIsDeletingBudgetItemId(item.id)

    try {
      const response = await fetch(`${apiBaseUrl}/api/trips/${id}/budget-items/${item.id}`, { method: 'DELETE' })

      if (!response.ok) {
        throw new Error('Unable to delete planned cost.')
      }

      setBudgetItems((current) => current.filter((currentItem) => currentItem.id !== item.id))
    } catch {
      setBudgetItemsError('We could not delete this planned cost. Please try again.')
    } finally {
      setIsDeletingBudgetItemId(null)
    }
  }

  const plannedTotal = budgetItems.reduce((total, item) => total + item.amount, 0)

  return (
    <section className="trip-details">
      <Link className="back-link" to="/">← All trips</Link>

      {isLoading && <p className="status-message">Loading your trip…</p>}
      {error && <p className="status-message error-message">{error}</p>}

      {trip && (
        <>
          <div className="trip-details-header">
            <div>
              <div className="card-topline">
                <span className="trip-type">{trip.type.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span className="status-pill">Planned</span>
              </div>
              <h1>{trip.destination}</h1>
              <p className="trip-dates">
                {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
              </p>
            </div>
            <div className="trip-budget-summary">
              <span>Total budget</span>
              <strong>
                {formatMoney(trip.budget, trip.currency)}
              </strong>
            </div>
          </div>

          <div className="trip-detail-grid">
            <section className="detail-section">
              <h2>Itinerary</h2>
              <p>Add places, events, museums, and times here.</p>
            </section>
            <section className="detail-section">
              <h2>Budget & expenses</h2>

              <div className="budget-overview">
                <div>
                  <span>Planned</span>
                  <strong>{formatMoney(plannedTotal, trip.currency)}</strong>
                </div>
                <div>
                  <span>Remaining</span>
                  <strong>{formatMoney(trip.budget - plannedTotal, trip.currency)}</strong>
                </div>
              </div>

              <div className="budget-actions">
                <button className="text-button" type="button" onClick={() => { setEditingBudgetItemId(null); setIsAddingBudgetItem(true) }}>
                  Add planned cost +
                </button>
              </div>

              {isAddingBudgetItem && (
                <form className="budget-item-form" onSubmit={createBudgetItem}>
                  <label>
                    What are you planning to pay for?
                    <input value={newBudgetItem.name} onChange={(event) => updateBudgetItem('name', event.target.value)} placeholder="e.g. Hotel" required />
                  </label>
                  <div className="form-row">
                    <label>
                      Category
                      <select value={newBudgetItem.category} onChange={(event) => updateBudgetItem('category', event.target.value)}>
                        <option value="Accommodation">Accommodation</option>
                        <option value="Transport">Transport</option>
                        <option value="Food">Food</option>
                        <option value="Activities">Activities</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>
                    <label>
                      Amount ({trip.currency})
                      <input type="number" min="0.01" step="0.01" value={newBudgetItem.amount} onChange={(event) => updateBudgetItem('amount', event.target.value)} placeholder="0" required />
                    </label>
                  </div>
                  {budgetItemFormError && <p className="form-error">{budgetItemFormError}</p>}
                  <div className="form-actions">
                    <button className="text-button" type="button" onClick={() => setIsAddingBudgetItem(false)}>Cancel</button>
                    <button className="primary-button" type="submit" disabled={isSavingBudgetItem}>
                      {isSavingBudgetItem ? 'Saving…' : 'Add cost'}
                    </button>
                  </div>
                </form>
              )}

              {isLoadingBudgetItems && <p className="detail-message">Loading planned costs…</p>}
              {budgetItemsError && <p className="detail-message form-error">{budgetItemsError}</p>}
              {!isLoadingBudgetItems && !budgetItemsError && budgetItems.length === 0 && (
                <p className="detail-message">No planned costs yet.</p>
              )}
              {budgetItems.length > 0 && (
                <ul className="budget-item-list">
                  {budgetItems.map((item) => editingBudgetItemId === item.id ? (
                    <li className="budget-item-editing" key={item.id}>
                      <form className="budget-item-form" onSubmit={saveBudgetItem}>
                        <label>
                          What are you planning to pay for?
                          <input value={editingBudgetItem.name} onChange={(event) => updateEditingBudgetItem('name', event.target.value)} required />
                        </label>
                        <div className="form-row">
                          <label>
                            Category
                            <select value={editingBudgetItem.category} onChange={(event) => updateEditingBudgetItem('category', event.target.value)}>
                              <option value="Accommodation">Accommodation</option>
                              <option value="Transport">Transport</option>
                              <option value="Food">Food</option>
                              <option value="Activities">Activities</option>
                              <option value="Other">Other</option>
                            </select>
                          </label>
                          <label>
                            Amount ({trip.currency})
                            <input type="number" min="0.01" step="0.01" value={editingBudgetItem.amount} onChange={(event) => updateEditingBudgetItem('amount', event.target.value)} required />
                          </label>
                        </div>
                        {budgetItemFormError && <p className="form-error">{budgetItemFormError}</p>}
                        <div className="form-actions">
                          <button className="text-button" type="button" onClick={() => setEditingBudgetItemId(null)}>Cancel</button>
                          <button className="primary-button" type="submit" disabled={isSavingBudgetItem}>
                            {isSavingBudgetItem ? 'Saving…' : 'Save changes'}
                          </button>
                        </div>
                      </form>
                    </li>
                  ) : (
                    <li key={item.id}>
                      <div className="budget-item-description">
                        <strong>{item.name}</strong>
                        <span>{item.category}</span>
                      </div>
                      <div className="budget-item-actions">
                        <strong>{formatMoney(item.amount, trip.currency)}</strong>
                        <button className="icon-button" type="button" onClick={() => startEditingBudgetItem(item)} aria-label={`Edit ${item.name}`} title="Edit planned cost">
                          <Pencil aria-hidden="true" size={17} />
                        </button>
                        <button className="icon-button danger-button" type="button" onClick={() => void deleteBudgetItem(item)} disabled={isDeletingBudgetItemId === item.id} aria-label={`Delete ${item.name}`} title="Delete planned cost">
                          <Trash2 aria-hidden="true" size={17} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  )
}

function App() {
  return (
    <main className="app-shell">
      <Header />
      <Routes>
        <Route path="/" element={<TripDashboard />} />
        <Route path="/trips/:id" element={<TripDetails />} />
      </Routes>
    </main>
  )
}

export default App
