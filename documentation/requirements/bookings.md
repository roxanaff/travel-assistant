# Bookings

## Purpose

Bookings give a traveller one place to record actual reservations for a trip, including accommodation, transport,
activities, events, and restaurants. The first version is a manual booking register. Ideas that have not reached the
reservation stage belong in the To-do checklist or itinerary instead.

## Current implementation revision

Implementation has resumed with approval of the revised financial relationships and related-record review behavior.
The decisions below supersede the earlier booking-to-planned-cost chain. The Status section distinguishes the current
revision from historical chunks that implemented the previous design.

### Agreed changes

- Remove the booking-to-planned-cost relationship and its create/link actions.
- Keep a direct booking-to-expense relationship and the existing planned-cost-to-expense relationship. Creating an
  expense from a booking must not create a planned cost automatically.
- After a planned cost creates an expense, replace the generic **Added** text with a navigation control naming the
  actual expense, alongside **Undo**. Selecting it focuses and briefly highlights the matching expense.
- A booking with a positive cost that is not fully paid offers **Mark as paid** outside the edit form. The action sets
  Amount paid to Total cost. It does not by itself create an expense.
- Show outside-trip-date warnings on saved booking cards as well as in their forms. Card warnings are dismissible
  and identify the affected journey/date, following the existing orange warning treatment.
- Vertically align related-record navigation controls and adjacent actions with their row labels. Reduce excess
  padding and row height consistently across the app while retaining usable interaction targets and keyboard focus.
- Saved booking cards use a single left-aligned column for secondary details. The create/edit form layout stays as is.
- Keep the label **Confirmation number**. Remove trailing colons from booking and itinerary field labels consistently,
  including saved summary/detail labels; do not alter punctuation within user-entered text or warning sentences.
- Within that detail column, labels and values have consistent alignment: values and related-record controls begin at
  the same horizontal position regardless of label length. Wrapped values continue under the value, including long
  notes and links. Apply the same treatment to expanded activity details; support narrow-screen wrapping without
  horizontal overflow.
- Expanded itinerary activity details use the same compact, content-sized label/value grid as saved booking details,
  including related booking controls and wrapping notes. Values align independently of label length.
- Relevant related-record change notices work in both directions, including expense changes prompting a notice on the
  linked booking. Show a dismissible notice for each affected relationship, with **Keep as is** and an update action
  that states the proposed change. Applying the update takes effect immediately, without a separate preview or
  confirmation step. Records are never synchronized automatically.
- On saved booking and activity cards, show related-record change notices inside the card immediately below the
  summary, visible when collapsed as well as expanded. Identify the related record in the notice and allow the update
  directly there without switching workspace tabs. Render each notice once, rather than duplicating it in expanded
  relationship details; a separate collapsed **Update available** indicator is unnecessary.
- The warning revision includes existing booking/activity relationship notices as well as new financial notices.
  A collapsed activity must show its applicable relationship warnings below its summary, just as a collapsed booking
  does; expanding the card must not be necessary to discover a warning or act on it.
- Change notices identify only the exact fields that changed and their previous/current values, such as
  **Departure date: 3 Oct -> 4 Oct**. Do not append unchanged cost, location, or other unrelated details. Applying an
  update changes only the indicated fields; before/after values must be retained for this behavior.
- Keep the first previous value and latest current value across repeated edits until the review is resolved. Reverting
  a field removes its pending change. Reject decisions based on an outdated review revision and refresh the notice.
- Updates respect the destination's existing validation and independent edits. Explain conflicts instead of
  overwriting an independently edited field, creating a zero expense, exceeding a booking's total, or placing an
  activity outside trip dates. A safe update must not create a reciprocal warning for the accepted fields; changes
  affecting a different relationship still produce that relationship's own review.
- Booking/activity schedule updates use the existing creation mappings. Moving an activity's start into a booking
  preserves that booking's duration unless duration itself changed. A booking's explicit end changes can update the
  activity's duration when the booking has sufficient date/time information. If a source field has no unambiguous
  destination (such as a separate arrival location for an activity with one location), explain why manual review is
  required rather than silently choosing another field.
