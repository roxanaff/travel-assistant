# Travel Assistant - Plan

## Idea

A trip assistant that helps people to:
- plan realistic trips, 
- avoid missing time-sensitive activities, 
- pack appropriately, and 
- stay on budget
- alone or with friends.

First features:

1. Planning a trip day by day.
2. Understanding the expected and actual cost of that trip.

## Core flow

1. A user creates a trip with a name, destination, dates, and currency.
2. They add activities they want to do, such as museums, restaurants, events, beaches, bars, and attractions.
   1. each with: optional date & time, (estimated) price, duration, location, opening hours, notes 
3. The app displays activities in an ordered itinerary list.
4. It estimates the trip budget, then tracks actual spending during the trip.
5. It provides a manual packing checklist.

## First stage — agreed scope

The first stage is a structured, manual trip planner. It does not depend on external travel data or automatic suggestions.

- Create draft and dated trips, with automatically calculated lifecycle statuses
- Show all trip-setup information on dashboard cards; notes use a truncated preview
- Open each trip in a tabbed trip workspace, with Itinerary as the default section
- Add activities manually, with optional scheduling details, location/link, opening hours, and priority
- Show activities in a date-ordered itinerary list with empty-day and unscheduled sections
- Warn when a scheduled activity falls outside its entered opening hours
- Store a total target budget, without per-category planned allocations yet
- Provide a manual, editable packing checklist with optional categories, quantities, reordering, and a reusable default list

## Still open

No open product decisions at this stage.

### 1. Trip setup

Create the basic trip information:

- Trip name (required)
- Primary destination
  - optional while the trip is a draft; required for an upcoming trip
  - later: destination search / make sure destination exists; initially treat this as display text
  - later: support multiple destinations, structured as countries with one or more cities/areas within each country
- travel dates
  - optional while the trip is a draft; required for an upcoming trip
  - when a start date is selected, default the end date to the following day
- Later: Number of travellers, initially single user
- Trip type - multiple choice
  - optional; default to "Not specified"
  - city break, 
  - beach, 
  - hiking, 
  - skiing, 
  - business, 
  - other (later: option for free text)
