# Product roadmap

Last organised: **27 October 2026**.

This is the single roadmap. It combines the earlier roadmap and the user's updated notes.
It describes direction and order, not permission to implement every idea or a fixed delivery date.
Detailed current decisions and audit evidence live in the
[app review and improvements plan](requirements/app-review-and-improvements.md).
Individual bugs and smaller ideas live in the [maintenance backlog](maintenance-backlog.md).

Goal: plan and run a real trip without scattered notes, emails and spreadsheets.

## Current order

| Order | Work | Boundary |
| --- | --- | --- |
| 1 | Organise planning documents. | One roadmap; readable decisions/work order; preserve technical findings. |
| 2 | Design the shared-data structure. | Core with optional activity/booking/budget/expense parts; independent architecture review before code. |
| 3 | Build the agreed relationships. | Shared facts, finances, duplicate prevention, categories/activity roles, outside-trip dates and related links. |
| 4 | Finish relevant frontend/backend cleanup. | Simplify repeated/patched code, styles and controls; remove only verified unused parts. |
| 5 | Improve the existing interface. | Remove outer page cards first; retain item boxes initially; improve mobile navigation and existing lists. Keep Budget & Expenses together. |
| 6 | Finish the review and checks. | Verify workflows and regressions; every audit finding fixed, replaced or explicitly deferred. |
| After review | Choose the next major feature. | Budget/Expenses redesign is the first proposal, but the user can postpone it until after shared trips. Agree account/profile preparation and then the first shared release. |

The review is not complete merely because tests pass, and it does not require every candidate
refactoring or later feature to be implemented. Work in small reviewed chunks with manual commit
checkpoints. Steps 3–5 can be arranged by dependency rather than as separate frontend/backend rewrites.

**Shared trips stay after the current review/improvements.** Prepare for sharing in the data
design now, but do not jump ahead to collaboration. The exact account/profile work before sharing
and placement of other extensions below remain to be agreed.

## What already works

The initial manual, single-user app includes account-owned trips, dashboard/trip lifecycle,
Details, activities, planned and actual costs, Packing, To-do and Bookings.

### To-do checklist — first version complete

See [To-do requirements](requirements/to-do-checklist.md).
The list follows Packing's grouped/ungrouped, editable, manually ordered, default-or-empty
interaction model with deletion Undo. It uses Done / To do and optional due dates; first release
has no reminders.

The default checklist covers:
- Travel: book outbound/return travel, check check-in requirements, arrange transfers.
- Accommodation: book, pay, save the address and check-in details.
- Documents and money: ID/passport, visas, insurance, bank/payment preparation.
- Bookings and activities: reserve priorities and buy tickets.
- Health: check medication.
- Connectivity: roaming/eSIM and offline maps.
- Before leaving: share plans/contact details, check weather and finish packing.

Later ideas: distinguish before/during-trip tasks more clearly where needed; custom categories;
completion summaries per category and on the dashboard; optional reservation links that can mark
a task complete. A savings-target task belongs with the later savings feature, not the default list.
Any future reminder system must have an account-wide off switch.

### Bookings — first version complete

See [Bookings requirements](requirements/bookings.md) for the implemented behavior.
The page sits between Itinerary and Budget & expenses today. It stores reservation name/category,
optional Requested/Confirmed/Cancelled status, provider, reference, dates/times, locations, link,
notes, total cost, paid and refunded values. Financial status is derived.

The original version uses separate records and explicit related-change reviews, one expense per
booking, optional return journeys, and no booking/planned-cost link. **That describes the delivered
version, not the next design.** The current review replaces those rules where explicitly agreed.

Current-review decisions include the small shared core, directly related activities/budget/expenses,
one stored copy of shared facts, and aggregate payment/refund values. The agreed categories are
Accommodation, Transport, Rental, Activities, Dining, Passes and Other. Relationships include event,
outbound/return, check-in/checkout, pickup/return and independently scheduled pass visits.
Full rules are owned by the review plan, not copied here.

Future reservation details: PDF/ticket uploads; optional link/PDF-assisted prefilling; guest or
attendee/party counts; possible externally sourced status updates. Do not create an entity/form per
category just for its name; the technical design should share structure where behavior matches.

## First proposed major feature after review: Budget and Expenses

This is **not a simple tab split**. Hold a brainstorming session, then write requirements and a
technical plan for two useful pages. The user can move this feature after shared trips.

Possible content:
- **Budget:** planned costs, savings/funding goal, amount saved, remaining target, progress and
  useful statistics.
- **Expenses:** actual spending, overall/category summaries, progress or remaining amounts and
  useful statistics.