- Notices predating stored field history cannot reconstruct earlier values. Keep them dismissible with **Keep as is**,
  explicitly state that the prior values were not recorded, and require manual editing instead of inventing a diff.
- Expense and planned-cost change notices span the width of the affected item, with update/keep actions available
  there without changing tabs. Keep the existing planned-cost and expense item layouts; the proposed packing/to-do-style
  item layout change is dropped.
- One expense covers the entire booking, including both legs of a round trip. Outbound/Return grouping applies to
  activities, not separate expenses. Independently reserved journeys with separate confirmations can be separate
  bookings, each with its own expense; multiple payment transactions remain deferred.
- Remember individual card and Expand all/Collapse all choices for Bookings and Itinerary when switching workspace
  tabs. Store these browser view choices separately for each trip and page; do not reset them while records load.
- Keep the **Expense** label and its linked name/amount/Unlink controls on the same row on wider screens, matching
  activity relationship rows. Use rounded corners for destination expense highlighting and compact, aligned link
  controls. Allow relationship rows to stack and long names to wrap on narrow screens.
- Before an expense is linked, show only **Add to expenses** and **Link existing expense**, without an **Expense**
  label. Align these actions and the activity add/link actions with the corresponding linked-record value column.
- All saved booking details stack on the left in a shared label/value grid, including reservation details, related
  records, and notes. Size the label column from the longest visible label with a compact gap rather than a fixed
  wide label area. Wrapped text continues beneath its value. Create/edit forms keep their existing layout.
- Outbound and Return summaries share label, date/time, and location columns so both journey rows align even when
  their text lengths differ. On narrow screens, stack summary/detail columns without horizontal overflow.
- In planned-cost and expense lists, centre item amounts vertically with their edit/delete controls independently of
  the number of description or metadata lines. Preserve existing information and action behavior.

### Approved financial rules

- Expense creation/linking requires a positive net paid amount. Partially paid bookings are eligible. Prefill the
  expense amount with Amount paid minus Amount refunded; the user may review and change it before saving.
- A booking has at most one expense and an expense has at most one booking. An expense may also belong to a planned
  cost independently. Offer **Link existing expense** from the booking to avoid duplicating spending.
- Beside a linked expense's **Unlink** action on a booking, offer **Delete**. Use the app's confirmation dialog to name
  the expense and explain that deletion removes it from spending while keeping and unlinking its booking and any
  related planned cost. Cancel changes nothing. Unlink only removes the association and keeps the expense; do not
  show an additional "Expense kept in Expenses" message. Once unlinked, existing create/link actions remain available.
- A later expense-amount change can offer to update the booking's Amount paid to Expense amount plus Amount refunded.
  Refunds are stored as positive amounts, so this reconstructs the original payment rather than adding spending.
  Keep Total cost unchanged. If the proposed Amount paid exceeds Total cost, explain the conflict and require editing
  the booking; do not silently increase its price.
- Keep existing planned costs and expenses when migrating old chains. Copy an existing chain's booking link directly
  to its expense, then remove the booking/planned-cost relationship. A plan without an expense remains a plan without
  creating any expense.
- Place outside-trip warnings inside saved cards below their summaries. Place budget warnings beneath the affected
  item's existing text and amount/actions, spanning the item width.
- Dismissed warnings acknowledge the current change across visits; a subsequent relevant change may show a new notice.
  An accepted update must not cause a reciprocal notice for the same change.
- **Mark as paid** belongs beside Amount paid on active, positive-cost bookings that are not fully paid. It sets Amount
  paid to Total cost and offers an immediate Undo. Cancelled bookings use their editable payment/refund fields instead.

### Linked-activity deletion

