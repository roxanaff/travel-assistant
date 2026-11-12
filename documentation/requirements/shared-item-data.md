# Shared item data: technical plan

Branch: `feature/shared-item-data`. Planning started **27 October 2026**.

**Status: shared storage implemented for planned costs and expenses on the feature branch.** The [review plan](app-review-and-improvements.md#decided-shared-data-and-relationships--d01)
owns the agreed product behavior. This file owns the technical design and rollout for this major change.
It does not replace the broader review plan or approve its unrelated UI/refactoring work.

Use the [development guide](../development-guide.md) for setup/check commands and the
[architecture procedure](../../.agents/skills/plan-architecture/SKILL.md) for review.
Each implementation chunk needs an architecture check, decisions on behavior it changes and
implementation authorization.

## What this change is for

Store a shared fact once instead of copying it into booking/activity/budget/expense records and
asking users to reconcile it repeatedly. Keep standalone entries and meaningful differences:
payment date is not event date, Paid is not total cost, and a pass visit is not the pass validity.

Related entries retain their own titles, prefilled on creation. There is no need for a fifth
editable common title. Cancelling a booking uses the agreed Keep/Delete choices, not later
synchronization warnings. Shared trips are not implemented now, but private parts must remain
separable from accessible shared facts.

## Current implementation and affected code

| Current owner | Relevant behavior and consequence |
| --- | --- |
| `Models/Booking.cs`, `ItineraryItem.cs`, `PlannedCost.cs`, `Expense.cs` | Copy names, costs and schedules; activities have BookingId/role and expenses have independent booking/plan IDs. |
| `Data/TravelAssistantDbContext.cs` | Unique expense per booking and per plan, but no identity joining both creation paths. Trip ownership and relationships already exist. |
| `Endpoints/BookingEndpoints.cs` | Coordinates booking CRUD, payments, creating/linking/unlinking activities and expenses. Uses transactions/snapshot checks in selected paths. |
| `Services/LinkedRecordReviews.cs` and its endpoint | Projects copied values, persists directional reviews and validates updates by applying/restoring proposals. |
| `Services/BookingExpensePayments.cs` | Computes Paid from expense net plus refund and can raise booking total. That projection must not become the new editable expense contract. |
| `Endpoints/PlannedCostEndpoints.cs`, `ExpenseEndpoints.cs`, `ItineraryEndpoints.cs` | Separate mutations/response mapping and review tracking. Expense request Amount currently means net spending. |
| `Validation/*Validation.cs` | Activity dates currently must fit the trip; expense/plan creation requires positive values; refunds currently require a cancelled booking. |
| `Endpoints/TripEndpoints.cs` | Trip date edits currently shift activities or clear dates/times. An automatic boundary expansion cannot call this path unchanged. |
| `frontend/src/types`, `api`, feature components and relationship utilities | Forms/DTOs assume copied values and General/Outbound/Return roles. Budget still mounts both financial sections. |
| `useLinkedRecordReviews`, `RelatedRecordReviews`, `LinkedRecordWarnings` | Refresh/present synchronization reviews. Reassess callers when each relationship moves to shared storage. |

Source paths above are relative to `backend/` unless explicitly frontend paths. Reuse `TripAccess`,
existing field controls/forms, `ConfirmDialog`, navigation/highlight helpers, draft protection and
API error/mutation utilities. EF Core remains the persistence boundary; no generic repository,
new state library or universal form framework is proposed.

## Proposed stored records

Use the agreed names below for the new backend models. Existing entry IDs should stay stable for
navigation. Current source filenames in the implementation inventory above remain historical references.

`ItemCore` applies to activities, bookings, planned costs and expenses that represent the same
underlying item. It is not a universal base record: Packing and To-do items remain directly linked
to the trip. Schedule, cost and payment records reference the core; they do not each get another core.

| Record | Stored facts | Cardinality |
| --- | --- | --- |
| `ItemCore` | Id, TripId, revision token, creation time. No common editable name. | One underlying purchase/reservation or standalone item. |
| `ItemSchedule` | Id, ItemCoreId, span kind, nullable fixed slot, start/end date/time, venue or departure/arrival locations; optional duration-only representation described below. | Zero or more per item. |
| `ItemCost` | ItemCoreId, nullable expected/confirmed Cost. | Zero or one per item; no record needed when no cost was entered. |
| `ItemPaymentTotals` | ItemCoreId, aggregate Paid and Refunded. | Zero or one per item in this version; one reservation payment total, not one per member. |
| `Booking` | Stable entry Id, ItemCoreId, its own title, category/status, provider, confirmation, reservation link/notes. | Zero or one per item. |
| `Activity` | Stable entry Id, ItemCoreId, ScheduleId/binding, its own title, category/priority, opening hours, link/notes and local endpoint-task duration where applicable. | Zero or more per item, restricted by role. |
| `PlannedCost` | Stable entry Id, ItemCoreId, financial owner UserId, its own title and budget category. | Zero or one per item/financial owner. Currently the owner is the trip owner. |
| `Expense` | Stable entry Id, ItemCoreId, financial owner UserId, its own title, expense category and ExpenseDate. | Zero or one per item in this version, belonging to the recording owner. |

Keep model names singular; `ItemPaymentTotals` names a single aggregate of payment values.
Name each source file after its main type. New business-logic classes use a descriptive `Service`
suffix, and API contracts consistently use `Request` or `Response`. Rename legacy types when their
workflows are replaced rather than renaming code scheduled for removal. The code model `Activity`
replaces `ItineraryItem`; this does not decide the visible page label or change API routes by itself.

Booking total, planned amount and eligible event activity cost are projections of ItemCost.Cost.
Expense net is a projection of Paid minus Refunded; no stored Expense.Amount copy.
ExpenseDate stays expense-owned and does not follow any schedule edits.
Currency continues to come from the trip; this is not a multiple-currency change.

Keep TripId in composite keys where useful to enforce same-trip references. The context must enforce
that parts and referenced schedules belong to the same ItemCore/trip, not merely validate IDs in UI.
Use unique indexes for one booking, expense, cost record and payment-total record per item, plus
one planned cost per item/financial owner. For now financial owners are set by the server from the
authorized trip owner, never trusted from a request. No membership or sharing behavior is added.
Activities are unique
per schedule/binding slot; pass visits receive separate schedule IDs, so the same slot rule works.
Also enforce one fixed Primary, Outbound or Return schedule per item: use a unique composite
item/fixed-slot index, with null fixed slots for independently identified visits. PostgreSQL's
ordinary nullable unique-index semantics allow several visits; verify the intended behavior in
both relational test providers. A duplicate fixed schedule must fail even if no activity exists.

Trip deletion still cascades to its data. Part deletion must not cascade to sibling parts or shared
schedules/finances. Use explicit cleanup after checking remaining references; restrict inappropriate
deletes in FK configuration. Cleanup and mutations are one transaction.

### Schedule ownership and role bindings

Use one span record for a hotel stay or rental, with activities referencing its start or end.
Do not store separate check-in dates and a copied hotel-start date.

| Case | Schedule records | Activity binding and displayed price |
| --- | --- | --- |
| Standalone activity | One independent event schedule, possibly undated. | Whole schedule; optional item cost. |
| Single event/Dining | One primary event span. | One whole-event activity; shared cost. |
| Transport | Outbound span and optional return span. | One whole-journey activity per span; no activity price. |
| Accommodation | One primary stay span. | Optional Start/check-in and End/checkout activities; no activity price. |
| Rental | One primary rental span. | Optional Start/pickup and End/return activities; no activity price. |
| Passes | One validity span plus one independent visit schedule per linked activity. | One whole activity per visit schedule; no copied pass price. |

Use explicit role/binding enums and a small supported-role policy shared by commands/projections.
Span kind (event, journey, stay, rental, validity or visit) stays on the schedule, so deleting a
booking does not erase the meaning of the schedules still used by its activities.
No arbitrary graph of schedule links. Remove the unrestricted Other activity role when the new
role workflow is ready; unresolved legacy associations are handled by the migration gate.

An ordinary venue is stored once. Hotel Start/End both resolve to that venue; transport/rental
bindings resolve to departure/pickup or arrival/return locations. A pass visit has its own venue.

Preserve partial schedule information. StartTime requires StartDate; an omitted arrival date with
an arrival time retains the existing same-day interpretation. Do not silently discard a time.
Use explicit end fields as the span authority when present and derive whole-activity duration.
An optional duration-only value may represent an undated activity or an activity without a complete
end; it is not stored alongside an explicit end as a second independently editable answer.
Editing a whole-event or whole-journey activity's duration updates the shared end time when the
start date and time are known. Local duration for a check-in, checkout, pickup or return task
belongs to that activity. Commands validate the resulting span and preserve partial schedule data.

Retain current local DateOnly/TimeOnly semantics and supported validation. Do not introduce timezone
conversion or infer elapsed flight duration across time zones in this change. Calendar arithmetic
must be tested without relying on the browser machine's daylight-saving timezone.

### Financial ownership

Cost is the current expected/confirmed total, not an original estimate snapshot. Paid and Refunded
are aggregate totals, not transactions. A plan references Cost; the expense exposes net spending.
No booking/plan/expense is created merely because a cost/payment-total record exists.

A shared hotel booking has one reservation-wide payment total, reflecting payment by one person.
Per-member Your paid/Your refunded totals are outside the current scope. Personal
reimbursements, allocations and split payments are later work. Splitting Cost and PaymentTotals now
allows a future payment ledger/allocation model without changing the shared schedule/identity.
An expense's owner identifies whose spending entry it is; it is not an invented participant split.
The owner dimension on planned costs leaves personal budgets possible later. How shared plans
appear in multiple members' views is still a sharing-feature decision, not implemented here.

Retain decimal precision/maximum from MoneyValidation. Enforce nonnegative Cost/Paid/Refunded and
Refunded <= Paid in database constraints and authoritative validation. Booking-backed payments
retain the known-total and Paid <= Cost rules; a standalone expense can have Paid without Cost.
Do not equate a standalone plan's expected cost with money already paid.

Allow explicit corrections of Cost and payment totals together. If a museum was mistakenly entered
as costing €50 with €50 paid and admission was actually free, saving Cost €0 and Paid €0 is valid.
Only record a refund when money was returned. If the correction to free invalidates a linked
planned cost or removes a payment entered by mistake, the save confirmation names the affected
entries and identifies which will be removed from Budget and Expenses. Confirming saves the
correction and removes those entries together in one transaction. Cancelling leaves all records
as they were. A planned cost requires a positive amount.

Creating/linking an expense chooses its Paid/Refunded values explicitly. If a booking's Cost must
increase to accept the payment, include the proposed increase for explicit acceptance. Never silently
lower Cost or add another payment. Net spending cannot be submitted as an editable financial field
in the new API. Keep computed net in responses for display/summing.

An expense that has been fully refunded remains visible with zero net spending. Its details show
the original Paid amount and the matching Refunded amount. The positive-only legacy expense
validator must allow this result. Expense details show Cost, Paid and Refunded where applicable.
A standalone expense can record a refund up to the amount paid. For booked items, retain the
existing refund eligibility rule for cancelled bookings. An active booking cannot link to an
already-refunded expense. The future link flow should present choices for resolving this case.
The exact choices and their presentation are open.

### Examples of the resulting records

- A free city walk: one item, activity and schedule; optional explicit zero Cost. No budget/expense.
- A concert: one item, one schedule and optional cost/payment records, plus whichever parts exist.
  Names remain independent. Schedule edits are shared; expense date is independent.
- A restaurant without a booking: activity/schedule plus optional financials, plan and expense.
- A round trip: one item/booking and optional cost/payment records; two journey schedules and activities.
  Budget and expense count once; no allocation to the legs.
- A hotel: one item/stay schedule; two optional endpoint activities and shared finances.
- A pass: one item/booking/financial record/validity span; each covered visit has its own schedule
  and title. Visit dates/locations are not synchronized with validity. No per-visit cost allocation.
- A standalone food budget and its expense: one item, Cost for the expected amount and Paid/Refunded
  for spending; no schedule or booking required.

## Commands, linking and concurrency

Keep feature endpoints as thin adapters around explicit operations: edit shared schedule/finances,
attach/create a part, link two items, detach a part, delete a part, and mark a booking cancelled.
Separate pure validation/proposal building from EF persistence. Share typed projections; do not
make business validation depend on converting through endpoint request objects.

Each item mutation checks a provider-independent revision token and advances it atomically.
Schedule/financial/part mutations all participate; forms retain the version they loaded. Stale
requests return a structured conflict and keep the draft for refresh/review, not last-writer-wins.
Linking checks both item versions; trip expansion also checks trip dates/version. Conditional root
updates must fail for conflicting writers, with transaction rollback of all child changes.

Database uniqueness, not a preliminary AnyAsync check, prevents concurrent duplicate parts.
Use explicit ensure/create-from-existing-item operations: a repeated Add expense for the same
item returns its existing expense link. It never edits payment values as an accidental retry.
Translate expected unique/concurrency/serialization failures to a refreshable conflict; avoid
catching every database exception as a duplicate. Bound retries must not apply changed choices.

### Link existing entries

1. Load the two authorized, same-trip items and their relevant graph in a bounded query set.
2. Produce a side-effect-free proposal listing genuinely shared conflicts, actual source values,
   supported target role and both versions. Names/categories/notes/payment dates remain local.
3. Collect per-field radio choices and show financial consequences. Validate the combined schedule,
   role occupancy, money and singleton-part rules before writing.
4. Recheck versions and apply the selected merge atomically. Reparent part/schedule references,
   preserve entry IDs and local details, choose one financial authority, and remove an empty root.

When both items already have an expense or planned cost, show radio choices for the entry to link.
Show each entry's name and amount, and the payment date for expenses when available. For the other
entry, offer **Keep separately** or **Delete duplicate**, with Keep separately as the default.
Keeping an entry separately leaves it in the applicable trip totals. Deletion requires an explicit
choice and is applied atomically with the link. Already-linked requests return the existing
relationship. Cross-trip or unauthorized IDs must not reveal the other record.

Keep the existing booking picker rule. When linking to a booking, hide entries that already
belong to a different booking. Across all entry points, the proposed group may contain at most
one booking. Check this before saving, including when a picker selection is stale. An expense
linked only to a planned cost is still eligible to link to a booking.

### Unlink and delete

Detach requests identify the part or set of parts to separate, not just a scalar FK to clear.
Clone only the shared facts those parts actually use into a new item/schedule/financial record;
keep original entry IDs and local data. Remaining parts keep their current values. An event activity
gets its current event facts. Detaching a pass visit or hotel check-in preserves its title, dates
and location. A check-in keeps its own task duration. The overall cost and payment stay with
the reservation.

Deleting a part keeps all siblings and values still in use. Deleting an expense removes it from
spending totals but does not reset Paid/Refunded retained by a booking. Deleting a booking does not
erase financial history or a remaining activity's schedule. Garbage collection removes unreferenced
schedules/financials and the last empty root transactionally, not through a background sweeping job.

When removal of a journey or a booking category change makes an activity's role unavailable, offer
Keep or Delete for the affected activity. Keep detaches it with its current dates and location.
Apply the booking edit and selected actions in one transaction. Compatible links require no prompt.

## Marking a booking cancelled

Agreed dialog title: **Mark booking as cancelled?** Buttons: **Cancel** / **Mark as cancelled**.
Show each related activity and the planned cost by actual name, each with Keep/Delete radio choices
defaulted to Keep. Only show existing entries. Do not delete the expense or alter paid/refunded values.

Submit status and selected deletion IDs as one command with the graph revision. Revalidate that all
selected entries are still related. Apply status/deletions atomically; rollback all on error. Kept
entries expose the cancelled-booking status. Reuse ConfirmDialog focus/Escape/return-focus behavior;
Cancel or Escape applies nothing. Cancelled status selected in an edit form must enter this same
workflow; it must not bypass related-entry choices or create nested discard prompts.

## Outside-trip dates

Replace the activity trip-range rejection with valid-date/range checks. Include the outside dates
in normal chronological activity groups, not only groups generated from trip boundaries.
Extend the existing BookingDateWarnings key-based dismissal to both entry kinds; derive a key from
the trip range and relevant schedule facts. Keep as is hides that version of the warning only.

The response includes the proposed min/max trip range. Update trip dates recomputes it from the
current item and trip, changes only necessary boundaries, and preserves all activity dates/times.
It must bypass/remove the old automatic shift/unschedule path. Keep To-do deadline handling separate
and preserve its established behavior unless separately agreed. Edit item dates opens the existing
form and focuses the offending date control, including the correct return/end field.

Trip-date writes need an explicit concurrency check too: add a provider-independent trip revision
to its edit contract or use a tested equivalent conditional date update. A stale full Trip edit
must not silently undo a boundary expansion made from another view. The expansion command updates
dates only, rather than overwriting unrelated trip details from an old response.

Manual trip-date editing must not silently shift or unschedule fixed entries under this new model.
The earlier optional Move itinerary with trip feature remains separate, not inferred from a changed
trip start. Compare scheduled dates against whichever trip boundaries are set. A pass validity
period may extend beyond the trip. Evaluate its scheduled visits for outside-trip warnings.

## API, frontend and future sharing

Keep feature list/detail routes and navigation IDs. Add item identity/revision and explicit related
summaries to typed responses; project flat display fields from canonical records so components need
not join database-shaped objects. Do not serialize EF navigation graphs.

The revised expense write contract uses Paid/Refunded, not editable net Amount. Update its form and
all callers together, retaining independent expense date/category/title. A stale browser client must
receive a clear contract/version error rather than silently reinterpret net as Paid.

Reuse existing API mutation notifications and stale-load guards initially. A successful mutation
invalidates affected views once; avoid per-card review loads or introducing a second global cache.
Check draft conflicts when another view updated the same item. Related links still scroll/highlight
and open the destination's saved expansion state. Budget/Expenses stay on the combined page.

Keep trip ownership checks now. Centralize part/fact access decisions in the application boundary,
so future membership can replace owner-only access without leaking entire item graphs. Do not add
unused role/share-checkbox tables now. Item identity and transaction concurrency are not themselves
permissions. An accessible activity may project shared schedule facts without private confirmation,
payment, hidden linked names/counts or private-only fields. Later sharing must also define financial
record visibility; one shared purchase is not a personal-payment splitting model.

## Alternatives considered

| Alternative | Reason not to choose it |
| --- | --- |
| One large table | Mixes role-specific fields, multiple journeys/visits and privacy boundaries. |
| Automatic copying among existing tables | Removes prompts but retains several authorities, conflict propagation and partial-write risks. |
| Booking owns every shared fact | Makes standalone activities/expenses and deleting bookings awkward. |
| Generic entities/attributes or arbitrary relationship graph | More indirection and invalid combinations than this app needs. |
| A payment transaction ledger now | Different product scope; aggregate Paid/Refunded remains the agreed first model. |

## Migration and safe rollout

Preserve data in the deployed database, including existing entry IDs, accounts, trips, checklists,
relationships and database-backed authentication keys. Generate new EF
migrations; do not rewrite old migrations. Production startup applies migrations, so a migration
that starts using new fields must be deployable with the matching API, not an assumed manual reset.

Use the public `main` schema as an upgrade baseline. At `fad13d9`, `main` has planned-cost and
expense links and predates Bookings. The public database is reported to contain only those
planned-cost/expense links among the entries in scope. Include a populated fixture at this schema
in upgrade tests, and run the full migration chain. Give standalone entries their own ItemCore.
Preserve planned-cost/expense pairs on a shared ItemCore, with their distinct planned Cost and
actual Paid. Preserve entry IDs, payment dates and trip totals. Check the migration baseline and
data shape before applying any changes to deployed data.

Do not choose a winner for conflicting old booking/activity/financial links in SQL. Resetting local
booking links is an acceptable migration option, but concrete records and any deployed-data impact
need a separate agreed migration policy. Candidates are preserving incompatible entries as independent
items or explicit user resolution; destructive full reset is not the default. Ordinary existing
plan/expense links require preservation unless separately authorized.

Expand/backfill/contract must have one cutover owner per fact. Do not ship a long-lived dual-write
system. Add structures and test commands first; cut over finances and schedules in tested vertical
slices, with old routes adapting to the new authority only when their consumers are compatible.
Freeze the exact API/schema deployment compatibility strategy before each cutover; old deployed
clients and writes during backfill must be accounted for. Unused transitional paths have an explicit
removal slice and must not remain as a second active implementation.

Only drop old scalar columns, old link FKs, legacy review flags/routes and persisted reviews after
all callers and migration outcomes are verified. Retain deletion/outside-date notices where still
useful. Inventory every reference before removal. Do not refactor a review lifecycle scheduled for removal.

Verify migration and constraints on disposable PostgreSQL, not only SQLite/EF InMemory. Check fresh
creation and populated upgrade. Before production cutover require backup/rollback instructions;
after shared writes, rollback is restore/forward-fix unless a tested reverse migration preserves data.

## Implementation groups to split into commit-sized chunks

The first storage chunk adds the four shared tables through `AddSharedItemStorage`. Foreign keys
connect the tables to the trip through `ItemCore`. Primary keys enforce one cost and one payment
total per core. Fixed schedule slots are unique, and multiple independent visits are supported.
The migration creates empty tables. Existing entries and their links continue to supply the app's
data until the relevant backfill and read/write changes are implemented together.

Verification covered the full 109-test backend suite and a disposable PostgreSQL 17 database.
The migration chain ran on an empty database and upgraded a populated `main` fixture. The linked
planned cost and expense retained their IDs, amounts, relationship and payment date. PostgreSQL
checks exercised foreign keys, duplicate slots and totals, refund limits, schedule constraints
and trip deletion. Independent source review found no actionable issues.

The first financial chunk introduces `PaymentAmounts` for the paid/refunded pair and its computed
net amount. Booking responses, expense eligibility and linked-record reviews use that calculation.
The review preview uses the same booking payment projection as the update. Existing records
supply the financial values through the same API contracts until the financial backfill and cutover.

### Planned-cost storage cutover

Move planned-cost amounts into `ItemCost` before moving expense amounts or booking payments.
The migration creates one trip-owned `ItemCore` and cost record per existing plan. Planned-cost
IDs and expense links stay in place. The existing API keeps its `amount` field, backed by the new
cost record. Expense amounts and payment fields continue to use their current storage in this chunk.

The planned-cost endpoints and linked-record reviews both use the cost record. Review previews
restore the cost after validation. Stale-review checks include the shared cost. Deleting a plan
removes its cost and core and leaves its expense in place. A later expense migration can reuse
the core through the preserved planned-cost link.

The planned-cost edit form continues to use its existing request contract. Item revision checks
for form saves are introduced with the versioned shared-item commands. Existing review checks
continue to validate the destination and use the stored cost in its version.

Apply the cutover with old API instances stopped because it removes the legacy amount column.
The reverse migration copies the amount back before removing the new planned-cost references.
Verify the forward and reverse paths on disposable PostgreSQL seeded at the `main` baseline.

All 110 backend tests passed, including planned-cost edits, linked review previews and deletion
with a retained expense. The disposable PostgreSQL 17 upgrade preserved linked and standalone
plans, including a legacy zero amount. It rejected a cross-trip reference and passed plan and trip
deletion checks. The rollback restored the edited amount and preserved the expense link and an
unrelated core. Independent review found no actionable issues.

### Expense storage cutover

Move each expense's recorded amount into `ItemPaymentTotals`. A linked expense reuses the planned
cost's core. Other expenses receive their own core, including expenses with a legacy booking link.
The old expense amount represents recorded net spending, so it is stored as Paid with zero Refunded
in this migration. Booking payment and refund history remains in its existing fields until the
booking cutover. Keep the expense IDs, payment dates, links and the API's `amount` field.

The database requires one expense and payment-total record per core and enforces same-trip
references. When an expense is added to an existing plan or either entry is deleted, check the
core revision in the same write and advance it if the core survives. A conflicting write rolls back and can be retried
after a refresh. Delete only the cost or payment totals belonging to the removed entry when a
sibling still needs the core. Legacy review previews restore the projected payment totals.

Stop old API writers before applying the migration. Its reverse path restores the expense amount
from net spending and removes only the expense payment records and expense-only cores. Verify
both directions on a populated PostgreSQL fixture before deployment.

The 113-test backend suite and a separate stale-deletion regression passed. PostgreSQL 17 passed
the populated `main` upgrade, including linked and standalone expenses and a development fixture
with booking refunds. Trip deletion removed the shared records. Rollback restored the net expense
amounts and kept the linked plan. A legacy cross-trip link failed the migration without partial
changes. Independent review found no actionable issues.

### Booking financial storage cutover

Move each booking's total cost, paid amount and refunded amount into the existing cost and
payment tables. Allocate a dedicated core per booking so legacy links can preserve differing
booking and expense values until the linking workflow reconciles them. Keep booking IDs and
relationships. Store zero refunds as zero and expose them as null in the existing booking API.
Keep unknown costs distinct from explicitly free bookings.

Require same-trip references and one booking per core. Use the core revision to coordinate
booking writes that validate or change financial values across rows. Delete the dedicated core
with its booking and retain existing linked-entry deletion behavior. Legacy reviews compare
original values from both financial rows and restore all target values after a read-only preview.

Stop old API writers before applying the migration. Rollback restores the old booking columns
from the shared rows and removes the dedicated booking cores. Verify both directions with
populated PostgreSQL data and exercise existing booking, refund and linked-review behavior.

The 114-test backend suite and a separate stale-payment regression passed. PostgreSQL 17
verified the populated upgrade from `main`, trip deletion, and rollback of the booking migration.
The fixture preserved a booking refund, distinct free and unknown costs, and the linked plan and
expense with their original amounts. Independent review found no actionable issues.

### Standalone expense refunds

The Expenses form sends Paid and Refunded for entries without a booking, including expenses
linked to a planned cost. Net spending is computed by the API. Paid must be positive, and an
equal refund keeps the expense visible at zero net spending. The existing expense form and
row show the payment breakdown for refunded entries. This step requires no database migration.

Keep the amount-only adapter for existing plan conversion and booking entry points. Reject an
amount-only update to a refunded expense to protect both values. The legacy booking link
workflow accepts unrefunded expenses only until it can reconcile paid and refunded values
explicitly. Expense edits and booking links check the expense core revision in the same write.
The expense form retains the revision it loaded. The legacy plan review cannot directly
change a refunded expense's payment. Its payment details can be edited in Expenses.
Deploy the API before the expense form that sends the new fields.

Backend verification covered existing workflows and a focused SQLite regression for full
refunds, stale edits and booking-link eligibility. The frontend build, 110 frontend tests
and 13 Chromium scenarios passed. The smoke test verified the zero-net expense and updated
spending total immediately after save. The browser runner was stopped after all scenarios
passed because it stalled during shutdown. Independent review found no remaining actionable issues.

### Create an expense with shared booking payments

When an expense is created from a booking and its net amount matches the booking payment,
attach it to the booking core and payment totals. This includes a match after explicitly
accepting an update to the booking payment. Keep the existing difference reviews for
mismatched amounts and existing-expense links until the link reconciliation workflow is ready.
The core revision and existing uniqueness constraints protect creation and lifecycle changes.

An attached expense uses the same gross payment, refund and net spending as the booking.
Expense edits send the loaded revision and validate against the booking's confirmed cost and
refund eligibility. Neither entry needs a review to pick up changes to its shared payment.
A full refund keeps the expense at zero net. Clearing a mistaken payment stays guarded
until the correction confirmation can remove the expense atomically.

Unlinking copies the payment totals for the detached expense. Deleting either part keeps
the remaining part's payment history. No data migration is required. Verify creation, edits
from both entry points, full refunds, stale writes and unlink/delete retention.

The 119 backend tests, frontend tests, and production build passed. All 11 booking and
expense Chromium scenarios passed against the Release build. They verified edits from Expenses
and immediate updates on the booking card. Independent review found no remaining actionable issues.

### Confirm payment changes when adding an expense from a booking

Always use the booking's payment totals for a newly created expense. Keep the prefilled
net amount and the ordinary Add expense action when it matches. When it differs, show the
change to Paid and any required increase to Total cost before submission. The submit button
explicitly confirms the payment update and expense creation together.

Require the existing payment snapshot for a different amount and validate it inside the
creation transaction. A missing or stale confirmation cannot change the booking or create
an expense. Remove the separate-payment creation path. Existing-expense links and persisted
reviews remain supported until link reconciliation. No data migration is required.
For partially refunded bookings, the form labels its input Net spending and previews the
resulting gross Paid value. Explicit Paid and Refunded inputs are part of the later
financial contract.

All 119 backend tests, 110 frontend tests, the production build and two focused Chromium
scenarios passed. Checks covered cancellation, required and stale confirmations, preserving
refunds, and sharing later edits. The browser runner was stopped after the scenarios passed
because it stalled during shutdown. Independent review found no actionable issues.

These are proposed groups, not implementation approval or promises that each fits one commit.

| Group | Deliverable | Checks and gate |
| --- | --- | --- |
| S01 | Scope the first implementation chunk and resolve the decisions it needs. | Check the architecture and inventory relevant data shapes without printing sensitive values. Resolve later details in the chunks that depend on them. |
| S02 | Add core/schedule/financial structure, constraints, typed policies and pure proposal tests. | Disposable PostgreSQL constraints; existing app continues working; no unused permanent parallel API. |
| S03 | Cut over shared finances and expense input semantics across affected features. | Net/refund/zero/stale/concurrent creation tests; all UI entry paths use one owner. Split foundations from coordinated cutover. |
| S04 | Cut over shared schedules and role projections; simplified categories and activity roles. | Event, round trip, hotel, Rental, pass, partial dates and duration checks. Preserve names/notes. |
| S05 | Link previews, atomic merge/detach/delete and cancellation dialog. | Actual-value radios, occupied slots, cross-trip/stale writes, selected deletion rollback, retained history. |
| S06 | Outside-trip warnings, boundary expansion, date-field focus and dated visibility. | Both kinds/collapsed state, Keep persistence, no schedule shifting, separate To-do effects. |
| S07 | Related-entry creation/navigation from activity and both financial sections. | One expense across paths, independent inclusion, correct links/highlights; no Budget/Expenses page split. |
| S08 | Complete backfill/transition removal, refresh cleanup and full feature verification. | Fresh/populated PostgreSQL, API/browser checks, no old copied writes/reviews, manual acceptance. |

Some foundations/link commands must move earlier to support a preceding group. Final slices must
name affected files, compatibility boundary and checks before code. No chunk may knowingly leave
normal workflows broken until the next commit. No UI card redesign or unrelated audit cleanup is
included merely because this branch touches those components.

## Details to resolve in the relevant implementation chunks

1. **Duration details:** preserve undated duration and partial end information when applying the
   agreed shared-end rule.
2. **Detach scope:** selecting which related parts stay together when detaching a group of entries.
   One-expense uniqueness applies within one item.
3. **Dates:** verify the agreed schedule behavior with a multi-day tour example. Define how the
   boundary-update action handles a legacy trip with only one date. The existing trip form requires
   both dates or neither.
4. **Migration/cutover:** confirm the deployed migration baseline and coordinate clients and writes
   during the upgrade. Define the separate treatment of incompatible local booking links.
5. **Structure details:** define which category changes keep compatible roles and which trigger the
   agreed Keep/Delete choice.

## Verification and acceptance examples

Use the guide's test/build commands. Match checks to each slice rather than repeatedly running
every suite for a documentation change.

- API/relational tests: one authority for edited values, one expense under concurrent requests,
  same-trip constraints, stale versions, atomic link/deletion failures and payment invariants.
- PostgreSQL: unique/foreign/check constraints, concurrent creation/merge, and populated migration.
  Keep SQLite tests fast, but do not use InMemory success to establish relational safety.
- UI tests: independent names, actual-value selection, Cancel/Escape applying nothing, default Keep
  cancellation choices, net displayed but not editable, input drafts retained on conflicts.
- Browser checks: standalone museum to Budget/Expenses without a booking; concert four-part item;
  return journey; hotel endpoints; pass visits; unlink/delete/cancel retention; related navigation;
  outside dates visible and trip expansion leaving all activity dates unchanged.
- Manual mobile/keyboard review: no hidden actions, date focus, labels, dialogs, long titles and
  errors; no automatic price duplication or added nested financial cards.

Record performed checks, independent review outcomes and limits per completed chunk. No runtime,
security, migration or user-acceptance result is claimed by this design document.
