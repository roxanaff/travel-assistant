# Bookings

## Purpose

Bookings give a traveller one place to record actual reservations for a trip, including accommodation, transport,
activities, events, and restaurants. The first version is a manual booking register. Ideas that have not reached the
reservation stage belong in the To-do checklist or itinerary instead.

## Workspace

- Add a **Bookings** section to the trip workspace.
- Place it between Itinerary and Budget & expenses:
  `Details · Itinerary · Bookings · Budget & expenses · To-do · Packing`.
- Route: `/trips/:id/bookings`.

## Booking data

The booking name and start date are required. A booking has:

- A required name.
- An optional type. The form starts at **Not specified**, following the existing category-field pattern.
- An optional booking status. The form starts at **Not specified**.
- An optional provider.
- An optional confirmation or reference number.
- A required start date, with an optional start time.
- An optional end date and time.
- An optional location.
- An optional link.
- Optional notes.
- An optional total cost in the trip currency.
- A free state selected explicitly in the form.
- An optional amount paid. It must not exceed the total cost.
- An optional amount refunded for a cancelled booking that had been partially or fully paid.
- Optional links to multiple activities and one planned cost. Any related expense is reached through that planned cost.

### Provider and link guidance

Keep the concise field labels **Provider** and **Link**. Both fields are optional and include helpful placeholder text:

- Provider: `Hotel, airline, restaurant, or booking platform`.
- Link: `Booking page, ticket, or confirmation link`.

The link may point to any useful booking, ticket, or confirmation page. A booking does not need a link. File and PDF
uploads are deferred; when introduced, they will be separate from the link rather than overloading the link field.

## Booking types

The initial types are:

- Accommodation
- Flight
- Train / bus / ferry
- Local transport
- Car hire
- Museum / attraction
- Tour / activity
- Concert / event
- Restaurant
- Other

Flight and Train / bus / ferry support an optional return journey. Multi-city and journeys with more than two legs are
deferred.

## Booking and financial status

Because Bookings records actual reservation activity rather than ideas, the booking statuses are:

- Requested
- Confirmed
- Cancelled

Booking status is optional and defaults to **Not specified**. Booking status is independent of payment: for example, a
requested booking may already have been partially or fully paid.

Payment status is not an editable field. **Not specified** and **Not required** are not payment-status options. Instead,
the interface derives one financial state from the cost, payment, cancellation, and refund values:

- Total cost blank: no financial state is shown.
- Free selected: **Free**.
- Positive total cost with amount paid blank or zero: **Unpaid**.
- Amount paid greater than zero and lower than total cost: **Partially paid**.
- Amount paid equal to total cost: **Paid**.
- A cancelled paid booking uses the derived refund states described below instead of a paid-state label.

The form has a **Free** checkbox. It is unchecked by default:

- When Free is unchecked, Total cost starts blank. Blank means that cost information has not been entered.
- Selecting Free stores a zero total cost and hides Total cost, Amount paid, and refund controls.
- If payment or refund values already exist, selecting Free asks for confirmation before clearing them.
- Clearing Free shows an empty Total cost field again.
- Amount paid is shown only for a positive total cost and starts at zero.
- Clearing Amount paid treats it as zero and derives Unpaid.
- Amount paid cannot be negative or exceed total cost.

Currency is fixed to the trip currency, matching the existing budget model. Forms show the currency in labels such as
`Total cost (EUR)` and do not offer a separate currency selector.

### Cancellation and refunds

Amount paid remains visible and editable after cancellation so the booking preserves what was originally paid.

When a partially paid or paid booking is changed to Cancelled:

- Show a **Refunded** checkbox.
- Selecting Refunded reveals an editable **Amount refunded** field, initially equal to the amount paid.
- Amount refunded must be greater than zero and cannot exceed amount paid.
- If amount paid is edited below amount refunded, prevent saving and ask the user to adjust the refund first.
- Derive the displayed refund state rather than asking the user to select another status:
  - Refunded unchecked: **Not refunded**.
  - Amount refunded is lower than amount paid: **Partially refunded**.
  - Amount refunded equals amount paid: **Fully refunded**.