- Confirm deletion of a booking-linked activity using the app's dialog, explaining that the booking survives. Commit
  linked deletion immediately, then remove the activity; use five-second Undo only for unlinked activities. If deletion
  finishes after navigation to Bookings, refresh its relationships and deleted-link notice without another tab switch.
  This removes the old delayed-deletion window in which Bookings could retain a stale activity link.

### Deferred budget/expense follow-up

- Finish the booking work before the broader budget/expense changes. Keep planned-cost **Ungrouped** viewing,
  expense-side related-record disclosures, and budget/expense layout/group controls in documentation for now.
- Linking expenses with different amounts is allowed because a difference may be intentional. The financial
  review flow flags a mismatch at link time, comparing expense amount with net paid rather than Total cost,
  with an explicit update or **Keep as is**. Do not silently change either amount or treat a linked expense as another
  payment added to the booking.

Implementation is authorized in commit-sized chunks. Remembered booking/activity card expansion is in the current
feedback work; shared group controls and other view settings remain separate backlog work. The Budget/Expenses tab
split and progress indicators remain future roadmap work.

## Workspace

- Add a **Bookings** section to the trip workspace.
- Place it between Itinerary and Budget & expenses:
  `Details · Itinerary · Bookings · Budget & expenses · To-do · Packing`.
- Route: `/trips/:id/bookings`.

## Booking data

The booking name and start date are required. A booking has:

- A required name.
- An optional category. The form starts at **Not specified**, following the existing category-field pattern.
- An optional booking status. The form starts at **Not specified**.
- An optional provider.
- An optional confirmation number.
- A required start date, with an optional start time.
- An optional end date and time.
- An optional location.
- An optional link.
- Optional notes.
- An optional total cost in the trip currency.
- A free state selected explicitly in the form.
- An optional amount paid. It must not exceed the total cost.
- An optional amount refunded for a cancelled booking that had been partially or fully paid.
- Optional links to multiple activities and one expense directly.

### Provider and link guidance

Keep the concise field labels **Provider** and **Link**. Both fields are optional and include helpful placeholder text:

- Provider: `Hotel, airline, or restaurant`.
- Link: `Booking page, ticket, or confirmation link`.

The link may point to any useful booking, ticket, or confirmation page. A booking does not need a link. File and PDF
uploads are deferred; when introduced, they will be separate from the link rather than overloading the link field.

## Booking categories

The initial categories are:

- Accommodation
- Flight
- Rail, bus & ferry
- Local transport
- Car hire
- Museum / attraction
- Tour / activity
- Concert / event
- Restaurant
- Other

Flight and Rail, bus & ferry support an optional return journey. Multi-city and journeys with more than two legs are
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

The form has two compact Cost choices: **Free** and **Has cost**, shown as pill buttons with black text. Neither is
selected by default, which represents cost information not being entered:

- Not entered stores a blank total cost and shows no financial state.
- Free stores a zero total cost and hides Total cost, Amount paid, and refund controls.
- Has cost reveals Total cost. Amount paid appears only after a positive Total cost has been entered.
- Amount paid is shown only for a positive total cost and starts at zero.
- Clearing Amount paid treats it as zero and derives Unpaid.
- Increasing Amount paid above Total cost also increases Total cost and shows a short informational message.
- Reducing Total cost below Amount paid is blocked until one of the values is corrected; Amount paid is never silently
  reduced because it records what was actually paid.

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
- An end or arrival time without a start or departure time is allowed and does not show a warning.
- End date without an end time is allowed.
- The effective end must not precede the start.
- A booking may fall outside the trip dates, but the form shows a warning as soon as any entered start, end, or return
  date falls outside the trip range. Each warning appears immediately beneath the affected date row and names that
  specific part of the journey, such as **outbound departure** or **return arrival**. It does not prevent saving.
- All categories allow an optional end; no booking category requires one.

The interface uses category-specific labels while retaining a shared underlying date model. Each start/end date and
time pair is displayed on one row beneath a shared field label:

| Booking category                                  | Start fields                          | Optional end fields                  |
| ------------------------------------------------- | ------------------------------------- | ------------------------------------ |
| Accommodation                                     | Check-in date and time                | Check-out date and time              |
| Flight                                             | Departure date, time, and location    | Arrival date, time, and location     |
| Rail, bus & ferry                                  | Departure date, time, and location    | Arrival date, time, and location     |
| Local transport                                    | Valid from date and time              | Valid until date and time            |
| Car hire                                           | Pick-up date, time, and location      | Drop-off date, time, and location    |
| Museum / attraction, Tour / activity, Concert / event, Restaurant, Other | Start date and time | End date and time |

All categories show their optional end date and time row immediately.

### Return journeys

Flight and Rail, bus & ferry offer **Add return journey**:

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

A booking can link to multiple activities and one expense directly. Each activity can link to at most one booking.
Planned costs remain separate from bookings; a planned cost can still link to an expense. One expense may therefore
link to a booking and a planned cost independently. Related records remain independent after creation and are never
silently overwritten when another record changes.

### Create financial records from a booking

- **Add to expenses** is available for a positive net paid amount when no expense is linked. It creates only an expense.
- **Link existing expense** selects an expense from this trip that is not already linked to a booking, including one
  created from a planned cost.
- Both actions use the established inline related-record form inside the expanded booking card. Expense creation uses
  the same fields as the normal expense form and prefills the booking's name, suggested category, net paid amount,
  and today's date. The user can change all prefilled fields.
- Blank-cost, Free, unpaid, and fully refunded bookings do not offer expense creation/linking. A related expense is
  still shown and can be unlinked if later payment changes make the booking ineligible.
- Show the linked expense's name as a navigation control that focuses and briefly highlights the matching expense.
  Unlinking preserves the expense and its independent planned-cost link.
- Only one related-record form is open at a time. Changing actions or leaving follows the existing unsaved-changes
  confirmation behavior.
- API ownership and one-to-one uniqueness rules apply to both creation and linking.

Booking categories map to suggested financial categories as follows:

| Booking category             | Suggested expense category                  |
| ---------------------------- | ------------------------------------------- |
| Not specified                | Not specified                               |
| Accommodation                | Accommodation                               |
| Flight                       | Travel to/from                              |
| Rail, bus & ferry            | Travel to/from                              |
| Local transport              | Local transport                             |
| Car hire                     | Local transport                             |
| Museum / attraction          | Activities & museums                        |
| Tour / activity              | Activities & museums                        |
| Concert / event              | Activities & museums                        |
| Restaurant                   | Food                                        |
| Other                        | Other                                       |

Every booking category therefore has a usable suggested financial category. The mapping is a convenience rather than an enforced
classification; transport and events can be context-dependent, so the user can change the suggestion before saving.

Multiple payment expenses remain deferred. The first version uses one aggregate Amount paid/refunded on each booking
and one linked expense, with explicit amount updates when those totals change.

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

Related entries appear directly inside the expanded card details:

- In an itinerary card, the Booking row shows the linked booking or the available booking actions.
- In an expanded booking card, linked activities are grouped as **Outbound activities**, **Return activities**, and
  **Other activities**, without an additional outer Activities label. Links are stacked directly beside their group
  name, and each includes an adjacent **Unlink** action. Non-journey bookings use **Activities** as their single group;
  **Other activities** is used only alongside the journey-specific groups. Dates and times are not repeated in the
  normal linked row.
- Relationship lists do not add another nested expand/collapse control.

Inside an unlinked itinerary card's expanded Booking section, show **Create booking** and **Link booking**. Once linked,
show the booking name as a navigation control, its derived booking state, and a separate **Unlink** action.

Inside a booking card's expanded Itinerary section, list every linked activity. Each row shows the activity name as a
navigation control, useful schedule information, and its own **Unlink** action. **Add to itinerary** and **Link existing
activity** are section-level actions because they do not belong to an existing linked row.

