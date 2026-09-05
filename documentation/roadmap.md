# Product Roadmap

Stage 1 is a strong manual, single-user trip workspace: account ownership, trip lifecycle dashboard, itinerary,
planned-versus-actual spend, and packing. The next step is to make planning more complete before adding external data,
AI, or collaboration.

Non-feature-specific bugs, small usability improvements, and technical quality work are tracked in the
[maintenance backlog](maintenance-backlog.md). Promote an item into a feature's requirements only when it is required to
deliver that feature.

Goal: make the app sufficient to plan and run a real trip without needing scattered notes, emails, and spreadsheets.

---

# Stage 2 — Complete the planning workflow

Goal: make the app sufficient to plan and run a real trip without needing scattered notes, emails, and spreadsheets.

## 1. Pre-trip to-do checklist

- new workspace page
- It should mirror the packing page’s successful interaction model:
  - two states, grouped/ungrouped display, default-or-empty starting, editable items, manual ordering, undo after delete
- Uses categories to make a list easier to scan
  - Later: enable progress summaries per category
- Records things that must be done before or during the trip.
  - clear differentiation between tasks to do before vs. during
  - has an optional deadline by when the task needs to be started/completed - e.g. check-in 24h before flight

Default list:

- Travel & transport
  - Book outbound travel;
  - Book return travel;
  - Check check-in requirements;
  - Plan airport/station transfer
- Accommodation
  - Book accommodation;
  - Pay for accommodation
  - Save accommodation address and check-in details
- Documents & Money
  - Check passport/ID validity;
  - Check visa/entry requirements;
  - Arrange travel insurance;
  - Inform bank / prepare payment method;
  - _something like: get saved money up to target budget_
- Bookings & Activities
  - Reserve priority activities;
  - Buy required tickets;
- Health
  - Check medication needs
- Connectivity
  - Arrange roaming/eSIM;
  - Download offline maps
- Before leaving
  - Share itinerary/contact details;
  - Check weather forecast;
  - Complete packing

Notes / Decisions:

- Items may have an optional due date
  - but first release avoids reminders.
  - there is **ALWAYS**, for any kind of reminder - an app-wide button to turn them off
- Later: Optionally link items to reservations:
  - e.g.: “Book hotel” marked complete automatically when an accommodation reservation is added.
- Use "Done / To do", rather than “Packed / To pack.”
- Later: Allow **custom categories** after the basic version
- Later: Show checklist completion in the dashboard/workspace overview
  - also for packing

## Reservations and bookings

- new workspace page
- A good workspace order could be: `Details - Itinerary - Bookings - Budget & expenses - To-do - Packing`
  - maybe think of a new way to access the pages, e.g. group them? sub-pages?
- supported booking types:
  - Accommodation
  - Flight
  - Train / bus / ferry
  - Local transport / car hire
  - Museum / attraction
  - Tour / activity
  - Concert / event
  - Restaurant
  - Other
- Do not model each type as a separate database entity.
  - Use one `Reservation` / `Booking` record with a type and type-specific optional fields.
  - This keeps the interface consistent and avoids building six forms before you know which fields matter.

Core fields for every booking:

- Name
- Type
- Booking status
- Payment status
- Provider
- Confirmation/reference number
- Start and end date/time, as applicable
- Location
- Link to booking / document
  - Later: allow upload of pdf
  - Later: use link / pdf doc for auto-complete
- Notes
- Total price, currency, and optional amount paid
- Optional link to an itinerary activity

Type-specific fields appear only when relevant, e.g.:

| Booking type     | Extra fields                                                    |
| ---------------- | --------------------------------------------------------------- |
| Accommodation    | Check-in/out, address, guest count                              |
| Flight/transport | Departure and arrival location/time, carrier, booking reference |
| Event/activity   | Start/end time, attendee count, venue                           |
| Restaurant       | Reservation time, party size                                    |
| Car hire         | Pick-up/drop-off location and time                              |