- A partially refunded booking shows its net cost, calculated as amount paid minus amount refunded.
- A fully refunded booking shows a concise Fully refunded or zero-net-cost summary.

Not refunded, Partially refunded, and Fully refunded are derived outcomes, not editable payment-status options. The
refund controls use progressive disclosure: they appear only for a cancelled booking with an amount paid, and Amount
refunded remains hidden until Refunded is selected.

## Dates and times

- Every booking has a required first/start date. Times, arrival/end dates, and arrival/end times are optional except
  that selecting a return journey requires its return departure date.
- An end time without an end date applies to the start date.
- End time requires a start time so the order can be validated.
- End date without an end time is allowed.
- The effective end must not precede the start.
- A booking may fall outside the trip dates, but the form shows a warning before it is saved.
- All types allow an optional end; no booking type requires one.

The interface uses type-specific labels while retaining a shared underlying date model:

| Booking type                                      | Start fields                          | Optional end fields                  |
| ------------------------------------------------- | ------------------------------------- | ------------------------------------ |
| Accommodation                                     | Check-in date and time                | Check-out date and time              |
| Flight                                             | Departure date, time, and location    | Arrival date, time, and location     |
| Train / bus / ferry                                | Departure date, time, and location    | Arrival date, time, and location     |
| Local transport                                    | Valid from date and time              | Valid until date and time            |
| Car hire                                           | Pick-up date, time, and location      | Drop-off date, time, and location    |
| Museum / attraction, Tour / activity, Concert / event, Restaurant, Other | Start date and time | End date and time |

Accommodation, transport, Local transport, and Car hire show their optional end fields immediately. For museums,
tours, activities, concerts, events, restaurants, and Other, keep the optional end fields behind an **Add end time**
control initially to reduce form crowding.

### Return journeys

Flight and Train / bus / ferry offer **Add return journey**:

- The first leg is labelled Outbound and contains optional arrival details in addition to its required departure date.
- Adding a return journey reveals a Return leg with required departure date and optional departure time/location and
  arrival date/time/location.
- Provider, confirmation number, cost, payment, and refund details belong to the overall booking rather than either
  leg.
- Each outbound or return leg can create or link to its own activity.
- The return journey's effective arrival cannot precede its departure, and the return departure cannot precede the
  outbound departure.

Local transport uses Valid from / Valid until because it may represent a single-use ticket, day or multi-day pass, or
subscription rather than a particular journey. Car hire has separate Pick-up and Drop-off locations. Accommodation
continues to use one location/address. Specialist fields such as guest count, party size, carrier, seat, or vehicle
details are deferred.

## Related itinerary and financial records

A booking can link to multiple activities and one planned cost. Each activity can link to at most one booking. The
planned cost can link to one expense using the existing budget relationship, so the financial records form one clear
chain: booking to planned cost to expense. A booking does not maintain a second direct expense link. Related records
remain independent after creation and are never silently overwritten when another record changes.

### Create financial records from a booking

A booking offers actions analogous to the existing planned-cost-to-expense action. Financial actions are available only
when the booking has a positive Total cost. A booking with blank Total cost or marked Free has no Add or Link budget
actions; restaurant spending or another purchase can still be recorded independently in Budget & expenses.

- **Add to planned costs** is available when no planned cost is linked. The new planned cost uses the booking's Total
  cost.
- **Link existing planned cost** connects an existing unlinked planned cost.
- **Add to expenses** uses the same chain. If no planned cost exists, the review form clearly shows that it will create
  both a planned cost and its expense. The planned cost uses Total cost and the expense uses the positive net paid
  amount: Amount paid minus Amount refunded.
- Either action opens a short prefilled form inside the expanded booking card, directly beneath its related-record
  actions. It is not a modal, side panel, or separate Budget & expenses page.
- The form prefills the name from the booking and suggests a category from the booking type. The user can review and
  change every prefilled value before creating the record.