Selecting a linked record's name navigates to the other workspace page, expands the destination card, and briefly
emphasises it so the destination remains obvious even when it was already visible and no scrolling occurred. Scroll
only when needed. Use a short outline/background emphasis rather than rapid flashing, move keyboard focus to the
destination card or heading, and respect reduced-motion preferences. The emphasis is a one-use result of selecting the
link: selecting it again repeats the emphasis, while reloading the destination page does not.

Creating from either direction opens a prefilled form inside the source card. The mappings are:

- Activity to booking: name; suggested booking category from category; date/time; calculated end from duration; location;
  link; notes; and Total cost from itinerary cost. The user chooses booking status.
- Booking to activity: name; suggested activity category from booking category; date/time; duration calculated from the booking's
  start and end; location; link; and notes. Priority uses the normal middle default. For a simple booking expected to
  have one activity, prefill itinerary cost from Total cost. For return journeys or a booking that already has another
  linked activity, show Total cost as reference but leave activity cost blank so the same booking cost is not counted
  more than once.

The user reviews and can change all prefilled values before saving. The new record is linked automatically after it is
created.

Each relationship records whether it represents Outbound, Return, or a general/other activity. Every group can contain
multiple activities; the interface does not restrict how travellers choose to represent a journey. Date/time and
location change notices apply only to activities in the relevant journey group.

If the booking date falls outside the trip dates, or the trip does not yet have complete dates, the prefilled activity
remains Unscheduled and the form explains why the date was not copied. The booking date is preserved unchanged.

After linking, the two records remain independent. Changes never rewrite the linked record. Date/time, duration/end,
location, and cost changes create a persistent, dismissible contextual notice beside the relationship on the other
record. The notice shows the current relevant details so the traveller can decide whether to edit that record manually.
Names, categories, notes, statuses, providers, confirmation numbers, and links remain independent and do not trigger a
notice. Journey date/time and location notices are limited to activities connected to the changed leg; booking-wide
cost changes may notify every related activity.

### Review changes from a booking

Changes never update the linked expense automatically. Compare the expense with the booking's net paid amount.
When the relevant amount changes, show the exact before/after values and offer an immediate update or **Keep as is**.
An update changes only the linked amount; names, categories, and payment/journey dates keep their separate meanings.
Changes from the expense can similarly propose the Amount paid defined in the approved financial rules above.

When a fully refunded booking has an expense, its net cost is zero and expenses cannot store zero amounts. Offer
**Keep expense and unlink** or **Delete expense**. Preserve the booking's original payment/refund history either way.

If Total cost is cleared or the booking is changed to Free while an expense is linked, require the user to unlink or
delete the expense first; never delete recorded spending automatically.

### Planned-cost changes after an expense is created

A planned cost and an expense are conceptually different: changing a plan does not mean the actual payment changed.
When the amount of a planned cost with a linked expense changes:

- Do not change the expense automatically.
- Show a dismissible note beside the planned cost after it is saved.
- The note explains that the linked expense still has its existing amount and offers **Adjust expense**.
- Closing the note keeps the expense unchanged and removes the note.
- A later planned-cost amount change shows the note again.

## Display and interaction

The create/edit form uses compact inline field labels. Name takes approximately two thirds of its row beside the
shorter Category field. Status, Provider, and Confirmation number share the next row. For categories without separate
start and end locations, both date/time groups share one row. Flights, Rail, bus & ferry, and Car hire instead use one
row per departure/pick-up or arrival/drop-off, with location beside the date and time. A pink **More details / Hide
details** disclosure after the schedule contains the shared location when applicable, link, cost information, and
notes; related activities and budget records are card sections rather than form fields.

Schedule rows use consistent label, date, time, and location columns so corresponding fields align even when their
labels have different lengths. Messages beneath a field group span the full form width. The Link and Cost sections are
not separated by a divider. Outbound and return journey fields are also not separated by a divider.