- Currency (default from the user's locale; editable)
- Target budget - optional
- notes / free text 

#### Trip lifecycle status

The user does not choose the status; it is calculated automatically from the completed fields and dates.

- **Draft:** destination or travel dates are missing
- **Upcoming:** destination and travel dates exist, and the start date is in the future
- **Ongoing:** today falls between the start and end dates
- **Past:** the end date has passed

This lets users begin planning before details are fixed, while still clearly separating unfinished trips from upcoming 
and completed ones.

Later:

- remind user / change something in the display when an upcoming trip is close, e.g. 1 week before

#### Later: multiple destinations

The initial version uses one primary destination. The data model should allow this to evolve into a list of destinations:

```text
Trip
└── Destinations
    ├── Country: Italy
    │   ├── City: Rome
    │   └── City: Florence
    └── Country: France
        └── City: Paris
```

Later, each destination can include arrival/departure dates and notes. Activities can then be attached to a specific city or destination; initially, activities belong only to the trip.

#### Dashboard cards

- Initially, show the trip name, primary destination, dates, trip type(s), status, target budget, and a truncated notes preview.
- Clicking a card opens the trip workspace on the Itinerary section.
- Later, reduce or reorganize card content if the dashboard becomes too crowded. Do not use expandable cards initially.

#### Trip workspace

The trip workspace uses separate sections instead of putting itinerary, budget, expenses, packing, and settings on one long page.

- A persistent header shows the trip name, primary destination, dates, and lifecycle status.
- Keep this header compact and above the section navigation; do not use a permanent side panel.
- Sections use tab-style navigation with their own URLs:
  - **Itinerary** (default): `/trips/:id`
  - **Budget & expenses**: `/trips/:id/budget`
  - **Packing**: `/trips/:id/packing`
  - **Details**: `/trips/:id/details`
- **Details** is the place to edit trip setup information: name, destination, dates, trip type(s), currency, target budget, and notes.
- Editing opens the same form used to create a trip, pre-filled with the selected trip's current values.
- Do not add a separate Overview section initially. The dashboard provides the broader overview and Itinerary is the most useful trip default.
- A later Overview section may summarize progress, upcoming reminders, shared travellers, and budget status.

### 2. Activities and itinerary

Users add activities manually. Only the name is required.

Each activity should contain:

- **Name** (required)
- **Category** (optional): museum, tour, event, food, beach, bar, attraction, or other
  - no category is the default; it is not displayed as a label
  - later: allow custom category text and order category suggestions based on the trip type
- **Date** (optional)
  - must fall inside the trip when the trip has dates
  - activities in a Draft trip can only be unscheduled until travel dates are set
- **Start time** (optional)
  - no default time is selected
  - cannot be set without a date
- **Estimated duration** (optional)
  - the user enters duration rather than an end time, so an activity can have a duration without a fixed start time
  - entered as hours and minutes; stored internally as a total number of minutes and displayed in a friendly form, such as `1 h 30 min`
- **Opening and closing hours** (optional)
  - entered manually and apply to the planned visit day only, not to a recurring weekly schedule
  - support hours that run past midnight, e.g. `18:00–02:00`
- **Entry cost** (optional; separate from the budget in the first stage)
- **Location** and/or **external link** (optional)
- **Priority**: must-do, would-like-to-do, optional
  - default: would-like-to-do
- **Notes** (optional free text)

#### First-stage itinerary view

- Use an ordered list rather than a calendar.
- Display a section for every trip day, including days with no activities.
- Display sections as one vertical list, not as day columns.
- Order timed activities chronologically within a day.
- An activity that runs past midnight appears only on the section for its start date.
- Show activities with a date but no time after timed activities for that day.
- Show activities without a date in an **Unscheduled** section after the trip-day sections.
- Order Unscheduled activities by priority (must-do, would-like-to-do, optional), then creation order.
- A compact activity entry shows its time (if set), name, category (if set), estimated duration (if set), cost (if set), and priority.
- Each entry has Edit and Delete buttons. Clicking the entry itself does nothing.
- Delete happens immediately, without a confirmation dialog. Show a short-lived Undo message after deletion.
- Opening-hours warnings:
  - no start time: no warning
  - start time without a duration: warn when the start time is one hour or less before closing
  - start time and duration: warn when the calculated end time is after closing

#### Changing trip dates

- When the trip start date changes and the new trip is the same length or longer, shift every scheduled activity by the same number of days so their relative positions are preserved.
- If the trip is shortened, keep activities on the first remaining trip days and automatically move activities beyond the new end date to Unscheduled.

#### Later itinerary features

- Calendar view
- Drag and drop between itinerary sections and manual ordering for untimed activities
- Detect overlapping activities
- Show empty time slots
- Short and expanded itinerary-item views for calendar layouts
- Take transport time to the activity into account
- Opening-hours hints when no start time is set, e.g. “This place closes at 20:00; visit before 19:00.”
- Reservations
- Ticket or booking status
- Attendee counts
- Activity recommendations

- Link itinerary costs to budget-planner entries, with clear rules for which value is the source of truth.

### 3. Budget planner

The optional **Target budget** is the user's spending limit or goal. It is a fixed reference value: planned costs and expenses never change it automatically. The user can edit it manually in Trip Details if their intended limit changes.

The target budget is optional. Without one, users can still add planned costs and expenses, but the app does not show remaining-budget or over-budget states.

#### Planned budget by category

Users plan estimated costs before the trip through category groups:

- Travel to/from destination (flights, intercity train/bus, or fuel and tolls)
- Accommodation
- Local transport (taxi, tram, metro, bus, ride share, or local rental)
- Food
- Activities and museum entries
- Bars and nightlife
- Shopping
- Emergency buffer
- Other (later: option for free text)

Categories appear only after they contain an entry. A displayed category includes a `+` action to add another entry to that category.

Each planned-cost entry has a required amount and an optional name. The category amount is always calculated from the sum of its entries; do not store a separate manual category total.

For example:

```text
Activities & museums — €75
  Museum 1              €20
  Museum 2              €15
  Unnamed estimate      €40
```

The user can edit, rename, or delete planned-cost entries. Deletion has no confirmation dialog and provides a short-lived Undo action.

The planned budget calculates:

`Total planned cost = sum of planned category amounts`

If a target budget exists:

`Theoretical remaining budget = target budget − total planned cost`

Show a negative remaining amount as over budget. Allow money to remain unallocated and allow planned costs to exceed the target. Emergency buffer is included in planned costs but is not available as an expense category.

Activity entry costs remain separate from planned costs until this relationship is designed and implemented later.

#### Expense tracking

Expense tracking is added after the planned budget by category.

- An expense requires a name and amount.
- Category is optional and empty by default.
- Date defaults to today but can be cleared.
- Expenses can be recorded before or during the trip.
- Expenses use the same categories, excluding Emergency buffer.
- Group expenses by category in the fixed category order, with **Uncategorised** last.
- Within a category, sort dated expenses newest first and undated expenses last.
- An expense can be edited, renamed, or deleted. Deletion has no confirmation dialog and provides a short-lived Undo action.

The expenses view calculates:

`Actual remaining budget = target budget − total actual expenses`

This is independent from the planned budget's theoretical remaining amount. If no target budget exists, show total actual spending but no remaining amount or over-budget state.

### 4. Packing checklist

The first-stage packing experience is a manual checklist:

- Packing is available for Draft trips as well as dated trips.
- Each item has a required name, optional category, optional quantity, and packed/unpacked state.
  - quantity defaults to one and is displayed only when it is greater than one, e.g. `10 × T-shirts`
- Available categories: Documents & money, Toiletries, Clothing, Electronics, Health, and Other.
- The standard display uses two lists from one underlying checklist:
  - **To pack** for unpacked items
  - **Packed** for packed, muted items
  - checking or unchecking moves an item between these displayed lists without changing its saved manual order
  - show progress by checklist item count, e.g. `8 of 15 packed`
- Provide a display option to group the two lists by category. In the ungrouped view, show an item's category as a small label on the right.
- Reorder items with drag and drop within To pack and Packed lists.
- Add, edit, rename, and delete items. Deletion has no confirmation dialog and provides a short-lived Undo action.

For an empty checklist, offer:

- **Use default list**
- **Start empty**

The default list is copied into the trip checklist and can be freely edited afterwards. It contains:

- Documents & money: Passport/ID, Wallet/cards/cash, Tickets/reservations, Keys
- Toiletries: Toothbrush, Toothpaste, Deodorant
- Clothing: Underwear, Socks, Sleepwear
- Electronics: Phone charger
- Health: Regular medication

Later, users can add default items after starting empty; prevent duplicates when doing so.

Later, generate a packing list based on:

- Number of days
- Destination and season
- Trip type
- Planned activities
- Laundry access
- Personal preferences

For example, a five-day beach trip with a fancy dinner and a hike might suggest 

- beachwear, 
- sunscreen, 
- sandals, 
- a dinner outfit, 
- hiking shoes, 
- travel documents, 
- chargers, 
- medication.

Rule-based suggestions come after the manual checklist. Weather-powered recommendations come later still.

Later packing features:

- Custom categories and free-text category names when Other is selected
- User-customizable default templates
- Trip-type, activity, weather, and destination-based suggestions
- Shared and personal packing lists for group trips

## Build order

### Phase 1 — Foundation

**Goal:** A user can create and organize a trip.

- Trip setup
- Tabbed trip-workspace navigation
- Activity creation
- Ordered itinerary-list view
- Optional manual scheduling
- Activity priorities
- Opening-hours warnings
- Manual packing checklist and default list

### Phase 2 — Planned budget

**Goal:** A user understands the expected cost before travelling.

- Planned budget by category, with optional named entries
- Theoretical remaining budget and over-budget state when a target exists

### Phase 3 — During-trip spending

**Goal:** A user can track actual expenses with minimal effort.

- Quick expense entry
- Actual remaining budget and over-budget state when a target exists
- Category and daily summaries

### Phase 4 — Packing suggestions

**Goal:** A user receives useful packing recommendations.

- Rule-based packing suggestions based on trip type and duration
- Optional additions based on activities and laundry access

### Phase 5 — Shared trips

**Goal:** Groups can plan and split costs together.

- Invite travellers
- Shared itinerary
- Shared expenses
- Track who paid
- Automatic split calculations
- Settlement summary, such as *“Ana owes Maria €24.50.”*

### Phase 6 — Smart assistant and external data

**Goal:** The app proactively helps users make better plans.

- Activity suggestions based on preferences
- Museum and event discovery
- Opening hours and entry prices fetched automatically
- Warnings about closed days or booking requirements
- Suggestions for empty itinerary slots
- Route and travel-time optimization
- Weather-aware packing and itinerary suggestions
- Conversational AI assistant

## Later / optional features

These features are useful but should not block the first release:

- Google Maps or map-provider imports
- Restaurant, nightlife, and local-event recommendations
- Booking links or ticket purchasing
- Receipt scanning
- Negative expenses/refunds
- Multiple currencies and exchange-rate conversion
- Budget per day and per traveller
- Offline mode
- Notifications for reservations, departure times, and budget limits
- Exportable itinerary and expense reports

## Confirmed product decisions

- **Primary user:** single-user trips first; shared trips and expense splitting come later.
- **Main use:** trip planning before travel, followed by expense tracking during travel in a later phase.
- **Activity source:** manual entry first; imports and discovery are later features.
- **Budget style:** begin with one rough total target budget, then add planned category amounts and detailed expense tracking in later phases.
- **Interaction style:** structured planner first; add a conversational AI assistant only after the app has reliable trip, activity, availability, preference, and expense data.