- The expense date defaults to today because the booking's start date is not normally the payment date.
- After creation, the booking shows its linked planned cost and, when present, the expense belonging to that planned
  cost. Their names navigate to Budget & expenses and briefly emphasise the destination records.
- Only one related-record form is open at a time. Starting another action or leaving the page follows the established
  unsaved-changes confirmation behaviour.

Booking types map to suggested financial categories as follows:

| Booking type                 | Suggested planned-cost and expense category |
| ---------------------------- | ------------------------------------------- |
| Not specified                | Not specified                               |
| Accommodation                | Accommodation                               |
| Flight                       | Travel to/from                              |
| Train / bus / ferry          | Travel to/from                              |
| Local transport              | Local transport                             |
| Car hire                     | Local transport                             |
| Museum / attraction          | Activities & museums                        |
| Tour / activity              | Activities & museums                        |
| Concert / event              | Activities & museums                        |
| Restaurant                   | Food                                        |
| Other                        | Other                                       |

Every booking type therefore has a usable suggested category. The mapping is a convenience rather than an enforced
classification; transport and events can be context-dependent, so the user can change the suggestion before saving.

The booking, planned cost, and expense form one connected chain. A traveller cannot create two expenses for the same
booking by using both creation paths:

- If a booking has a linked planned cost, adding an expense from either the booking or planned cost creates the same one
  expense belonging to that planned cost.
- Once that expense exists, both places show it as already added and do not offer another Add expense action.
- These uniqueness rules are enforced by the API as well as the interface.

Existing financial records can be linked using these rules:

- A booking links to at most one planned cost in the first version. Its expense relationship is derived from the planned
  cost's existing one-to-one expense relationship.
- Multiple payment expenses are deferred until the app supports transaction-level payments and refunds.
- Linking a planned cost that already has an expense makes that expense visible from the booking automatically.
- A standalone expense without a planned cost cannot be linked directly to a booking in the first version.
- A planned cost already linked to another booking cannot be selected.
- Unlinking the planned cost keeps both it and its expense unchanged.
- The API enforces the one-to-one financial relationships and connected chain.

### Itinerary links

Use **Itinerary** for the whole workspace page or section and **activity** for an individual record. Internal code and
database names can remain unchanged.

Bookings and activities support creation and linking in both directions:

- One booking can link to multiple activities.
- One activity can link to at most one booking.
- The same booking and activity cannot be linked more than once.
- The API enforces both relationship constraints.
- Similar names, dates, or overlapping bookings do not produce duplicate warnings. Overlap detection belongs to a
  future itinerary improvement, and overlapping bookings are valid.

An activity includes a **Booking required** choice. The displayed booking state is derived rather than selected
separately:

- Booking required with no link: **Booking required**.
- Linked booking with no booking status: **Booking linked**.
- Linked Requested booking: **Booking requested**.
- Linked Confirmed booking: **Booking confirmed**.
- Linked Cancelled booking: **Booking cancelled**.

Linking a booking replaces Booking required with the appropriate linked-booking state. Unlinking returns to Booking
required when that choice remains selected.

Related entries use a second disclosure inside the already expandable itinerary or booking card so a long relationship
list does not crowd the main card details:

- In an itinerary card, a collapsed **Show related booking** control expands the Booking section. When no booking is
  linked, the control reads **Show booking options** instead.
- In a booking card, a collapsed **Show related activities** control expands the Itinerary section and includes the
  number of linked activities when useful, for example `Show related activities (2)`. When there are no links, it reads
  **Show itinerary options** instead.
- The controls change to the corresponding **Hide** labels while their section is open.
- The nested disclosure state is independent from the whole-card expanded state; collapsing the card hides the related
  section without removing any links.

Inside an unlinked itinerary card's expanded Booking section, show **Create booking** and **Link booking**. Once linked,
show the booking name as a navigation control, its derived booking state, and a separate **Unlink** action.

Inside a booking card's expanded Itinerary section, list every linked activity. Each row shows the activity name as a
navigation control, useful schedule information, and its own **Unlink** action. **Add to itinerary** and **Link existing
activity** are section-level actions because they do not belong to an existing linked row.