Warnings use a separate full-width orange message row directly beside the field group they describe. Validation errors
use a shared full-width pale-red message with a red border, dark-red normal-sized text, and their own row so neighboring
fields do not move. Informational messages use normal gray text. These semantic message treatments are shared across
the app wherever the message serves the same purpose. Loading text, empty states, undo toasts, and confirmation dialogs
remain separate patterns.

Contradictions between values already entered are validated immediately, including date ordering, payment/refund
limits, and return-journey ordering. An invalid link is shown after leaving its field. Required empty fields do not turn
red while the traveller is still completing the form; they are validated after Save is pressed. When Save finds an
error, open More details when necessary, smoothly scroll the first invalid field into view, and move keyboard focus to
it. When **Has cost** is selected, Total cost uses the required-field treatment with bold label and an asterisk.

Each booking is displayed as an expandable card, following the established itinerary-card pattern:

- The collapsed summary keeps the page scannable and shows the booking name plus its most useful date, category, booking
  status, payment/refund state, and cost information.
- A same-day start and end show the date only once. For a return booking, the collapsed summary shows separate Outbound
  and Return rows. The complete collapsed area uses four aligned columns: name and journey details, price, status pills,
  and actions. This makes prices line up vertically across booking cards. The booking's total price is larger and
  right-aligned as booking-level information rather than being attached to either journey row. The booking-status and
  financial-status pills are stacked, with booking status above financial status. A free booking relies on its
  **Free** pill and does not repeat `Free` in the detail row.
- Expanding a card reveals secondary details such as provider, confirmation number, category, link, notes, payment
  breakdown, return journey information, related records, and related-record actions.
- Information already shown in the persistent card summary, including its date range, location, and total cost, is not
  repeated in the expanded details.
- Add to expenses automatically expands the relevant card and shows its prefilled form inside it.
- Edit remains a distinct action and uses the app's established inline-form and unsaved-changes behaviour.
- While editing, the form replaces the booking card rather than opening inside it, matching itinerary activities.
- Show the expand control only when the booking has secondary information to reveal. Its action order matches itinerary:
  expand/collapse, edit, then delete.
- Clicking or keyboard-activating the name and main-details area also expands or collapses booking and activity cards;
  edit, delete, status, and relationship controls remain separate targets.
- Booking and itinerary cards use the same spacing between list entries.
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

For a cancelled booking with money paid, the refund-state pill replaces the ordinary payment-state pill. Booking category
is descriptive metadata, not a third status pill. Warnings and linked-record indicators also remain separate from the
status pills.

All status pills use the same pink treatment in the first version. Semantic colors are deferred; later, states may use
meaningful colors such as blue or green for Confirmed/Paid, gray for Cancelled/Free, and pink for Requested or
Partially paid.

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
Search, category/status filters, or additional grouping can be added later if real trips become difficult to scan.

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

Implementation is in progress under the approved revision above.

Completed in the direct-expense chunk:

- Direct booking/expense relationships across storage, API, and booking-card actions, including migration of existing
  expense links and preservation of independent planned-cost/expense links.
- Create a prefilled expense from net paid, or link/unlink an existing expense. Normal expense forms and booking forms
  share their editable fields. Deleting a booking makes its surviving expense immediately available for relinking.
- Linked-expense deletion uses an app-styled confirmation and keeps related records.
- Backend/API and migration-backfill tests, affected frontend tests, production build, lint, and a Chromium
  expense-creation/navigation test pass. Independent review has no remaining actionable findings. The full frontend
  suite still has the pre-existing missing TripSetup import; a live PostgreSQL migration has not been exercised.

Completed in the booking feedback chunk:

- Booking and activity card expansion choices persist per trip and page across tab navigation.
- Linked-activity deletion confirms and commits immediately, with a completion refresh removing stale activity links
  and showing the deleted-link notice even after navigation. A refresh cannot overwrite newer local booking changes.
- Expense relationship controls share their label's row, link controls are compact and vertically aligned, and budget
  destination highlighting has rounded corners.