- Per-day and per-traveller totals where meaningful.
- Clear navigation between related entries on the separate pages.

Savings, planned costs and actual spending are different. Before implementation, decide what the
goal is, how savings are maintained, what each progress indicator compares against, and what
happens with no target or an exceeded target. Category share of spending is not the same as
spending against a category budget. The user does not want original-estimate history.

Grouping, remembered views, related-entry details, date sorting, category collapse/order and aligned
heading totals are existing-list improvements in the current review. Budget and Expenses begin
with the same category order, then remember independent changes. Planned budget needs Ungrouped.

Later financial ideas, not automatically part of this feature:
- Expected dates for planned costs.
- Receipt uploads before OCR.
- Multiple currencies: first consider saved manual rates per transaction; never rewrite historical
  trip costs from a live rate.
- Standalone refund/negative-expense handling. An earlier idea was a Refund category; its interaction
  with derived Paid − Refunded needs design, not a second incompatible refund system.
- Optional savings-target task in To-do.

## Account and profile preparation

Decide the minimum useful scope before shared trips; a large preference system is not automatically
a prerequisite.

### Recovery and account details

- Password reset using a single-use, expiring email link.
- Choose a transactional email provider and sending address.
- Decide whether/how email addresses are verified and what existing accounts must do.
  Keep verification friction low.
- Changing username, email and password; decide which are required first.
- Profile pictures as a possible addition.

Questions from the user's notes to explain before committing to scope:
- **Rate limiting:** limits repeated sensitive requests; discuss the smallest appropriate protection
  for recovery/invitations rather than treating it as a large feature or silently omitting safeguards.
- **Session/device management:** listing sessions, revoking a device and signing out everywhere.
  Explain the benefit and decide whether it belongs in the first release or later.
- **Change history:** recording who changed shared information, especially money. Define the minimum
  required; a full user-facing audit feature is not assumed.

### Profile/settings ideas

- Number of travellers belongs to the trip, even if edited through related settings.
- Optional interests: history, food, nightlife, hiking, museums, beach, architecture.
- Pace: relaxed, balanced or busy.
- Dietary/accessibility needs, accommodation preferences and budget style.
- Preferences should not obstruct manual planning; later they can inform suggestions.
- Reusable Packing/To-do templates can later be managed here.

## Initial shared trips

Goal: let friends plan the same trip while keeping personal entries private.
This follows the review and agreed account preparation. Budget/Expenses redesign need not precede it.

Current direction:
- Shared trip details and activity list.
- Select individual bookings to share, for example a shared hotel but separate personal flights.
- Keep personal pages/data available to every member: sharing a trip does not merge everyone's budget,
  spending or checklists.
- Plan for item-level selection, such as checkboxes, and future whole-page sharing choices.
- Make shared/private trips and entries distinguishable; avatars/initials are a design idea.
- Invitations. Initial direction is equal add/edit/delete rights over shared content; advanced roles
  come later. Equal shared rights do not permit reading someone else's private entries.
- A shared schedule may update a private linked booking; its confirmation/payment details stay
  private. Permissions must be enforced by the API, not inferred from table separation.

Still to decide for the initial release:
- Whether selectable shared expenses/planned costs are included immediately, or finance pages remain
  personal first. Architecture should allow both; spending is recording only, without splitting.
- Selection/default/bulk actions, invitation/account rules, ownership when members leave, deletion,
  concurrent editing and permission to update shared trip dates.
- Whether a confirmation should explain edits affecting shared facts.

Later collaboration:
- Owner/editor/viewer roles and advanced section permissions.
- Personal versus shared Packing and To-do.
- Expense payer/participants, cost allocation, split calculations and settlement summaries.
- More detailed change history and device management if not needed initially.

Do not bundle these later ideas into the first release by treating the old roadmap's full
collaboration list as mandatory.

## Other planned features and extensions

These ideas are retained, but their exact position around the first post-review features is
not fixed. In particular, they are not all prerequisites for shared trips.

The earlier updated draft placed Activity planning's first extension and Trip overview before
account recovery and shared trips. Keep that tentative priority for the post-review planning
choice; it has not been rejected, but neither extension is an agreed prerequisite for sharing.

### Activity planning — first extension

- Overlap detection and arrival/departure/opening-hours hints.
- Arrival/departure times in daily headings where available.
- Manual ordering for untimed activities.
- Drag between dates in list view, keeping time; reuse appropriate checklist mechanisms where possible.
- Later calendar drag may move within or between days.
- A trip-date change choice between keeping activity dates and deliberately shifting the plan.
  Keep outside-trip dates with the agreed warning; the old proposal to make them unscheduled is
  superseded. Moving the whole plan remains a separate behavior to define.