Selecting a linked record's name navigates to the other workspace page, expands the destination card, and briefly
emphasises it so the destination remains obvious even when it was already visible and no scrolling occurred. Scroll
only when needed. Use a short outline/background emphasis rather than rapid flashing, move keyboard focus to the
destination card or heading, and respect reduced-motion preferences.

Creating from either direction opens a prefilled form inside the source card. The mappings are:

- Activity to booking: name; suggested booking type from category; date/time; calculated end from duration; location;
  link; notes; and Total cost from itinerary cost. The user chooses booking status.
- Booking to activity: name; suggested activity category from type; date/time; duration calculated from the booking's
  start and end; location; link; and notes. Priority uses the normal middle default. For a simple booking expected to
  have one activity, prefill itinerary cost from Total cost. For return journeys or a booking that already has another
  linked activity, show Total cost as reference but leave activity cost blank so the same booking cost is not counted
  more than once.

The user reviews and can change all prefilled values before saving. The new record is linked automatically after it is
created.

Outbound and Return each provide their own **Add to itinerary** and **Link existing activity** actions and each leg
links to at most one activity. Store whether the relationship represents Outbound, Return, or a general activity so
later date/time review applies only to the relevant activity.

If the booking date falls outside the trip dates, or the trip does not yet have complete dates, the prefilled activity
remains Unscheduled and the form explains why the date was not copied. The booking date is preserved unchanged.

After linking, the two records remain independent. Changes never silently rewrite the linked record. When a shared
field such as name, date/time, location, link, or cost changes, show a dismissible contextual note beside the changed
record with an explicit action to update the linked record. Notes remain independent and do not trigger a review. If a
booking links to several activities, review affected activities separately because they may intentionally use different
parts of the booking's schedule.

### Review changes from a booking

If the booking's total cost, amount paid, or refund changes, linked financial records are not changed automatically:

- Planned cost comparison uses the booking's total cost.
- Expense comparison uses the booking's net cost.
- Saving a difference shows a friendly review message with the old and new amounts and clear choices to keep or update
  each affected record.
- Adjusting changes only the linked record's amount in the first version, not its name, category, or date.
- Keeping an existing amount is valid because it may include fees or another intentional adjustment.
- A kept difference remains visible beside the affected booking with a **Review** action. If several bookings have
  differences, the page header may also show a compact count that leads to them.

Messages describe what changed in everyday language. For example, after a partial refund:

> You received €20 back for this booking. The related expense still shows €100.  
> **Update expense to €80** · **Keep €100**

The expense also shows a dismissible notice that its related booking changed, with the same update choice. The planned
cost does not need an amount update merely because a payment or refund changed; it represents what the traveller had
planned to spend.

When a fully refunded booking has an expense, its net cost is zero and the current budget cannot store a zero expense.
Offer **Keep expense and unlink** or **Delete expense**. The booking retains its Amount paid, Amount refunded, and Fully
refunded history either way.

Cancelling a booking also shows a review message for its planned cost instead of changing or removing it automatically:

> This booking was cancelled. Do you want to keep its planned cost in your budget?

Offer **Keep linked**, **Keep but unlink**, and **Delete planned cost**. A partial or full refund does not decide this
choice automatically because the original plan may still be useful for comparison.

If Total cost is cleared or the booking is changed to Free, it cannot keep a budget link. Use concise language such as:

> You removed the cost from this booking. What should happen to its budget entries?

Offer **Go back**, **Keep them but remove the link**, and **Delete them too**. Tailor the wording and actions to the
records that actually exist. Payment and refund history remains on the booking unless the traveller explicitly clears
it while changing the booking.

### Planned-cost changes after an expense is created

A planned cost and an expense are conceptually different: changing a plan does not mean the actual payment changed.
When the amount of a planned cost with a linked expense changes:

- Do not change the expense automatically.
- Show a dismissible note beside the planned cost after it is saved.
- The note explains that the linked expense still has its existing amount and offers **Adjust expense**.
- Closing the note keeps the expense unchanged and removes the note.
- A later planned-cost amount change shows the note again.

