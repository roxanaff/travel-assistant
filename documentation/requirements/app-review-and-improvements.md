# App review and improvements

Last planning update: **27 October 2026**.
Branch for approved work: `feature/app-review-improvements`.

This is the detailed plan for finishing the review that started after Bookings.
The [roadmap](../roadmap.md) gives the bigger product order. The
[maintenance backlog](../maintenance-backlog.md) holds individual issues and later ideas.

**Start here:** the next sections explain our decisions and work order in plain language.
The [technical reference](#technical-reference) keeps the original findings, code links,
test results and limits. Its F/B/C identifiers are unchanged.

These are agreed requirements and a planning direction, not permission to implement
every item. No application, database or UI changes are part of this documentation update.
The existing app keeps its current behavior until each replacement is implemented.

## Work order

1. **Organise the documents.** Keep one roadmap, record the decisions below and retain the audit evidence.
2. **Design shared data.** Work out the records, ownership, schedules, finances, permissions,
   linking and removal rules. Independently review the technical plan before coding.
3. **Build the agreed relationships.** Shared values, direct activity/budget/expense links,
   duplicate prevention, booking categories and activity roles, and outside-trip dates.
4. **Finish useful code cleanup.** Review frontend and backend findings, remove verified unused
   code, simplify repeated or patched workflows, and share equivalent styles and controls.
   Reassess findings about the old review system instead of improving code we will replace.
5. **Improve the existing interface.** Remove outer page cards first; keep item boxes initially.
   Improve mobile navigation and existing-list usability. Keep Budget & Expenses together here.
6. **Finish the review and checks.** Verify affected workflows, database behavior, mobile and
   keyboard use, loading/errors, deletion and recovery. Resolve or explicitly defer every finding.

Steps 3–5 are work groups, not single commits or a rule that all backend work must precede UI work.
The technical plan will arrange their dependencies into small, reviewable chunks.

**After this review:** the first proposed major feature is the separate Budget and Expenses
redesign, with its own brainstorming and useful content for both pages. The user may postpone
it until after shared trips. It is not a prerequisite for sharing. Account/profile preparation
and a small first shared-trip release follow the roadmap; their exact scope still needs discussion.
Shared trips do not jump ahead of the current review/improvements.

### Explicit next-chunk queue

This replaces the old rigid queue with the work order above. Keep the identifiers below for
tracing earlier discussions; a queue number does not mean code is approved.

| Earlier ID | What it means now | Before implementation |
| --- | --- | --- |
| Q01 | Touch dragging/cancellation: done, accepted and committed. | No new work. |
| Q02 | Live row movement: deferred and optional. | Reopen only if the user asks; not needed to finish this review. |
| Q03 | Shared-data behavior agreed below; technical design is next after this document check. | Define schema/API, invariants, migration/reset scope and slices; independent architecture review. |
| Q04 | UI decisions partly agreed; remaining interaction choices need examples. | Confirm each change, mobile/keyboard behavior and deletion wording; no wholesale UI rewrite. |
| Q05 | Remove one proven-unused group at a time (C01). | Check references, compatibility, assets and tests; approve concrete targets. |
| Q06a | Give shared text roles one style owner (F02/F04). | Agree visual hierarchy; preserve palette experiments and verify consumers. |
| Q06b | Share equivalent form-control styling (F03/F04). | Keep intentional variants, focus/error states and form behavior. |
| Q07a | Simplify fetching/refresh ownership where still needed (F09). | Reassess after Q03; measure requests before choosing a cache or shared owner. |
| Q07b | Share equivalent deletion/Undo handling (F06). | Keep distinct confirmation, retention, ordering, failure and unmount behavior. |
| Q07c | Split one oversized workflow at a time (F05/C02/C03). | Choose real responsibility boundaries; preserve behavior and test them. |
| Q08a | Clarify mapping/validation ownership (B01/B03). | Follow the reviewed shared-data design; avoid a generic service framework. |
| Q08b | Replace or simplify old review state and proposal/query paths (B02/B04). | Decide what survives Q03; retain safeguards during transition; measure query cost. Split lifecycle and query changes. |
| Q08c | Remove proven duplicate queries; share equivalent checklist logic (B05/B06). | Separate commits; retain ownership checks and feature-specific effects. |
| Q08d | Improve field-error/API contracts (B07). | Coordinate client/server compatibility and regression checks. |
| Q09 | Repeatable disposable PostgreSQL checks (B08). | Agree infrastructure scope; keep fast tests; move earlier if schema work needs it. Never use personal/deployed databases. |
| Q10 | Existing-list sorting, preferences, links, dialogs/notices and group controls. | Define each behavior and persistence rule. The Budget/Expenses redesign is now outside this review. |

Do not silently pull unrelated backlog work into a chunk. Every audit finding should end as
fixed, replaced by the new design, or explicitly deferred—not automatically implemented.

## Decided: shared data and relationships — D01

### Structure and standalone entries

Use a **small shared core with optional parts**, rather than one large record containing every
possible field or copied values that need repeated Update/Keep reviews.

The core identifies the underlying item and its trip; a common name is the current direction.
Activity, booking, planned-cost and expense details remain separate. Shared schedules and financial
facts have one owner and are stored once. Exact tables, keys, constraints and API shapes are not
designed yet; these responsibilities do not require one table for every small group of fields.

Payment date belongs to the expense and stays independent of the event/journey date; it does not
follow schedule edits. Booking, activity and budget/expense
categories also have different meanings; reservation notes and personal planning notes need not
be shared. A common identity does not make every field common.

Any part can exist on its own. Examples: a free walk as an activity, a food allowance as a
planned cost, coffee as an expense, or a hotel reservation without an activity. Financial information
can exist without a planned-cost entry. Having a cost does not automatically include an item in Budget.

For a single event such as a concert, booking and activity use the same schedule/location and
total cost. A linked planned cost follows the confirmed total. Edit a genuinely shared value once
and its other views update automatically. Remove obsolete synchronization reviews when their
replacement is ready; do not remove unrelated validation, conflict or access safeguards.

### Activities and money

- An activity can have an expected cost without a booking or planned-cost entry.
- Offer **Add to budget** and **Add expense**. Use **Add expense**, not Record payment.
- Once the expense exists, open/edit that expense rather than offer to create another.
- No separate payment system or required Paid/Refunded fields in the ordinary activity form.
  Reuse the financial workflow; exact action placement and payment-form presentation need design.
- Including an item in Budget and Expenses are independent choices. Paying does not remove its
  planned cost. Standalone planned costs and standalone expenses remain supported.
- A linked planned cost follows the confirmed total. Do not retain the original estimate as a
  separate historical value; an original-budget comparison feature is not requested.
- The activity/booking total is distinct from payment. Spending totals count the expense once,
  not every place displaying the same price.

### Payments and refunds

Keep one aggregate recorded payment total and one expense per underlying purchase for now.
Multiple transactions/payment schedules are not part of this redesign.

**Net spending = Paid − Refunded.** Net spending is calculated, never directly edited.
For example, Paid €80 and Refunded €20 means €60 shown as spending. A normal standalone expense
can record Paid €20 with no refund without requiring a booking or budget entry.

Creating or linking an expense sets the recorded payment total, not another transaction.
Creation from booking, activity or planned cost must reach the same existing expense and prevent
duplicates, including concurrent requests. Recording/linking an expense for an unpaid item is allowed.

Retain the existing refund/status and cancelled-summary behavior unless explicitly changed:
positive refunds use one Refunded status; cancelled bookings omit summary money; active summaries
show paid/total or only total when fully paid. Refunds cannot exceed paid.
If the payment requires raising a confirmed total, offer the explicit increase to paid and total;
do not silently lower total. Exact form/validation details belong in the technical plan.

### Booking categories and activities

Agreed categories: **Accommodation, Transport, Rental, Activities, Dining, Passes, Other**.
Keep Not specified as the empty choice. An optional transport mode is a proposal, not a decision.

| Booking | Activity relationship | Shared information |
| --- | --- | --- |
| Activities or Dining: concert, museum admission, single tour, restaurant | One activity for the event. A continuous tour can have several stops and still be one activity. | The event schedule, location and total cost. |
| Transport | Outbound and optional return activities. One expense for the whole reservation. | Each journey's schedule and departure/arrival locations. |
| Accommodation | Optional check-in and checkout activities: either, both or neither. | Reservation start/end date-time respectively, and accommodation location. The whole stay remains on the booking. |
| Rental | Pickup and return activities. | The corresponding start/end schedule and locations. |
| Passes | Multiple covered activities. | Coverage only; activities retain independent schedules and locations. The pass keeps its validity and overall finances. |

Do not assign an artificial split of a reservation's total to its activities.
Omit activity prices for covered visits and reservation parts; keep access to the overall cost via
the booking link. A single-event activity still displays its shared event price.
Do not replace hidden prices with long labels such as Covered by pass or Cost in booking.
Explicitly free remains distinct from unknown or covered cost.

A pass category with multiple links supersedes the earlier notes-only limitation.
Separately charged extras remain separate items; allocating costs is not in scope.
A multi-day tour's exact schedule representation still needs a concrete design example.

### Linking, unlinking and deleting

When linking existing entries with conflicting values, show the **actual alternatives** for each
field, with their source for context, and radio choices. Example: €20 — Activity / €25 — Planned cost.
Validate and apply the selected combination together. Cancel linking leaves entries independent.
Continuing to keep different copies is not a shared-value link.

Deleting one part removes its own details; the other parts and their values remain.
Only delete shared records when nothing needs them, and remove an empty core when no parts remain.

Unlinking separates identities and copies the required current facts into independent shared-data
records. For example, two references to one schedule become references to two schedules with
initially equal dates. Do not erase dates because individual parts have no date columns.

The user says local booking links can be reset and preserving that particular data is low priority.
This is not permission to erase deployed/account data or unrelated planned-cost/expense links.
Agree the concrete reset/migration scope before a destructive operation.

### Allow dates outside the trip

Both activities and bookings may keep dates outside the trip. Show a dismissible warning, including
on a collapsed entry. Scheduled entries remain visible on their real dates; do not make them
unscheduled. Unscheduled means no date selected. Do not introduce category-specific exceptions.

The warning proposes the precise expansion as a question, for example:

> **Outside trip dates**
>
> Update the trip start from 10 Oct to 9 Oct?
>
> **Update trip dates** · **Edit activity dates** · **Keep as is**

Use Edit booking dates for bookings. If both boundaries change, ask:
“Update the trip dates from 10–15 Oct to 9–17 Oct?”

Update trip dates expands only the necessary boundary/boundaries to include the item, immediately;
it never shrinks the other boundary. Edit dates opens the item's form and focuses the relevant date
field. Keep as is preserves dates and hides this warning; check again after relevant date changes.
No automatic Move inside trip action: the app cannot guess a correct new flight or event date.

The detailed design must define the applicable schedule/validity range for a pass and how trip-date
editing interacts with any existing automatic activity shifting. It must not silently shift fixed
activities or reintroduce the superseded automatic-unscheduling rule.

### Prepare for shared trips without building sharing now

Sharing permissions must be separate from shared data references. A visible activity can expose
its shared schedule, but not private confirmation numbers, payments or other hidden parts.
Separate tables alone do not enforce this; APIs must check access and avoid leaking hidden links,
names, counts or values.

Plan for individual activity/booking/planned-cost/expense visibility, plus eventual page-wide
choices. The user's intended activity list is shared; selected bookings and potentially expenses
can be shared, while personal entries stay private. Initial financial-sharing scope is still open.

It is accepted that editing an accessible shared fact can update a private booking using that fact.
A confirmation explaining the effects may be considered when sharing is implemented.
This does not grant permission to edit private-only fields.

Default sharing choices, bulk selection, invitation/role policy, record ownership and permission to
change shared trip dates need a dedicated plan. Proposed defaults were examples, not agreements.

## Decided: UI direction and work process — D02–D08

| ID | Decided | Still open |
| --- | --- | --- |
| D02 | Add expense wording; show related links from Budget and Expenses as well as booking/activity. | Faster creation, one right-side Add link menu with four new/existing choices, journey-role editing without unlinking, input requirements and Undo. |
| D03 | Full forms remain available. | Which fields support inline editing; discoverable tap/click and keyboard access, save/cancel. Double-click was a suggestion only. |
| D04 | Remove outer page cards first. Retain individual item boxes initially, then assess mobile/desktop. | Replacement mobile tab navigation; whether later to use divider-separated item rows. Do not remove every border at once. |
| D05 | Existing review appearance was not finally accepted. | What review UI remains after shared-data redesign, and its final appearance. |
| D06 | A clearer replacement for Itinerary is wanted. | Actual name; Schedule, Activities and Trip plan are suggestions, not an agreed rename or route change. |
| D07 | Future separate Budget/Expenses pages need their own brainstorming, trackers/statistics and design—not an empty tab split. Existing lists need grouping/order/persistence work. | Detailed heading controls and preference scope; savings/spending goals and indicators belong to the later feature. |
| D08 | Architecture-first planning and independent reviews are adopted. | No blanket approval of abstractions or every cleanup candidate. |

Budget and Expenses start with the same category order, then retain independent custom orders.
Planned budget needs an Ungrouped option. Remember grouping, expansion and ordering where agreed.
Keep current item layouts initially; expandable Budget/Expense details should expose all related
entries, not add another nested financial card. Amounts, labels and actions need consistent alignment.

## Still to work out before coding

- Exact core/schedule/financial records and uniqueness constraints, including event versus journey/validity.
- Ownership of names, categories, notes, event end/duration and prices on reservation parts.
- Concrete examples for standalone activity/expense, round trip, hotel, Rental, pass and multi-day tour.
- Cancellation's effect on activities and budget entries. Deletion and unlinking are decided above,
  but cancellation must not erase money already paid/refunded.
- Linking incompatible relationship types, merging existing identities and concurrent/stale edits.
- Compatibility/reset scope, constraints, API responses, privacy boundaries and atomic writes.
- Which old review/notice paths disappear, which remain, and how they transition safely.
- Remaining quick-action, inline-editing, naming, mobile-navigation and confirmation choices.
- Account/profile and first shared-trip scope, separately from this review's implementation.

After the design, specify observable acceptance examples and small code/test/documentation chunks.
Independent architecture review precedes substantial implementation. Each completed chunk gets
independent review, verification, a manual check handoff and the user's commit pause.

## Done

| Work | Completion |
| --- | --- |
| F14 — Unsaved forms | Shared controlled-state guard, regression checks and independent review; user accepted and committed. |
| F01 — Frontend test baseline | Obsolete TripSetup tests migrated to TripDetails; full suite restored and committed. |
| B09 — Dependency/runtime servicing | Scoped package updates and local .NET update checked/reviewed; user restarted and committed. Deployment unchanged. |
| F10 — Stale loading | Current-request protection, regression checks and review; user accepted and committed. |
| Q01/F15 — Touch drag cancellation | Shared fix and regression checks; user accepted and committed. |
| D08 — Working process | Skills and repository rules adopted; small planning checks or full architecture review according to risk. |

These are historical completion results, not claims of a new full test/security run today.
Detailed counts, source evidence and test limits remain below.

## Later or optional

- Q02 live row movement: deferred on 25 October 2026; reopen only at the user's request.
- App-wide **Ctrl+Z / Ctrl+Y** Undo/Redo: requested for future planning, not this round.
  Keep native text undo inside inputs; cross-record actions must undo together and redo safely.
- Budget/Expenses redesign, savings goals, progress and statistics: first proposed major feature
  after review, postponable until after shared trips; not a simple navigation split.
- Calendar, advanced scheduling, route optimisation, transaction ledger/multiple currencies,
  receipts, splitting, templates, extensive preferences, external data and AI: follow the roadmap.
- Feedback/profile/account scope is not automatically added to the current review.

## Technical reference

The original audit started on **24 October 2026**, on dev after the Bookings merge.
It covered frontend navigation, Details, Itinerary, Bookings, Budget/Expenses, To-do, Packing,
dashboard/account patterns, shared controls/styles/state, and test readiness. Backend coverage
included endpoints/services, validation/contracts, payment/review logic, ownership/queries,
database constraints/migrations and provider-specific tests.

This was direct source inspection, not a full rendered accessibility audit, performance profile,
complete security assessment or fresh full-suite run. Targeted F10/F14/F15 diagnosis and subsequent
checks have their own limits below. F14 was originally implemented on
`feature/unsaved-form-protection`; subsequent approved work uses the branch at the top.

**Read findings as evidence of the existing implementation.** Old candidate solutions—especially
manual synchronization reviews and Make unscheduled—are not new requirements. The agreed sections
above supersede them where they conflict. Retain their evidence and safety checks while designing
replacements.

Finding IDs remain stable. For each, record whether it is fixed, replaced or deferred, and
update the backlog when implemented. A source review or unit test is not user visual/touch acceptance.
Retain existing shared foundations where useful rather than introducing a new framework by default.

## Existing shared foundations to retain

| Area | Existing implementation | Implication |
| --- | --- | --- |
| Page/list structure | `SectionCard`, `SectionHeader`, `GroupHeading`, `GroupAddButton`, `GroupingControl` | Extend or adopt these before introducing replacements. |
| Forms | `FormPrimitives`, `FormDetailsToggle`, `ActivityForm`, `ExpenseFormFields`, `TripForm` | Activity and expense creation from bookings already reuse field components. |
| Saved cards | `ExpandedCardDetails`, `ExpandableCardActions`, `StatusPill`, shared aligned-detail CSS | Alignment, expansion actions and pills are not separate implementations everywhere. |
| Relationships | `ExistingRecordLinkForm`, `RelatedRecordReviews`, `LinkedRecordWarnings` | Incoming warnings and outgoing panels intentionally present different directions, but share decisions and validation. |
| Dialogs/feedback | `ConfirmDialog`, `FormDiscardDialog`, `InlineMessage`, `UndoToast` | Reuse semantics, focus handling and error behavior, not just visual CSS. |
| Checklists | `ChecklistHeader`, `ChecklistColumns`, `ChecklistLayout.css`, `useChecklistView`, `useChecklistDragReorder` | Packing/To-do already share layout, grouping preference and drag machinery. |
| Cross-feature utilities | `useExpandableCards`, `useNavigationCardFocus`, `useFormKeyboardInteraction`, `useDismissibleMenu` | Preserve navigation timing, keyboard access and existing persistence when refactoring. |
| API access | [`travelAssistantApi.ts`](../../frontend/src/api/travelAssistantApi.ts) | Credentials, safe error handling and mutation notifications are centralized already. |

Component sources: [`components/shared`](../../frontend/src/components/shared),
[`utils`](../../frontend/src/utils), and [`styles/shared.css`](../../frontend/src/styles/shared.css).

Backend foundations to retain: [`TripAccess`](../../backend/Endpoints/TripAccess.cs) for trip ownership,
[`Validation`](../../backend/Validation) for authoritative validation,
[`BookingExpensePayments`](../../backend/Services/BookingExpensePayments.cs) for payment projection,
[`BookingDateWarnings`](../../backend/Services/BookingDateWarnings.cs), and
[`TravelAssistantDbContext`](../../backend/Data/TravelAssistantDbContext.cs) for relationship constraints.
EF Core already supplies change tracking and a unit of work; a generic repository/service layer is not automatically needed.

## Confirmed findings and refactoring candidates

### F01 — Restore the full frontend test baseline

**Priority:** P1. **Status:** Verified. **Type:** Obsolete test coverage restored.

Original finding: `tests/features/setup/TripSetup.test.tsx` imported `src/components/setup/TripSetup`, which no longer
exists. The final booking verification passed 86 runnable frontend tests but failed collection of that suite.
The tests now live in [`TripDetails.test.tsx`](../../frontend/tests/features/details/TripDetails.test.tsx).

Approved chunk and lightweight technical plan: migrate the two obsolete tests to the current
[`TripDetails`](../../frontend/src/components/details/TripDetails.tsx), following existing Testing Library/MemoryRouter
patterns. Preserve the destination/budget-currency display assertions and API edit/save check, using the direct Edit
trip control rather than the removed actions menu. A small stateful test host represents the workspace's shared trip
state so the save test verifies the updated destination is rendered, not merely that a callback fired.
[`TripForm`](../../frontend/src/components/trips/TripForm.tsx) already has separate validation/keyboard coverage; retain
it without duplication. No application code, API, schema or test-exclusion changes are needed. Run the full frontend
unit suite, lint and production build, then independent chunk review. Browser/backend checks are not required for this
test-only migration. Verification: all 95 tests in 14 frontend test files pass with no suite exclusions added;
lint, production build and diff checks pass. No application behavior changed. Independent review found no actionable
issues. The chunk is ready for the user's commit checkpoint.

Backend dependency advisories are a separate maintenance task; the follow-up assessment is recorded under B09.

### F02 — Text roles are scattered despite shared palette tokens

**Priority:** P2. **Status:** Open. **Type:** Confirmed style inconsistency/refactoring candidate.

Evidence: [`index.css`](../../frontend/src/index.css) defines palette colors, while
[`layout.css`](../../frontend/src/styles/layout.css), [`metadata.css`](../../frontend/src/styles/metadata.css),
[`Bookings.css`](../../frontend/src/components/bookings/Bookings.css), and
[`BudgetItem.css`](../../frontend/src/components/budget/BudgetItem.css) separately choose summary/detail/muted colors
and sizes. Booking summaries use a feature-specific color; activity metadata uses shared metadata classes. Detail
text was darkened already, but that did not centralize its semantic meaning.

Next: agree summary, detail, muted, label and action text roles, then bind equivalent consumers to shared tokens/styles.
Preserve the user's current palette experimentation. Do not darken every grey element globally.
Checks: one change per role affects equivalent booking/activity/budget text; links, hints and placeholders remain distinct.

### F03 — Form-control appearance is repeated with slightly different values

**Priority:** P2. **Status:** Open. **Type:** Confirmed duplication; density differences need a decision.

Evidence: [`forms.css`](../../frontend/src/styles/forms.css) provides `.form-control` and form-surface controls.
[`Bookings.css`](../../frontend/src/components/bookings/Bookings.css) repeats padding/border/radius/background/font
for schedule inputs. [`ExistingRecordLinkForm.css`](../../frontend/src/components/shared/ExistingRecordLinkForm.css),
[`GroupingControl.css`](../../frontend/src/components/shared/GroupingControl.css), and
[`AuthPages.css`](../../frontend/src/pages/AuthPages.css) declare similar controls with different padding/weights.

Next: define a shared control appearance with an explicit compact variant if needed; keep feature-specific layout and
required/disabled semantics separate. Different spacing is not automatically a bug, and auth need not share a whole form.
Checks: ordinary, compact, date/time, select, checkbox, error and focus states on desktop/mobile.

### F04 — Shared and feature styles can compete for the same responsibility

**Priority:** P2. **Status:** Open. **Type:** Confirmed ownership ambiguity, not proof every override is wrong.

Example: activity summary markup combines `itinerary-item-meta` with `item-metadata-detail`.
[`metadata.css`](../../frontend/src/styles/metadata.css) sets a gap, while
[`Itinerary.css`](../../frontend/src/components/itinerary/Itinerary.css) also sets a gap for that same element.
[`forms.css`](../../frontend/src/styles/forms.css) uses `!important` for the pink disclosure treatment, and
[`RelatedRecordReviews.css`](../../frontend/src/components/shared/RelatedRecordReviews.css) implements another pink
disclosure treatment. Form control and metadata rules span global and feature sheets.

Next: assign ownership of visual appearance versus layout, use explicit variants where behavior differs, and remove
redundant declarations only after checking consumers. An override/specificity increase alone is not an actionable bug.

### F05 — Feature coordinators contain too many separate workflows

**Priority:** P2. **Status:** Open. **Type:** Confirmed maintainability concentration.

Snapshot sizes: [`Bookings.tsx`](../../frontend/src/components/bookings/Bookings.tsx) 2,279 lines;
[`Itinerary.tsx`](../../frontend/src/components/itinerary/Itinerary.tsx) 938;
[`TodoChecklist.tsx`](../../frontend/src/components/todo/TodoChecklist.tsx) 649;
[`PackingChecklist.tsx`](../../frontend/src/components/packing/PackingChecklist.tsx) 626.
Line count alone is not a defect: Bookings specifically combines validation/formatting, reservation form/card rendering,
payments/Undo, related activity creation/linking, expense creation/linking/deletion, navigation and refresh coordination.

Next: extract coherent boundaries, initially booking form/card and related-workflow sections, while preserving one clear
owner of mutations. Retain the already shared ActivityForm/ExpenseFormFields. Decide D01/D02 before restructuring
relationship workflows that might change. Do not replace these files with a single equally large generic hook.

### F06 — Deferred deletion/Undo lifecycle is repeated across lists

**Priority:** P2. **Status:** Open. **Type:** Confirmed similar behavior with important exceptions.

Packing and To-do repeat pending-deletion state, a five-second timer, flushing a previous deletion, restoration on
failure and Undo. Planned costs, expenses and unlinked activities have related implementations. Evidence: the
`commitDelete`, remove/delete and `undoDelete` sections in their feature components.

Next: consider a small shared deferred-deletion primitive for truly equivalent cases, keeping API calls and restoration
ordering feature-owned. Linked activities/expenses require confirmation and immediate deletion; Mark as paid Undo is
another operation entirely. Preserve these distinctions, rapid repeated deletes, unmount behavior and failures.

### F07 — View preference persistence is inconsistent

**Priority:** P1. **Status:** Open. **Type:** Confirmed user-visible gap.

[`ExpenseTracking.tsx`](../../frontend/src/components/budget/ExpenseTracking.tsx) initializes grouping with
`useState("category")`, so remounting resets it. Packing/To-do use
[`useChecklistView`](../../frontend/src/utils/useChecklistView.ts). Booking/activity expansion and outgoing review
panels use [`useExpandableCards`](../../frontend/src/utils/useExpandableCards.ts) with trip/page storage keys.

Next: agree preference scope (browser, account, trip and page), then extend the existing approach to expense/planned
grouping and future collapsed groups/category order. Do not reset already-persisted expansion choices.

### F08 — Category-grouped expenses bypass the existing date sorter

**Priority:** P2. **Status:** Open. **Type:** Confirmed behavior inconsistency.

[`ExpenseTracking.tsx`](../../frontend/src/components/budget/ExpenseTracking.tsx) calls `sortExpenses` for day groups
and ungrouped entries but only filters the original array for category groups. The API currently orders by creation
time ([`ExpenseEndpoints.cs`](../../backend/Endpoints/ExpenseEndpoints.cs)), not expense date.

Next: apply the agreed date ordering within categories, including undated entries and stable ties. Additional sorting
choices remain a separate design decision. This is not a reason to build a universal list component.

### F09 — Review fetching is shared in code but not in request ownership

**Priority:** P2. **Status:** Open. **Type:** Confirmed duplicate request paths; impact not profiled.

[`TripBudget.tsx`](../../frontend/src/components/budget/TripBudget.tsx) mounts PlannedBudget and ExpenseTracking;
each invokes [`useLinkedRecordReviews`](../../frontend/src/utils/useLinkedRecordReviews.ts), which loads all reviews
for the same trip and filters by kind locally. Successful API mutations broadcast a trip-wide event; record-array
changes can trigger another load. Features also own separate linked-record refresh callbacks and guards.

Next: profile actual calls and consider one trip-scoped review owner with selectors, or lifting ownership into the
existing budget boundary. Retain stale request/revision safeguards and mutation notifications. Do not introduce a
global cache or state library without evidence that it simplifies the ownership model.

### F10 — Stale requests and failed-load recovery; protected checklist key transitions

**Priority:** P2. **Status:** Focused fix verified, independently reviewed and accepted by the user. Checklist case remains protected by routing.

Original source finding: [`Workspace.tsx`](../../frontend/src/pages/Workspace.tsx) loaded by route ID without an
active-request guard or resetting the previous error/trip at load start. Expense loading also assigned asynchronous
results directly. Booking expense loading and the review hook already demonstrated guarded loading patterns.
Separately, `useChecklistView` reads storage only in its state initializer; if its key changes without remounting,
it does not read the new key's preference.

#### Targeted diagnosis — 24 October 2026

Six temporary Vitest/jsdom observation probes rendered the real components/hook with mocked API promises and isolated
browser storage. These assert existing failures, not desired regression behavior. All six observations reproduced:

| Probe | Observed behavior |
| --- | --- |
| Workspace: start A, navigate to B, resolve B then A | URL remains `/trips/b`, but the heading changes from Trip B to Trip A after A's late response. |
| Workspace: A fails, then B succeeds | The old connection error remains and B's successful result is hidden. |
| Expenses: change trip while the first request is pending | The older response replaces the newer expense list. |
| Expenses: overlapping refresh requests for the same trip | The older response replaces the newer expense list. |
| Expenses: failed load followed by a successful refresh | The old error remains and hides the successfully loaded rows. |
| Checklist hook: change storage key on the same mounted hook | It retains the previous key's view. Unmounting/remounting correctly reads the new key's saved view. |

The Workspace probe uses a memory router with the actual `/trips/:id` route shape; the expense probes rerender the
mounted component with the new trip/refresh key. Current BudgetPage does not key the expense component per trip.
PackingPage and TodoPage, however, explicitly key their checklist components by trip ID, so they remount on a trip
change. The isolated hook result is a reuse hazard, not evidence that current trip navigation mixes checklist views.

Limits: these were deterministic mocked component/hook checks, not a browser/network reproduction or a security
assessment. No API writes or real trip data were used. No lost saved data, cross-account access, stale mutation
response behavior, touch/drag problem or failure of all async loaders is established by these probes. The two expense
probes were refined to vary trip ID and refresh key independently, then rerun successfully as observations.
Independent source/evidence review found no actionable issues. Temporary diagnostic files were removed after review;
they are not passing product regression coverage.

Approved bounded fix: protect the Workspace and ExpenseTracking loaders so only the current request/context can set
data, errors or completion state; represent loading/error recovery for the current trip/request without displaying
stale trip data. Reuse the existing guarded-loading patterns rather than introduce a generic data framework. Add
permanent regression tests asserting the correct results for the reproduced cases. Preserve the workspace's shared
trip setter and existing navigation/form guards. Leave the currently protected checklist hook and broader async
refactoring out of this fix unless a real consumer needs same-mounted key changes.

No application behavior changed during diagnosis. The user subsequently approved this focused implementation.

Lightweight technical plan: use trip-keyed private content components, following the existing checklist route pattern,
so a trip change renders fresh loading state rather than old trip data/forms/errors. Preserve the existing shared
trip setter and same-trip navigation state. Guard each load effect with a cleanup flag, as existing guarded loaders
do; ExpenseTracking starts each refresh with loading state and no old load error. Only the latest active load may
write its result, error or completion state. No generic fetch abstraction or checklist change is needed. Permanent
tests will cover isolated trip/refresh races, pending loads, stale errors, successful recovery and shared trip updates.

Implemented: both loaders ignore superseded requests' successes/errors, and only the active expense load can finish
its loading state. Changing trip identity resets its content state before rendering another trip; same-trip tab
navigation retains the workspace's shared trip edits and draft guard. Expense refreshes clear prior load errors and
show loading until the current request completes. Same-trip draft values, Undo and mutation semantics are retained;
this does not introduce mutation-version protection or redesign refresh ownership.

Verification: all 106 frontend unit tests in 15 files passed, including 11 permanent loader/contract regressions.
Lint and production build passed. Two isolated Chromium tests passed: full manual trip/sign-in flow and unsaved
Add/Edit form protection across five areas. Controlled request ordering is verified by component tests, not by
network-timed browser tests. No backend code/schema changes or deployment; backend tests were not rerun. Independent
review requested multiline test formatting, now corrected; final review found no actionable issues. Affected tests,
lint and build passed again after those corrections. The user accepted and committed the fix. The checklist hook and touch/drag
investigation stay outside this chunk.

### F11 — One destructive booking path still uses a browser-default confirmation

**Priority:** P2. **Status:** Open. **Type:** Confirmed inconsistent implementation.

`requestRemove` delegates to `remove` in [`Bookings.tsx`](../../frontend/src/components/bookings/Bookings.tsx), which uses
`window.confirm` for both linked and unlinked bookings. Shared [`ConfirmDialog`](../../frontend/src/components/shared/ConfirmDialog.tsx) is already
used for linked expense/activity deletion, trip deletion and checklist reset. This is partial adoption, not a missing
dialog system. Preserve unlink/retention wording and current deletion semantics when replacing the remaining path.

### F12 — Notice appearance and semantics are not fully aligned

**Priority:** P2. **Status:** Needs decision. **Type:** Confirmed presentation difference, not a functional failure.

[`TodoChecklist.tsx`](../../frontend/src/components/todo/TodoChecklist.tsx) uses the blue `inline-notice` for retained
deadlines after trip dates change. Booking outside-trip cautions and other review warnings use yellow InlineMessage.
Some load/form errors use plain `p.form-error` rather than the shared message's alert role.

Next: agree information versus caution versus error versus optional-review semantics, then reuse shared treatments and
appropriate announcements. Do not make every related-record review yellow again; its optional panel is intentionally
distinct from a caution. Check accessibility as part of the change rather than assuming color is sufficient.

### F13 — Reconcile booking deletion requirements with the current behavior

**Priority:** P2. **Status:** Needs decision. **Type:** Confirmed documentation/implementation mismatch.

The deletion section in [booking requirements](bookings.md) describes five-second Undo for an unlinked booking.
The current booking `remove` path instead confirms and deletes immediately for all bookings, with no booking-deletion
Undo state (the payment Undo is unrelated). Do not automatically reintroduce old behavior during a structural refactor.
Confirm whether the current behavior is accepted and update the requirement, or approve a separate deletion/Undo fix.

### F14 — Dirty-form snapshot misses the controls it is protecting

**Priority:** P1. **Status:** Verified and accepted by the user. **Type:** Confirmed loss of unsaved edits.

[`useFormKeyboardInteraction`](../../frontend/src/utils/useFormKeyboardInteraction.ts) determines whether Escape/cancel
needs confirmation by comparing `new FormData(form)` snapshots. FormData includes named controls, but the inputs/selects
in [`ExpenseFormFields`](../../frontend/src/components/budget/ExpenseFormFields.tsx),
[`ActivityForm`](../../frontend/src/components/itinerary/ActivityForm.tsx), and the Packing/To-do forms inspected here
do not provide `name` attributes. Their React state changes without changing that serialized snapshot. This is
distinct from the workspace's tab-switch guard or the booking's explicit relationship-draft comparison.

#### Targeted Chromium reproduction — 24 October 2026

Five temporary browser probes used a fresh account/trip and an isolated in-memory API, not personal or deployed data.
For each area, open Add, change its name/description text, press Escape; repeat using Cancel. Then edit an existing
saved entry and repeat both actions. Every changed case closed the form without a discard confirmation.

| Area | Add + Escape | Add + Cancel | Edit + Escape | Edit + Cancel |
| --- | --- | --- | --- | --- |
| Activity | Closed, no confirmation | Closed, no confirmation | Closed, no confirmation | Closed, no confirmation |
| Planned cost | Closed, no confirmation | Closed, no confirmation | Closed, no confirmation | Closed, no confirmation |
| Expense | Closed, no confirmation | Closed, no confirmation | Closed, no confirmation | Closed, no confirmation |
| Packing | Closed, no confirmation | Closed, no confirmation | Closed, no confirmation | Closed, no confirmation |
| To-do | Closed, no confirmation | Closed, no confirmation | Closed, no confirmation | Closed, no confirmation |

All 20 changed-form cases reproduced the defect. The forms contained controls, but zero named controls; FormData was
`[]` both before and after the text edit. Five unchanged-Add Escape controls closed without prompting, as expected.
One additional Expense tab-switch check showed the separate workspace confirmation; cancelling navigation kept the
draft. API reads confirmed that existing saved records were unchanged and no new entries were saved.

Limit: this diagnosis changed text only; it did not exercise every date/select/checkbox, direct switching between
two simultaneously open edit targets, booking-specific draft guards, or every navigation route. Those remain relevant
regression cases for a fix, not additional failures claimed here. The five probe tests were observational diagnostics,
not passing regression tests for correct behavior; temporary harness/config files were removed afterward.

#### Approved fix

The user approved the focused shared fix and regression coverage after the diagnosis. The shared keyboard hook now
compares JSON-serializable controlled form state, not FormData. This includes unnamed inputs and values temporarily
hidden under More details. Callers supply a form identity: null while closed, Add, or the edited record ID. Each new
identity captures its initial values synchronously, before the deferred focus callback. Ordinary edits never replace
that baseline. A reverted form closes without confirmation; a changed form requires explicit discard, and cancelling
the dialog preserves its values. Existing focus behavior and the separate workspace navigation guard are retained.

The six consumers are Activity, Planned cost, Expense, Packing, To-do and Trip forms. This does not redesign
booking-specific draft guards, prevent switching edit targets through other controls, or add persistence for drafts.
Regression coverage checks text/date/checkbox/hidden-state values, unchanged and reverted forms, cancelling/confirming
discard, consecutive sessions and record identity changes. A Chromium regression exercises Add/Edit Escape and Cancel
in the five originally affected areas. Handling Escape also stops propagation so that the same event cannot
immediately dismiss the newly opened confirmation through its document listener.

Verification: 92 unit tests passed across the 13 runnable frontend test files before the final Escape adjustment;
the affected hook/TripForm suite then passed all 10 tests, including the added Escape/dialog regression. The obsolete
TripSetup test noted in F01 was excluded, not repaired in this chunk. Chromium passed all 20 changed Add/Edit
Escape/Cancel cases across the five areas, plus unchanged Add controls and cancel/discard confirmation behavior.
Lint and production build passed. These runs used isolated test data; no production or personal data was changed.
Independent review of the complete chunk, including documentation, reported no actionable findings.

### F15 — Checklist touch dragging cancels, and cancelled gestures can save

**Priority:** P1 for touch/cancellation correctness; live-row feedback is optional. **Status:** Q01 verified, accepted by the user and committed. Q02 deferred at the user's request.

Six temporary Chromium observation cases used fresh accounts/trips with 20 rows each and an isolated in-memory API.
Desktop viewport was 1280 x 844; touch emulation used 390 x 844 with CDP touch input (not synthetic DOM pointer events).
Each drag moved Item 01 toward the lower half of Item 03. Event traces, first-four-row positions, screenshots and
reorder response/API reads were observed. These are diagnostic cases, not passing regressions for correct behavior.

| Case | Observed behavior |
| --- | --- |
| Packing, mouse drag downward | Preview/target remain; release saves order 02, 03, 01, 04... |
| Packing, long press then straight downward touch drag | Preview appears, then native pointercancel occurs after two vertical moves. Preview disappears and order stays unchanged. |
| Packing, move sideways 70px before downward touch drag | Preview/target remain; release saves order 02, 03, 01, 04... |
| Packing, sideways-first drag then explicit touch cancellation | Final event is pointercancel, not pointerup, yet a reorder PUT succeeds and saves order 02, 03, 01, 04... |
| To-do, mouse drag downward | Preview/target remain; release saves order 02, 03, 01, 04... |
| To-do, long press then straight downward touch drag | Same native pointercancel/vanishing-preview behavior; order stays unchanged. |

During the active mouse/sideways-first drags, the first four rows retained exactly their original positions; only a
floating preview and insertion line moved. Surrounding rows do not currently preview the proposed order. The final
six-case run waited for reorder responses before reading persisted order; an initial immediate API read was not used
to infer a To-do persistence failure. A focused cancellation rerun confirmed pointercancel and the unwanted saved order.

Original source evidence: [`ChecklistLayout.css`](../../frontend/src/components/shared/ChecklistLayout.css) set
`touch-action: pan-y` on the dedicated drag handle. [`useChecklistDragReorder`](../../frontend/src/utils/useChecklistDragReorder.ts)
registered the same finish handler for pointerup and pointercancel, and called the save callback from that handler.
Both checklists share these paths. Rendering retains the original rows until the drop callback commits a new order.
This explains the observed gesture/cancellation behavior; it is not a claim of separate backend reorder bugs.

Proposed bounded approach: make the dedicated handle own drag gestures while preserving ordinary page scrolling
outside the handle; cancellation clears the drag without saving. For the separate live-feedback improvement, project
the proposed section order while dragging and save only on a valid release, keeping existing section/category limits
and save-failure recovery. Reuse the shared hook/layout and pure section-reorder helper, not separate Packing/To-do
implementations. Keep cancellation correctness distinct from optional preview/layout changes when slicing the work.

Limits: Chromium touch emulation is not physical Android/iOS verification. Group boundaries, packed/completed moves,
edge auto-scroll, pen/multi-touch, cancellation in To-do, save failures and keyboard reordering were not exercised.
The running user Debug API was left untouched after an executable-lock failure; probes used the previously verified
Release build with Testing/in-memory configuration. PLAYWRIGHT_API_PORT=5277 and PLAYWRIGHT_FRONTEND_PORT=5187 were
explicitly set for the temporary config and its inherited API/frontend origins. No application source or
user/production data changed. Independent source/evidence review supports the diagnosis and shared fix areas. The
temporary probe/config files were removed after review. The user subsequently approved Q01, as recorded below.

Approved first chunk (Q01 below): change only the shared handle gesture ownership and cancel/finish distinction.
The dedicated drag handle becomes drag-only (`touch-action: none` from pointerdown); ordinary page scrolling remains
available outside the handle. Keep the existing 200ms touch hold and mouse threshold. A matching pointercancel clears
pending/active drag state without calling the save callback; unrelated pointer events do not end the drag. Normal
pointerup still saves a valid target. Leave row projection/layout, section limits and API persistence unchanged.
Use focused hook regressions plus real Chromium mouse/touch input and API reads for both checklists, including
scrolling outside the handle. Physical-device behavior is not established by emulation alone. No new drag library or abstraction.

Q01 implementation and verification:

- Shared handle CSS now claims its gestures; pointercancel uses cleanup only, while pointerup retains the valid-drop
  save path. Other pointer IDs do not cancel the active drag. The hold delay, mouse threshold, drop geometry, API and
  row preview layout are unchanged. Normal scrolling works outside the dedicated handle.
- Three permanent hook tests cover cancellation before the hold, matching/unrelated active cancellation, and a valid
  release saving once. The active-cancel regression failed on the old code before the fix, then passed.
- Four permanent Chromium checks cover both Packing and To-do: straight vertical touch drop, cancellation without a
  reorder request, persisted order after release, swiping row content to scroll, and mouse control drags.
- Reused the existing browser-fetch test helper by extracting it unchanged from booking tests. All 11 booking browser
  cases passed after this test-only extraction; the four new drag cases also passed (15 browser tests total).
- All 109 frontend unit tests in 16 files, lint, production build and diff checks passed. The temporary Release-API
  verification config used ports 5277/5187 and isolated in-memory data, then was removed. The user's Debug API and
  personal/deployed data were untouched. Backend/schema/deployment code did not change; backend tests were not rerun.
- Independent review of the full chunk, including documentation, found no actionable issues. Try the handle on a
  physical phone: hold briefly, drag straight up/down and release, then swipe on row content to scroll. Automated
  touch emulation does not establish physical Android/iOS verification. The user subsequently confirmed the fix works
  and committed it. On 25 October 2026, the user deferred Q02 as low-value and optional; it is not required to finish
  this review and must not be picked up automatically. Revisit only if the user chooses to implement it later.

## Backend findings

These are source-level maintainability findings/candidates, not a claim that the backend has failed its previously
passing booking checks. No database, dependency or server configuration is being changed in this planning pass.

### B01 — Route coordination and review policy have become concentrated

**Priority:** P2. **Status:** Open.

[`BookingEndpoints.cs`](../../backend/Endpoints/BookingEndpoints.cs) has 699 lines and combines reservation CRUD,
payment actions, activity links, expense links, responses, normalization and change notices.
[`LinkedRecordReviews.cs`](../../backend/Services/LinkedRecordReviews.cs) has 645 lines covering graph lookup, field
projection, history, mismatch refresh, stale snapshots, validation, application and response wording. Size alone is not
a defect; the mixture of independently changing responsibilities is the extraction candidate.

Next: agree command/application boundaries for booking/payment/link operations and a clear review-policy owner. Separate
pure proposal/mapping logic from persistence/HTTP orchestration where useful. Do not replace small direct CRUD routes
with a compulsory generic service/repository hierarchy, and do not split files merely to reduce line counts.

### B02 — Legacy notices and persisted field reviews coexist

**Priority:** P2. **Status:** Needs decision. **Type:** Confirmed accumulated compatibility state.

Booking and activity endpoints still calculate comma-separated change fields and set pending flags, then invoke the
newer persisted review tracker. The review endpoint/service clear those flags as reviews resolve; the frontend has
`LegacyLinkedRecordWarning` fallbacks. Duration versus booking end fields also need explicit reciprocal aliases.
Evidence: `GetChangedFields`/`MergeChangeFields` in
[`BookingEndpoints`](../../backend/Endpoints/BookingEndpoints.cs) and
[`ItineraryEndpoints`](../../backend/Endpoints/ItineraryEndpoints.cs),
[`LinkedRecordReviewEndpoints`](../../backend/Endpoints/LinkedRecordReviewEndpoints.cs), and the review service.

Next: document the state machine and which old records still need the fallback. Prefer one canonical review lifecycle
for new mutations, with an explicit legacy-data transition if approved. Do not simply delete old flags, dismissal routes
or migration history because the new path exists: existing users may still have notices with no recoverable history.
Keep tests for current-field convergence, one-direction Keep, unrelated reciprocal changes and stale decisions.

### B03 — Mapping responsibility creates cross-service coupling

**Priority:** P2. **Status:** Open.

[`BookingExpensePayments`](../../backend/Services/BookingExpensePayments.cs) calls
`LinkedRecordReviews.ToRequest` to validate a booking projection, while the review service calls the payment helper.
The payment route does the same request conversion. Booking entity assignment/normalization and response construction
live in the endpoint; itinerary create/edit assignments repeat their field mapping. Expense response properties are
listed in both the general expense endpoint and the booking's expense result (which additionally includes Booking).

Next: assign booking mapping/proposal validation to a neutral owner and compose typed response contracts where useful.
Keep intentional response differences explicit. Avoid adding an automatic mapping library by default; the goal is fewer
places to update when adding one field, not hiding business rules in mapping conventions.

### B04 — Review listing performs repeated graph queries and validation by temporary mutation

**Priority:** P2. **Status:** Open; runtime impact needs measurement.

`GET /linked-record-reviews` loops over reviews, calls `LoadEdge` for each, invokes `ApplyAsync` against the tracked
destination to determine update eligibility, then restores its scalar values. `LoadEdge` queries the source/related
graph. This is not a demonstrated persisted mutation bug: the GET restores values and does not save.
Evidence: [`LinkedRecordReviewEndpoints.cs`](../../backend/Endpoints/LinkedRecordReviewEndpoints.cs) and
[`LinkedRecordReviews.cs`](../../backend/Services/LinkedRecordReviews.cs).

Next: measure query counts for a representative linked trip, then consider loading the required graph once and a pure
proposal builder returning values/validation results. GET and POST should use the same rules without duplicating them.
Preserve the existing snapshot/revision protections and ensure listing never changes stored records. Do not promise a
performance gain without measuring query count, response time and allocations before/after.

### B05 — Ownership verification is shared, but existence checks repeat inside routes

**Priority:** P2. **Status:** Open; redundant-query candidate, not an access-control defect.

[`TripAccess`](../../backend/Endpoints/TripAccess.cs) verifies ownership/existence before the grouped handler runs.
Several expense, packing and itinerary GET/reorder handlers then query whether that trip exists again. Other handlers
load the trip because they genuinely need its dates or flags. Those are different cases.

Next: remove only proven redundant checks or deliberately pass the owned trip through the request boundary if that
simplifies consumers. Never remove the ownership filter, per-trip item predicates or authorization tests to shorten code.

### B06 — Packing/To-do repeat checklist setup, reorder and reset workflows

**Priority:** P2. **Status:** Open.

[`PackingItemEndpoints`](../../backend/Endpoints/PackingItemEndpoints.cs) and
[`TodoItemEndpoints`](../../backend/Endpoints/TodoItemEndpoints.cs) repeat duplicate-ID rejection, per-trip ID lookup,
dictionary-based sort-order updates and similar start-empty/default/reset flow. Their state/quantity/deadline fields,
templates and reset side effects differ.

Next: consider a small reorder validator/application helper or explicit shared checklist policy, not one universal
endpoint model. Preserve trip-scoped checks, setup conflicts, To-do deadline-review reset and packing quantity semantics.

### B07 — Validation/error contracts and duplicated representations increase change spread

**Priority:** P2. **Status:** Open.

Validators return human-readable strings; frontend `getItineraryResponseFormErrors` maps some strings back to fields
using substring checks. Therefore changing backend wording can affect form-error placement. Anonymous response shapes
and handwritten frontend types/categories also need coordinated edits. Money limits exist on both sides.
Evidence: [`Validation`](../../backend/Validation),
[`itineraryForm.ts`](../../frontend/src/utils/itineraryForm.ts),
[`Contracts`](../../backend/Contracts), [`frontend types`](../../frontend/src/types).

Next: consider explicit field/error codes with display text and typed response schemas for important contracts. Decide
whether contract checks or generation justify their maintenance cost. Frontend feedback and backend validation are
legitimate separate enforcement boundaries: do not eliminate server validation to achieve one copy of every rule.

### B08 — Database-provider verification should be repeatable, not only a final manual exercise

**Priority:** P2. **Status:** Open.

[`ApiTestFixture`](../../backend/TravelAssistant.Tests/ApiTestFixture.cs) uses SQLite; the default browser configuration
uses the in-memory provider; deployment uses PostgreSQL. Booking completion separately verified PostgreSQL migrations,
upgrade/backfill and transactional browser flows in disposable databases, but that procedure is not a permanent test lane.

Next: define a small repeatable PostgreSQL integration lane for provider-specific relationships, migrations, concurrent
linking and transaction behavior. Keep quick unit/SQLite tests too. Never point automated verification at personal or
production databases, and do not assume all provider differences should disappear from production code.

### B09 — Patch vulnerable cryptography dependencies and verify runtime servicing

**Priority:** P1. **Status:** Verified and independently reviewed; user confirmed restart and committed the chunk.

Read-only reassessment on 24 October 2026: the test-project vulnerability listing still reports
`System.Security.Cryptography.Pkcs` and `System.Security.Cryptography.Xml` at 10.0.11 (two and three advisories
respectively). `dotnet nuget why` traces the test graph through the referenced backend project to
`Microsoft.AspNetCore.DataProtection.EntityFrameworkCore` -> `Microsoft.AspNetCore.DataProtection` -> Xml -> Pkcs.
Microsoft lists 10.0.13 as patched: [Pkcs advisory](https://github.com/advisories/GHSA-846f-f764-76mx),
[Xml advisory](https://github.com/advisories/GHSA-r955-8q5j-3h83). These dependency findings do not establish an
exploitable request path in this app.

Original assessment limits: some restore/audit requests reported NU1900 feed-access failures. The web-project listing
reported no vulnerable packages and no standalone dependency paths for these packages, unlike the test graph. Do not
interpret that as a complete successful audit or proof of a safe runtime. Local `dotnet --list-runtimes` reported .NET
and ASP.NET Core 10.0.8 at assessment time. The Dockerfile uses floating 10.0 build/runtime tags; deployed image/runtime
versions were not inspected. Updating package references alone does not update the installed shared runtime or a
deployed container.

Approved bounded chunk: update the six existing Microsoft ASP.NET Core/EF Core references in the backend and the
two matching references in its test project to 10.0.13, then restore and inspect the actual resolved graph. Leave
Npgsql and test-runner versions alone; no new direct cryptography pins or application/schema
changes by default. Restore found that ASP.NET Core OpenApi 10.0.13 requires Microsoft.OpenApi >= 2.12.2 and < 3.0.0,
so raise the existing direct reference from 2.7.5 to the minimum 2.12.2 as a required compatibility adjustment,
not a major-version upgrade. Verify the two cryptography versions and advisories, run Release backend tests and build, and
check authentication/data-protection behavior through existing coverage. Report unavailable vulnerability data
explicitly. The user also authorized a local .NET servicing update; inspect the available stable .NET 10 SDK/runtime
and verify versions after installation. Container rebuilding/deployment is not authorized. No package references or
runtime installations changed during the original assessment; the approved implementation follows it.

Implementation and verification:

- Updated all eight scoped Microsoft references to 10.0.13 and the required Microsoft.OpenApi reference to 2.12.2.
  Npgsql and test-runner references are unchanged. No application logic, schema or deployment files changed.
- Installed Microsoft .NET SDK 10.0.402 using the Microsoft WinGet package; `dotnet --version` selects it.
  .NET, ASP.NET Core and Windows Desktop runtimes 10.0.13 are installed. Old SDK/runtime versions remain installed;
  they were not separately uninstalled. The installer requested a Windows restart; the user subsequently confirmed
  restarting and committing the chunk. A follow-up check still selects SDK 10.0.402 and lists runtimes 10.0.13.
- Fresh no-cache restore succeeded. Dependency tracing confirms Xml and Pkcs resolve to 10.0.13. Both project
  vulnerability listings (including transitive dependencies) reported no vulnerable packages from NuGet, without
  NU1900 failures in this verification run. This is a point-in-time package audit, not a complete security assessment.
- All 107 backend tests passed; Release build passed with zero warnings/errors. Added one isolated SQLite test for
  database-backed Data Protection keys surviving service-provider recreation because existing API tests use an
  ephemeral provider. Its focused run confirmed .NET runtime 10.0.13. This does not prove production cookie continuity
  across an upgrade or PostgreSQL-specific behavior.
- The existing Chromium full-trip smoke test passed, including registration, authenticated operations, sign-out and
  sign-in, using an isolated in-memory API. Production/local trip data and deployment were not touched.
- Independent review found no actionable issues. The user confirmed the requested Windows restart afterward.

## Unused code, obsolete paths and accumulated patches

### C01 — Concrete cleanup candidates, not deletion approval

**Priority:** P2. **Status:** Open; confirm references/consumers before deleting.

- `initialNewExpenseForm` in [`types/expense.ts`](../../frontend/src/types/expense.ts) has no use found in the inspected
  app/tests; actual consumers construct their own drafts. Decide whether it is obsolete or should be the canonical
  factory, noting that expense dates/defaults differ by entry point.
- [`LinkedRecordReviews.Response`](../../backend/Services/LinkedRecordReviews.cs) still calculates an `UpdateLabel`
  string, and the frontend review type and test fixture retain it. Current UI buttons use fixed Update/Make unscheduled
  labels, not that property. Check contract consumers before removing this cross-stack leftover.
- Starter [`react.svg`](../../frontend/src/assets/react.svg) and [`vite.svg`](../../frontend/src/assets/vite.svg) have no
  app/index references found in the source search. The actual icon in `index.html` is `/favicon.svg`; retain that icon
  and assess the user-provided hero image separately rather than treating it as disposable starter material. An unused
  starter asset is not evidence that an arbitrary image can be deleted.
- F01's obsolete TripSetup test was migrated to current TripDetails coverage, preserving its valuable expectations.

The compiler/linter already check unused local symbols, but that does not establish unused exports, styles, assets or
response fields. For each candidate: check imports, routes, dynamic class construction, build/public references, tests
and external consumers; confirm with the relevant build/tests; remove in a small recoverable commit. Treat dependency
removal separately, considering CLI/build/test/migration usage rather than just source imports.
For unused CSS, check JSX and dynamically composed class names plus representative rendered states before removing a
selector. Static text search or one page's coverage alone is not sufficient proof that a style is unused app-wide.

### C02 — Review evolved workflows as a whole instead of adding another branch

**Priority:** P2. **Status:** Open; redesign only after the corresponding behavior is agreed.

Concrete accumulation points: B02's old/new review states; B04's preview-through-application path; F05's booking
coordinator; F09's event-based plus local-array refresh triggers; B07's text-to-field error parsing; and retained
`UpdateLabel` generation after the UI switched to short fixed action labels.

For each, write the current supported behavior and exceptional cases first, then compare a simpler coherent design
with incremental patching. Retain proven regression tests. A historical-looking branch is not automatically dead:
compatibility, stale updates, refunds, deletion and partial schedules explain some real complexity. State machines or
explicit domain policies can reduce scattered conditions; more generic abstractions can also make them worse.

### C03 — Additional complexity checks for every proposed cleanup

| Situation                              | What to look for                                                                            | Guardrail                                                                                                          |
|----------------------------------------|---------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| Derived data stored/copied repeatedly  | Payment totals, schedule/duration aliases, mirrored warning flags                           | Decide ownership and migration first; retain independently meaningful values.                                      |
| Too many booleans/invalid combinations | Add/edit/link/create/payment/review states in a feature                                     | Model actual allowed transitions explicitly; do not build a generic state-machine framework without need.          |
| Mixed concerns                         | UI wording in API proposals; mapping inside review logic; HTTP inside business policy       | Give each rule a clear owner and keep adapters thin where useful.                                                  |
| Unnecessary indirection                | Wrappers that only rename a call; abstractions with one consumer and many options           | Keep a simple function if it makes the call site clearer; one consumer alone is not a reason to delete a boundary. |
| Over-generalization                    | Universal CRUD, form, list or checklist components full of feature flags                    | Share stable common behavior, keep intentional differences local.                                                  |
| Expensive repeated work                | All-trip reloads, query-per-review graph loading, duplicate projections                     | Measure first; optimize the costly path without losing consistency.                                                |
| Async/transaction ambiguity            | Multiple writers, stale responses, unclear commit/rollback ownership                        | Preserve cancellation/version guards and atomic cross-record writes.                                               |
| Stringly typed contracts               | Magic field names, comma-separated flags, UI parsing server prose                           | Prefer explicit schemas/enums/codes where they improve change safety.                                              |
| Inconsistent edge-case policy          | Null/unknown versus zero/free, timezone/date boundaries, money precision, deletion outcomes | Record invariants and test representative boundaries, not every implementation detail.                             |
| Hard-to-test dependencies              | Business decisions require tracked EF entities or a browser render                          | Isolate pure decisions where useful; test adapters against the real boundary too.                                  |
| Historical documentation/tests         | Requirements describe superseded behavior or tests assert removed screens                   | Reconcile against accepted behavior; do not change behavior just to satisfy obsolete tests.                        |

These are review questions, not assertions that every listed problem currently exists in every module. Security,
privacy, accessibility and recovery/error handling are part of the review: removing protective code is not simplification.

## Why small changes can produce large diffs

Some spread is legitimate: visible wording changes require interaction-test updates, a new API field needs matching
client/server contracts, and behavior changes require verification and requirements updates. The expense action rename,
for example, changed one production action block but multiple existing test selectors. File count alone is not a quality
measure, and tests/docs should not be omitted to make a diff look small.

Avoidable spread also exists: F02/F04 mean a text treatment can have multiple style owners; F05 mixes workflows in one
component; B02/B03 spread relationship state and mapping rules; F09 duplicates refresh ownership; B07 couples validation
wording to client field selection. These are evidence-backed reasons to improve boundaries rather than simply type less.

For each chunk, note expected files/consumers before coding. If a supposedly local request reaches unexpected features,
pause and inspect the dependency rather than adding overrides everywhere. Use shared styles/controls and test helpers
for repeated mechanics, but retain independent assertions of important labels/behavior. Avoid tests that import the same
implementation constant as their expected answer and thereby stop checking anything independently.

Target outcome: a style-only change usually has one style owner; a domain-rule change has one policy owner and explicit
adapters; tests still cover its affected consumers. This is not a fixed maximum file count or a demand for one-line code.
Prefer fewer concepts, clearer state and fewer edit locations over fewer characters.

## Adopted architecture-first change process

The user approved the proportional workflow and instruction cleanup. The authoritative repository-wide rules are in
[`AGENTS.md`](../../AGENTS.md). Task procedures are maintained in the project skills rather than duplicated here:

- [Product planning](../../.agents/skills/plan-feature/SKILL.md).
- [Technical planning and independent architecture review](../../.agents/skills/plan-architecture/SKILL.md).
- [Implementation, verification and handoff](../../.agents/skills/implement-feature/SKILL.md).
- [Behavior-preserving refactoring](../../.agents/skills/refactor-code/SKILL.md).
- [Independent chunk review](../../.agents/skills/review-feature/SKILL.md).

Technical decisions for a feature belong with its requirements; maintenance decisions can stay under the relevant
finding here. This adopts the process, not any unapproved product redesign or broad refactoring in this audit.

## Backlog reconciliation

These comparisons describe the audit-time implementation. Use the agreed decisions above for future behavior;
older one-time-note or unscheduling proposals are not requirements for the redesign.

| Backlog topic                                          | Current evidence                                                                                                                      | Follow-up                                                                                                                 |
|--------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------|
| Saved booking/activity detail alignment                | Shared `ExpandedCardDetails`, aligned-detail grid and equivalent relationship value columns already exist.                            | Mark the original implementation item verified/done after visual confirmation; retain any new density redesign under D04. |
| Planned cost changes offer expense updates             | Both planned costs and expenses use persisted LinkedRecordWarnings, including Update/Keep.                                            | Reconcile the older one-time-note wording with the implemented review mechanism rather than adding another prompt.        |
| Expense category date ordering                         | Category path does not call the existing sorter.                                                                                      | Still open: F08.                                                                                                          |
| Remembered views                                       | Checklist grouping and card/panel expansion persist; expense grouping does not.                                                       | Partially implemented: F07, not an app-wide absence of persistence.                                                       |
| Planned budget Ungrouped                               | PlannedBudget renders category sections without a grouping control.                                                                   | Still open; implement after D07/defaults are agreed.                                                                      |
| Planned cost to expense navigation                     | PlannedBudget still renders Added and Undo, not a named expense link.                                                                 | Still open, separate from bookings.                                                                                       |
| Expense related-record disclosure                      | Expense data carries both IDs and deletion handles both, but saved rows do not expose the proposed backlinks disclosure.              | Still open; design both-source display without losing either relationship.                                                |
| Group collapse/custom category order/heading totals    | GroupHeading is shared; ordering/collapse controls and alignment decisions remain.                                                    | Still open: D07.                                                                                                          |
| Packing drag/touch issues | Q01 shared touch/cancellation fix is verified, user-accepted and committed. | Q02 live row feedback is deferred/optional; reopen only at the user's request. |
| Global confirmations                                   | Shared accessible dialog already exists; booking removal still has one native path.                                                   | Partially implemented: F11.                                                                                               |
| Activity reminder after trip-date changes              | Activity linked-record reviews exist, but Itinerary does not render the general trip-date-change reminder described in the backlog.   | Still open; distinguish it from a linked booking's schedule warning and agree persistence/dismissal behavior.             |
| Darker text                                            | Booking summary and expanded detail colors were changed; other metadata roles remain separate.                                        | Partially implemented: F02/F04, not a request to undo the current palette.                                                |
| Separate Budget/Expenses and savings/spending progress | Future direction is documented; current TripBudget still mounts both.                                                                 | Needs product requirements: D07, not a pure refactor.                                                                     |

## Decisions and completion log

- **Agreed process:** D08 adopted; workflow rules/procedures linked above. Product redesigns still need agreement.
- **F01:** test-only migration committed; full frontend unit suite, lint and production build passed, with no
  actionable independent review findings.
- **B09:** package patches and local .NET servicing verified/reviewed; user restarted and committed. Deployment unchanged.
- **F10:** loader fixes and permanent regressions verified/reviewed; user accepted and committed.
- **Q01/F15:** touch/cancellation fix verified and independently reviewed; user accepted and committed.
- **Q02:** deferred/optional at the user's request; do not automatically reopen live-row feedback.
- **Approved follow-up implementation:** F14 shared unsaved-form protection and focused regression coverage.
  Verification and independent review passed; user accepted the fix. No broader new
  runtime/security/performance verification is implied.
  The original temporary diagnostic files were removed; permanent regression tests accompany the fix.
- **27 October planning update:** Q03 behavior and the overall order are agreed above. Exact architecture,
  implementation slices and remaining UI decisions are still open. Budget/Expenses redesign follows this review
  and may be postponed until after shared trips. This update changes documentation only.