- Focused tests cover persistence, immediate deletion, cross-navigation refresh, and stale-refresh-vs-unlink behavior.
  Broader budget/expense changes requested during feedback remain documented for later work.

Completed in the saved-card alignment follow-up:

- Saved booking details stack left in compact shared label/value columns, including activity and expense links/actions.
  The Expense label appears only once an expense is linked; create/edit forms are unchanged.
- Outbound/Return dates and locations share aligned columns. Long details wrap and narrow screens stack without overflow.
- Planned-cost and expense amounts align vertically with edit/delete controls regardless of their metadata lines.
- Seventeen focused frontend tests, two Chromium tests with desktop/mobile layout checks, production build, and lint pass.
  Independent review has no remaining actionable findings; user acceptance is pending.

Completed in the itinerary detail consistency chunk:

- Booking and itinerary saved field labels have no trailing colons; Confirmation number retains its full wording.
  User-entered punctuation is preserved.
- Expanded activity fields and related booking controls use the shared booking label/value grid. Desktop values align,
  long notes wrap beneath their value, and narrow layouts stack without horizontal overflow. Forms remain unchanged.
- Twenty-three booking/itinerary tests, two Chromium tests with activity/booking desktop/mobile checks, production
  build, and lint pass. Independent review has no actionable findings; user acceptance is pending.

Completed in the booking expense-deletion chunk:

- Linked expenses offer **Delete** beside **Unlink**. The existing app confirmation names the expense, explains removal
  from spending, and identifies the booking and any linked planned cost that will remain and be unlinked.
- Cancel leaves records unchanged. Successful deletion clears the expense/link locally; a failed deletion preserves
  the link and allows retry. An expense already deleted elsewhere is treated as removed rather than restored.
- Thirteen booking tests, two Chromium tests including cancellation and actual deletion, production build, and lint
  pass. Independent review has no actionable findings; user acceptance is pending. Browser tests used a separate
  Release test server to avoid rebuilding files locked by the running local Debug app.

Completed in the related-change warning visibility chunk:

- Existing booking/activity change notices appear below the saved card summary in both directions, even collapsed.
  Each notice identifies the linked record and relevant journey and is rendered once, not repeated in expanded details.
- Dismissal works without expanding and persists through the existing endpoints. A failed dismissal leaves the notice
  visible for retry, with an error visible outside the collapsed details. Missing full linked-record details do not
  hide the pending notice.
- Twenty-seven booking/itinerary tests and two Chromium tests pass, including real changes in both directions,
  collapsed/expanded visibility, no duplicate notices, and dismissal persistence across reloads. Production build
  and lint pass; independent review has no actionable findings. User acceptance is pending.
- The initial visibility chunk used current-details summaries; the completed review flow below supersedes them.

Completed in the linked-record review/action chunk:

- Persisted field-level reviews cover Bookings ↔ Activities, Bookings ↔ Expenses, and Planned costs ↔ Expenses in both
  directions. Notices show only changed fields, keep their first/most recent values across edits, and disappear when
  those source changes are reverted. Link-time financial mismatches are explicit rather than silently synchronised.
- Shared inline **Update** and **Keep as is** actions work below collapsed card summaries and across the full width of
  planned-cost/expense rows. Updates take effect immediately and refresh the displayed record; decisions persist.
- Financial updates use net paid, reconstruct gross Amount paid with positive refunds, preserve Total cost, and keep
  names/categories/payment dates independent. Full refunds explain the zero-expense restriction and offer keeping
  the expense with unlinking, or named confirmed deletion, while preserving booking payment/refund history.
- Ownership checks, review revisions, destination snapshots, validation and transactional saves protect decisions.
  Conflicts refresh the warning instead of leaving permanently stale actions. Accepted fields clear reciprocal
  reviews and corresponding legacy flags, while changes relevant to other links create their own reviews.