## Display and interaction

Each booking is displayed as an expandable card, following the established itinerary-card pattern:

- The collapsed summary keeps the page scannable and shows the booking name plus its most useful date, type, booking
  status, payment/refund state, and cost information.
- Expanding a card reveals secondary details such as provider, confirmation number, full dates and times, location,
  link, notes, payment breakdown, related records, and related-record actions.
- Add to planned costs and Add to expenses automatically expand the relevant card and show their prefilled form inside
  it.
- Edit remains a distinct action and uses the app's established inline-form and unsaved-changes behaviour.
- The page supports expanding and collapsing individual cards and provides **Expand all / Collapse all**, matching the
  Itinerary page.
- Expand all opens the booking cards themselves but does not open nested related-activity or financial disclosures and
  never opens forms.

### Status pills

Booking cards use the same pill treatment as trip statuses. A card shows at most two status pills:

- One optional booking-status pill: **Requested**, **Confirmed**, or **Cancelled**. No booking-status pill is shown when
  the status is Not specified.
- One optional derived financial-status pill: **Free**, **Unpaid**, **Partially paid**, **Paid**, **Not refunded**,
  **Partially refunded**, or **Fully refunded**. No financial-status pill is shown when Total cost is blank.

For a cancelled booking with money paid, the refund-state pill replaces the ordinary payment-state pill. Booking type
is descriptive metadata, not a third status pill. Warnings and linked-record indicators also remain separate from the
status pills.

### Cancelled bookings

- Active bookings remain in the main list and are ordered by start date from earliest to latest.
- Within the same start date, bookings with a start time are ordered chronologically and bookings without a time follow
  them. Remaining ties use creation order for a stable result.
- A return booking is ordered by its outbound departure date and time.
- Cancelled bookings move to a separate **Cancelled** section below active bookings and are ordered chronologically
  within it using the same rules.
- Cancelled cards use a subdued visual treatment while keeping all text and status/refund pills readable.
- They remain expandable and editable.
- Omit the section when there are no cancelled bookings.

The first version does not add filters or further grouping. Chronological ordering and the separate Cancelled section
provide sufficient structure for the expected number of bookings without adding persistent controls to the page.
Search, type/status filters, or additional grouping can be added later if real trips become difficult to scan.

### Empty state

When a trip has no bookings, show a concise explanation and one primary action. Bookings do not use a default-list or
Start empty choice:

> **No bookings yet**  
> Keep reservation details, confirmations, dates, and costs together.

Show **Add booking** beneath the message.

### Deletion and removed-link notices

- Deleting a record never cascade-deletes a linked booking, activity, planned cost, or expense.
- Delete the selected record and remove all of its relationships. Preserve every surviving record and its data.
- Deleting an unlinked booking is optimistic and offers Undo for five seconds, following existing list behaviour.
- Deleting a linked record requires an app-styled confirmation that names or counts affected record types and explains
  that those records will be kept but unlinked.
- Each surviving record receives a dismissible, persistent notice that its linked record was deleted. Persist the
  notice until the user dismisses it so it remains available after navigating to another page or returning later.
- A removed-link notice does not retain the deleted record's full data.

### Validation and page states

- Follow existing application conventions for trimmed text, required names, maximum lengths, URL validation, money
  normalization, decimal precision, and inline field errors.
- Apply matching validation in the frontend and API.
- Handle loading, not-found, ownership, and API-error states consistently with the other trip workspace pages.
- Reuse established keyboard behavior and unsaved-form confirmation.


## Access and ownership

- Every booking belongs to one trip.
- Every trip-scoped booking endpoint enforces the existing account ownership rules.
- Another account's trip or booking is treated as not found.

## Deferred scope

The first version does not include:

- Ideas or wishlist entries.
- File or PDF uploads.
- Extracting booking data automatically from a link or uploaded document.
- Multiple payments or payment schedules.
- External booking-provider integrations or automatic status updates.
- Notifications or reminders.
- Shared booking management.

## Status

Requirements discussion is in progress. No implementation has started.