Notes / Decisions:

- Booked versus paid:
  - a confirmed booking can be: unpaid, partially paid, fully paid, cancelled, or refunded.
- Status fields - still needs refinement
  - Booking status: Idea, Requested, Confirmed, Cancelled (Default Idea)
  - Payment status: (Default not specified - optional field)
    - Not required, Unpaid, Partially paid, Paid - idea/confirmed/cancelled bookings
    - Refunded - cancelled bookings
  - How to enforce? warnings, errors, automatically switch

Notes / Decisions:

- Add option to move items to itinerary, planned cost, expense
  - similar to planned cost
  - only paid booking to expense, unpaid to planned, any to itinerary
  - complete fields as far as possible with info from booking item
- Later: A booking may have multiple payments eventually, such as a deposit and final balance.

For the first version, simplified to one optional “amount paid” and one linked expense. - expand idea

## Itinerary extension

Build:

- Calendar / day timeline view alongside the existing list view.
- Visual empty time slots.
- Overlap detection.
- Manual ordering for untimed items.
- Drag and drop in or between days: in calendar view allow users to move an item
  - up/down in a day or
  - between days
- Arrival/departure times (if available) displayed in daily headers.
- Scheduling rules and hints for arrival and departure days, so activities do not clash with travel.
- Link a booking to an activity.
- Link an activity’s expected cost to a planned cost.
- Opening-hours hints when an activity has opening hours but no selected start time.
- Short and expanded layouts appropriate for calendar use.
- Trip-date change review for scheduled activities. When the trip dates change, ask the traveller which result they
  want before changing the itinerary:
  1. **Keep activities on their dates:** leave activities still within the revised trip range exactly where they are;
     make only activities outside the range unscheduled. This suits a fixed event such as a concert, even when travel
     plans change.
  2. **Move itinerary with the trip:** shift activities by the change in the trip start date, using the current
     automatic-adjustment rules. Activities that cannot fit in a shortened trip become unscheduled.

Note: how to best link related planned costs, expenses, activities, and bookings?

Later: route optimisation - needs map data, travel modes, opening hours, and a clear location model.

## Trip overview / Details

Add **Overview** section or improve Details

- Change "Details" to "Overview"? Or add an "Overview" section in the details? Maybe as a second column in wide-screen
- To-do progress
  - Later: with some message when tasks approach/reach their deadline and task not completed yet
- Booking status: confirmed / awaiting payment
  - Later: if a link is provided, can the status be updated automatically?
- Budget: planned, actual, remaining
- Packing progress
- Unscheduled high-priority activities
- Near-trip notices, e.g. “Trip starts in 9 days”

## Past-trip history

Separate Past trips from active planning. Give each past trip a simple summary:

- Total planned versus actual spend
- Spend by category
- Total activities / completed bookings
- Packing and checklist completion are optional, not central
- Notes and useful lessons for the next trip
- Analysis for individual trips, but also for overall past trips, e.g. mean over all trips, and other statistics

---

# Stage 3 — Make it personal and reusable

Goal: reduce repetitive entry and make the plans fit the user’s real travel style.

## Preference profile

- Add number of travellers
  - directly improves budget interpretation and reservations.
- Optional personal preferences - to the profile
  - Interests: history, food, nightlife, hiking, museums, beach, architecture, etc.
  - Pace: relaxed, balanced, busy
  - Dietary and accessibility needs
  - Accommodation preferences
  - Budget style

- Preferences do not affect the manual workflow.
  - Later: They become inputs for suggestions.

## Trip structure

- Support multiple destinations, structured by country and city/area.
- Let each destination have its own dates and notes.
- Refine the trip-type list as real usage shows which types are useful.

This is a significant data-model decision. It should be settled before destination search, maps, weather, and
multi-destination dashboard cards are implemented.

## Itinerary personalisation