- The old note rejecting opening-hours hints without a selected start time remains an excluded idea
  unless reconsidered.
- Direct activity-to-finance links are already in the current review, not duplicated as a later feature.

### Trip overview / Details

Decide whether to rename Details to Overview or add an overview section, possibly a second
desktop column. Show useful information at a glance rather than reproducing every page.

Candidates:
- Links to activities, bookings and other pages.
- Collapsible outstanding work, such as unfinished tasks and unpaid bookings.
- To-do/Packing progress, booking/reservation/payment summaries, planned/actual/remaining costs.
- Near-trip countdown and current day out of the trip length, possibly in a header.
- Later deadline warnings and externally sourced booking-status updates.
- High-priority unscheduled activities were questioned in earlier notes; inclusion remains open.

### Activity planning — second extension

- Calendar/day timeline alongside the list.
- Compact/expanded calendar layouts and visible free time.
- Manual untimed ordering, shared with the first extension rather than implemented twice.
- Later route optimisation, after location structure, travel modes, opening hours and map data.

### Past-trip history

- Separate past trips from active planning.
- Planned versus actual spending, categories, activity/booking counts, notes and lessons.
- Checklist completion can be optional rather than central.
- Individual-trip summaries and cross-trip statistics, such as average spending.

### Trip structure

- Multiple destinations, by country and city/area, each with dates and notes.
- Refine trip types based on real use.
- Settle this model before destination search, maps, weather and multi-destination dashboard cards.

### Personalisation and dashboard

- Custom activity categories and relevant category-specific fields; walks/beaches/hikes need not ask
  for opening hours.
- Dashboard search/filtering/sorting when lifecycle ordering is insufficient.
- Clear multi-destination cards.

### Packing and To-do templates

- User-managed reusable templates: add, edit, delete and later share.
- Keep the built-in default template available and non-deletable.
- Apply a template or selected items from templates; allow adding them after Start empty.
- Prevent duplicates by normalised item name.
- Later suggestions based on trip type, duration, laundry access and activities.
- Custom categories and free-text names when Other is selected.
- Live row movement is optional/deferred, not required for review completion; reopen only on request.

### Feedback

- A feedback action in the account/profile menu.
- Signed-in users submit free text without leaving the app.
- Choose private delivery/review: owner email or another reliable store.
- Decide abuse controls, privacy notice and whether account/trip/browser/diagnostic context is included.

### More detailed payments — later

The current shared-data work is not a transaction ledger. Later ideas include:
- Several payments for one booking, such as deposit and balance.
- Multiple expense/refund transactions, payment dates and methods.
- Partial refunds and non-refundable fees as transactions.
- Allocating costs across activities/travellers.
- Transaction history and migration without duplicate spending.

These are separate from the agreed aggregate Paid/Refunded model and do not require keeping an
original planned-cost estimate. Ordinary expenses already have their own payment date, independent
of an activity's or booking's schedule; those dates are not deferred to this later ledger feature.

### App-wide Undo/Redo — later

Plan Ctrl+Z and Ctrl+Y for supported app actions, introduced through shared action handling.
Preserve native text undo in inputs; related multi-record changes must undo together and redo safely.
This is not part of the current review implementation.

## Later: external data and assistance

Introduce external data with clear sources, failure handling, caching and editable manual fallback.
Imported information is a suggestion: hours, availability, prices, maps and forecasts can change.

Proposed order:
1. Destination search/validation, after trip structure is settled.
2. Weather near travel dates, including refreshing daily activity forecasts.
3. Opening hours, entry prices, closed days and booking requirements.
4. Activity/event discovery and category suggestions based on trip type.
5. Map imports, booking/ticket links and travel-time estimates.
6. Exchange-rate lookup with source/date, caching and an editable saved rate.
7. Receipt OCR after receipt uploads.
8. Booking, departure, budget and checklist notifications with an account-wide off switch.

Weather-aware Packing could suggest umbrellas/raincoats when appropriate.

Later assistant/automation/export ideas:
- Activities fitting free time and personal preferences.
- Opening-hours/conflict warnings and forecast-based packing suggestions.
- Budget estimates using destination, dates, travellers and activities.
- Conversational planning.
- Exportable activity, booking and expense reports.

Suggestions must show sources/assumptions/prices where relevant and require an explicit Add to trip
action. Imported/AI suggestions must never quietly change plans, bookings or finances.