- Earlier flag-only notices explicitly explain their unavailable history and allow **Keep as is**. No prior values
  are fabricated. The new migration adds review storage without changing existing financial amounts or links.
- All 77 backend tests, 38 affected frontend/shared tests, three Chromium tests, production build and lint pass.
  Browser checks cover exact schedule changes and both financial relationships, immediate updates, persistent Keep
  decisions, no reciprocal notices, and phone-sized layouts. Independent review has no actionable findings;
  user acceptance is pending.
  A live PostgreSQL migration has not yet been exercised; restart the API to apply the new review-storage migration.

Remaining: Mark as paid, saved-card date warnings,
the planned-cost-to-expense navigation control, and further user acceptance checks. Shared group/view improvements
and the tab split remain separate work.

The completed chunks below describe the earlier implementation history; the revised rules above supersede their
booking/planned-cost-chain behavior.

Completed in the backend foundation chunk:

- Booking storage, category-specific dates and locations, return journeys, cost/payment/refund data, validation, and
  migration.
- Authenticated trip-owned booking CRUD endpoints with chronological ordering and derived financial status.
- One-booking-to-many-activities links with general, outbound, and return roles.
- One-to-one booking/planned-cost links, with an expense reached through the existing planned-cost relationship.
- Persistent deleted-link notice state and dismissal endpoints.
- Focused validation and API tests.

Completed in the booking budget API chunk:

- Atomic creation of a booking's linked planned cost, plus atomic expense creation that creates the planned cost when
  needed or uses the booking's existing linked plan.
- Budget-chain eligibility, validation, relationship uniqueness, and concurrent-creation conflict handling at the API
  boundary.
- Stable response shapes for the planned cost and expense records created from a booking, with focused API coverage.

Completed in the planned-cost frontend chunk:

- Positive-cost bookings can create a prefilled planned cost or link an unlinked existing one from their expanded card.
  Blank-cost and Free bookings do not offer these actions.
- Linked planned costs and their expenses appear on the booking card and navigate to the matching budget record.
  Unlinking a planned cost preserves the budget records.
- Planned-cost forms use the app's unsaved-changes confirmation and amount validation; linked budget rows receive
  navigation focus and a brief highlight.

Completed in the first frontend chunk:

- A Bookings workspace tab and route between Itinerary and Budget & expenses.
- The empty state, chronological active list, separate subdued Cancelled section, expandable cards, and Expand all /
  Collapse all controls.
- Create and edit forms with category-specific schedule labels, optional return journeys, provider and link guidance,
  trip-currency costs, Free handling, derived payment/refund inputs, outside-trip warnings, and inline validation.
- Booking status and derived financial status pills, expanded reservation/payment details, and linked-aware deletion
  messaging.

Completed in the itinerary integration foundation:

- Activities can be marked **Booking required** in their create/edit form.
- Activity cards derive and display **Booking required**, **Booking linked**, **Booking requested**, **Booked**, or
  **Booking cancelled** from their stored booking relationship and the linked booking's current status.
- A booking-required activity can link an existing booking, choose a general/outbound/return relationship when
  applicable, create a prefilled booking in place, navigate to the linked booking with a brief highlight, and unlink it
  without deleting either record.
- Expanded booking cards list their linked activities, navigate to and briefly highlight an activity, and
  unlink each relationship independently. They can also link an existing activity or create a prefilled activity in
  place. Both normal and prefilled activity workflows use the same form component.
- Surviving activities and bookings show persistent, dismissible notices when a linked record was deleted.
- Editing schedule, duration/end time, location, or cost never changes the linked record. Instead, a persistent,
  dismissible notice appears beside the relationship on the other record and shows its current relevant details.
- Flight and Rail, bus & ferry bookings group related activities as Outbound, Return, or Other and allow multiple
  activities in every group. Booking changes notify only the relevant journey group, except booking-wide cost changes.

The booking/activity itinerary integration is complete for the first version. Remaining booking-feature work concerns
expense creation and review from bookings, broader browser coverage, and user testing.