- Support custom activity categories.
- Provide category-specific activity forms where appropriate; for example, hiking, beach time, and city walks should not
  collect opening hours.

## Dashboard management

- Add search, filtering, and alternative sorting when lifecycle ordering alone is no longer enough.
- Show multiple destinations clearly on dashboard cards.

## Packing templates and rules

Build on the existing default list:

- User-defined reusable packing templates
  - can be added to the profile: add, edit, delete, (later: share) options
  - then button to use template
  - default list is then the default template - can't be deleted
- User-defined reusable to-do checklist templates, managed with the profile personalisation features.
- Add default items from set of items in all templates
  - button to add individual items from existing templates
- Option to add default items / templates later, even after choosing “Start empty”
- Duplicate prevention by normalised item name
- Suggestions based on trip type, duration, laundry access, and planned activities
- Custom categories and free-text category names when Other is selected.

## Better budget control

Add:

- Per-day and per-traveller totals
- Savings progress, separate from spending and planned costs
- When savings progress is implemented, optionally add a relevant task to the trip's to-do checklist. It is not part of
  the initial default checklist.
- Refunds / negative expenses - refund as a category that makes negative expenses allowed
- Planned-cost expected dates
- Planned-cost grouping and sorting alternatives
- Collapsible budget groups
- Receipt uploads, before OCR
- Multiple currencies - should be carefully scoped.
  - First: manually entered exchange rates saved per transaction;
  - no recalculation of historical trips from a live rate.

---

# Later Features

## Travel intelligence

Goal: help users decide and plan, while retaining user control.

This stage introduces external data, so each integration must have

- clear sourcing,
- failure states,
- caching, and
- editable manual fallback.

Build in this order:

1. Destination search/validation
2. Weather forecast - near travel dates, including a per-day itinerary forecast that refreshes as the forecast changes
3. Opening hours, entry prices, closed days, and booking requirements
4. Activity and event discovery, including category suggestions based on trip type
5. Map-provider imports, booking and ticket-purchase links, and travel-time estimates
6. Automatic exchange-rate lookup, with documented sources, rate dates, caching, and an editable saved rate
7. Receipt OCR after receipt uploads are established in Stage 3
8. Notifications - for booking, departure, budget, and checklist deadlines
   - Provide an account-wide setting to turn off all reminders and notifications.

Key rule:

- imported data is a suggestion, not a source of truth.
  - Opening hours change, events sell out, map data can be wrong, and forecasts are temporary.

Weather-aware packing

- e.g. packing page shows a message to pack rain stuff: umbrella, raincoat, etc.

---

## Shared trips

Goal: allow a group to use the same trip without losing clarity over ownership and money.

Prerequisites:

- Password recovery by a single-use email link with an expiry
- Transactional email provider and sending address for account recovery
- Rate limiting for account-sensitive endpoints
- Device and session management, including active-session listing, device revocation, and sign-out everywhere
- Audit-friendly data changes, at least for shared financial records

Build:

- Invitations
- Collaborator roles: owner, editor, viewer
- Shared-trip indicators
- Advanced section permissions
- Shared itinerary and bookings
- Personal versus shared packing lists
- Expense payer and participant selection
- Split calculations
- Settlement summary: who owes whom

Collaboration should come after Bookings and Budget links are well-defined. Otherwise the app will need to redesign
shared ownership repeatedly.

---

## Intelligent Assistant, automation, exports

Goal: turn accumulated structured trip data into useful guidance.

Potential capabilities:

- Suggested activities that fit itinerary gaps and preferences
- “Your museum visit conflicts with closing time” warnings
- Suggested packing items from forecast and plans
- Budget estimates based on destination, dates, travellers, and selected activities
- Conversational planning assistant
- Exportable itinerary, booking, and expense reports

The assistant should propose changes with clear sources, assumptions, prices, and an explicit “Add to trip” action. It
should never quietly alter an itinerary, bookings, or budget.
