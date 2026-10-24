# Application review, architecture and improvements

## Status and scope

Initial source audit: **24 October 2026**, on `dev` after the booking merge.

This is the working register for the post-booking review. Findings are recorded, not approved for implementation.
No application code, styles, database behavior or dependencies were changed during the audit. Agree product decisions
before implementation; use separate, reviewable chunks rather than a frontend rewrite.

Scope: frontend workspace navigation and Details, Itinerary, Bookings, Budget/Expenses, To-do and Packing; shared
controls, styles and state helpers; supporting dashboard/account patterns and test readiness. Backend scope includes
route/application-service boundaries, validation/contracts, review/payment logic, ownership/query patterns, database
constraints/migrations and test-provider coverage. Sources were inspected directly, not merely inferred from UI behavior.
This is not a fresh rendered visual/accessibility audit, a performance profile, a dependency security scan or a new
full test run. Previously reported test/advisory results are identified separately below.
Subsequent targeted diagnosis: F14 was reproduced in Chromium on 24 October 2026, as recorded under that finding;
the rest of the audit's unverified risks remain source-level observations.
Approved follow-up: the focused F14 fix is verified on `feature/unsaved-form-protection`, awaiting user acceptance.

The [maintenance backlog](../maintenance-backlog.md) remains the broader issue list. This document supplies evidence,
dependencies and decisions for this review; cross-reference IDs instead of creating conflicting copies of requirements.

### How to maintain this register

- Keep finding IDs stable. Statuses: **Open**, **Needs reproduction**, **Needs decision**, **Approved**, **In progress**,
  **Verified**, **Deferred**. Approval of this audit is not approval of every proposed extraction or design.
- When agreeing a decision, record the chosen behavior and acceptance checks under its ID before coding.
- When implementing, record the branch/chunk and verification next to the ID; update the corresponding backlog item.
- Do not close a user-reported visual/touch issue just because source review or unit tests pass.

## Summary

The frontend already has a substantial shared foundation. The main issues are uneven adoption, duplicated lifecycle
coordination and very large feature components, not an absence of reusable components.
The backend likewise already has shared ownership, validation and payment helpers, but accumulated compatibility state,
mapping responsibilities and review-query behavior deserve a deliberate redesign review before further extensions.

Suggested planning order:

1. Establish a trustworthy verification baseline and reproduce the identified state risks.
2. Decide shared-data/automatic-update behavior using flight, hotel and paid-activity examples (**D01**).
3. Agree interaction and visual direction (**D02–D07**) using representative desktop/mobile examples.
4. Approve an architecture/change-impact brief and small implementation chunks. Extract only the shared foundations needed.
5. Refactor behavior-preservingly, then apply agreed improvements, with focused regression checks and user review.

The test baseline can be repaired independently while product decisions are discussed. Do not start a broad shared
data layer, replace every card, introduce a new state library or build a universal form/list component by default.

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

**Priority:** P1. **Status:** Open. **Type:** Confirmed obsolete test, not a booking regression.

[`TripSetup.test.tsx`](../../frontend/tests/features/setup/TripSetup.test.tsx) imports
`src/components/setup/TripSetup`, which no longer exists. The final booking verification passed 86 runnable frontend
tests but failed collection of this suite; the obsolete import is still present in this audit snapshot.

Next: map its useful expectations onto the current [`TripDetails`](../../frontend/src/components/details/TripDetails.tsx)
and [`TripForm`](../../frontend/src/components/trips/TripForm.tsx) coverage, replacing or removing obsolete tests without
silently losing important behavior checks. Verify the full frontend suite, not just selected feature files.

Existing backend dependency advisories are a separate maintenance task. They were reported during booking verification;
this audit did not re-scan advisories. Recheck current versions/advisories and compatible upgrades before changing them.

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

### F10 — Async loading and storage-key transitions deserve targeted regressions

**Priority:** P2. **Status:** Needs reproduction. **Type:** Source-level risks, not reproduced bugs.

[`Workspace.tsx`](../../frontend/src/pages/Workspace.tsx) loads by route ID without an active-request guard or resetting
the previous error/trip at load start. Expense loading also assigns asynchronous results directly. Booking expense
loading and the review hook already demonstrate guarded loading patterns. Separately, `useChecklistView` reads storage
only in its state initializer; if its key changes without remounting, it does not read the new key's preference.

Next: test delayed trip A/trip B responses, failed-load recovery, and a checklist storage-key change on the same mounted
component. Fix demonstrated failures before generalizing data hooks; avoid claiming a new race was observed in the UI.

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

**Priority:** P1. **Status:** Fix verified; awaiting user acceptance. **Type:** Confirmed loss of unsaved edits.

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
- F01's obsolete TripSetup test is a known stale path. Replace its valuable expectations, not merely the failing file.

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

| Situation | What to look for | Guardrail |
| --- | --- | --- |
| Derived data stored/copied repeatedly | Payment totals, schedule/duration aliases, mirrored warning flags | Decide ownership and migration first; retain independently meaningful values. |
| Too many booleans/invalid combinations | Add/edit/link/create/payment/review states in a feature | Model actual allowed transitions explicitly; do not build a generic state-machine framework without need. |
| Mixed concerns | UI wording in API proposals; mapping inside review logic; HTTP inside business policy | Give each rule a clear owner and keep adapters thin where useful. |
| Unnecessary indirection | Wrappers that only rename a call; abstractions with one consumer and many options | Keep a simple function if it makes the call site clearer; one consumer alone is not a reason to delete a boundary. |
| Over-generalization | Universal CRUD, form, list or checklist components full of feature flags | Share stable common behavior, keep intentional differences local. |
| Expensive repeated work | All-trip reloads, query-per-review graph loading, duplicate projections | Measure first; optimize the costly path without losing consistency. |
| Async/transaction ambiguity | Multiple writers, stale responses, unclear commit/rollback ownership | Preserve cancellation/version guards and atomic cross-record writes. |
| Stringly typed contracts | Magic field names, comma-separated flags, UI parsing server prose | Prefer explicit schemas/enums/codes where they improve change safety. |
| Inconsistent edge-case policy | Null/unknown versus zero/free, timezone/date boundaries, money precision, deletion outcomes | Record invariants and test representative boundaries, not every implementation detail. |
| Hard-to-test dependencies | Business decisions require tracked EF entities or a browser render | Isolate pure decisions where useful; test adapters against the real boundary too. |
| Historical documentation/tests | Requirements describe superseded behavior or tests assert removed screens | Reconcile against accepted behavior; do not change behavior just to satisfy obsolete tests. |

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

## Proposed architecture-first change process

This is a process proposal for approval, not a new mandatory framework or permission to edit instruction files.

### Before implementation

For cross-feature behavior, agree a short change/architecture brief containing:

1. **Outcome and non-goals:** traveller-visible behavior, examples, acceptance checks and what stays unchanged.
2. **Data ownership/invariants:** canonical versus derived/independent fields, valid states and allowed transitions.
3. **Boundaries:** UI display components, workflow/state owner, client API contract, server command/policy, persistence.
   Sketch the request/update flow and identify existing code to reuse before adding a new component/service.
4. **Impact and alternatives:** expected consumers/files, compatibility needs, one simpler alternative and tradeoffs.
5. **Failure/concurrency design:** validation, ownership, loading/error/retry, Undo/deletion, stale writes and refresh.
6. **Migration and removal:** old data/routes/flags and consumers, rollout compatibility, cleanup criteria and rollback.
7. **Verification/chunks:** meaningful tests, real-provider checks where relevant, independent review and manual checks.

Use proportional effort: a local label/style fix generally needs only a reuse/impact check, not an architecture document.
A cross-record payment rule or shared-data redesign needs the full brief. Record lasting structural choices and reasons
in a short decision record; do not try to design the entire future app up front.

### During and after implementation

- Separate behavior-preserving extraction/cleanup from behavior changes when practical. Refactor the affected path
  before layering another extension onto it if the current structure obstructs the agreed change.
- Implement one complete vertical slice, not speculative framework scaffolding for every future feature.
- Revisit the impact plan if unexpected coupling appears; explain why the additional edits are necessary.
- Remove superseded local implementations in the same approved scope, or record why compatibility requires retention
  and the condition for later removal. Do not leave two active paths indefinitely without an explicit owner/transition.
- Review simplicity as well as correctness: could the same behavior use fewer states, branches, duplicated rules or
  requests? Are safeguards being preserved? Are components/services doing one coherent job?
- Update the audit IDs/requirements, verify affected consumers, obtain user feedback and stop at the manual commit
  checkpoint. No branch merge, push or deployment is implied.

## Product decisions that must not be disguised as refactoring

| ID | Status | Decision to make | Evidence/context |
| --- | --- | --- | --- |
| D01 | Needs decision | Keep distinct booking/activity/expense records, share fields, or change the model? Which values inherit automatically, and how do intentional differences and existing links behave? | Current separate models in `backend/Models`; booking/activity mapping in `utils/bookingActivityLinks.ts` and `utils/itineraryForm.ts`; explicit reviews in `backend/Services/LinkedRecordReviews.cs`. Reservation total, paid/refunded money and expense date are not interchangeable. One booking can cover multiple activities. |
| D02 | Needs decision | Quicker creation without a full form; one right-side Add link menu with new/existing activity/expense choices; changing existing journey part without unlinking. | Current Bookings workflow and the user's recorded proposal. Decide eligibility, outbound/return/both, missing payment inputs, Undo and mobile placement. |
| D03 | Needs decision | Which fields can be edited inline, using what interaction and save/cancel rules? | User proposed status pills and double-click; consider discoverable single-click/tap and keyboard alternatives. Full-form editing remains useful for multiple changes. |
| D04 | Needs decision | Compact divider-separated rows versus cards; how expanded details, forms and reviews fit without nested boxes. | `layout.css` distinguishes compact rows and card lists; SectionCard, FormSurface and RelatedRecordReviews add further surfaces. Nesting is observable; its preferred replacement needs mockups, not a blanket removal of every border. |
| D05 | Needs decision | Final review-panel appearance and information hierarchy. | Current shared pink disclosure, light-blue review background and per-entry actions are a working version, not final visual acceptance. Decide after D01 and D04. |
| D06 | Needs decision | Replace the user-facing word Itinerary. | Workspace navigation, headings and creation/link actions; Schedule, Activities and Trip plan discussed. Schedule is a suggestion, not an agreed rename or API-route migration. |
| D07 | Needs decision | Group collapse/order, category totals/actions, and eventual separate Budget/Expenses tabs with progress indicators. | GroupHeading has title/actions/summary but no collapse state; TripBudget combines both sections. Define saved category order independently per page and distinguish savings, spending and budget denominators. See the updated roadmap's Better budget control section. |
| D08 | Needs decision | Adopt the proportional architecture-first process above, including change-impact and obsolete-path removal checks. | Agree when a short local impact check is enough and when cross-feature work needs an architecture brief/decision record. Do not modify working agreements automatically. |

Working acceptance template for D01: for each flight/hotel/paid-activity example, list the owner of schedule, location,
total price, payment/refund values and payment date; what happens on creation, link, edit, override, cancellation,
unlink and deletion; and how existing records migrate without losing intentional differences or double-counting money.

## Backlog reconciliation

These are audit classifications, not silent changes to existing backlog entries.

| Backlog topic | Current evidence | Follow-up |
| --- | --- | --- |
| Saved booking/activity detail alignment | Shared `ExpandedCardDetails`, aligned-detail grid and equivalent relationship value columns already exist. | Mark the original implementation item verified/done after visual confirmation; retain any new density redesign under D04. |
| Planned cost changes offer expense updates | Both planned costs and expenses use persisted LinkedRecordWarnings, including Update/Keep. | Reconcile the older one-time-note wording with the implemented review mechanism rather than adding another prompt. |
| Expense category date ordering | Category path does not call the existing sorter. | Still open: F08. |
| Remembered views | Checklist grouping and card/panel expansion persist; expense grouping does not. | Partially implemented: F07, not an app-wide absence of persistence. |
| Planned budget Ungrouped | PlannedBudget renders category sections without a grouping control. | Still open; implement after D07/defaults are agreed. |
| Planned cost to expense navigation | PlannedBudget still renders Added and Undo, not a named expense link. | Still open, separate from bookings. |
| Expense related-record disclosure | Expense data carries both IDs and deletion handles both, but saved rows do not expose the proposed backlinks disclosure. | Still open; design both-source display without losing either relationship. |
| Group collapse/custom category order/heading totals | GroupHeading is shared; ordering/collapse controls and alignment decisions remain. | Still open: D07. |
| Packing drag/touch issues | Shared drag hook exists and includes delayed touch start; this does not establish that target placement/live row movement is correct. | Reproduce on touch and pointer devices before choosing a fix. Preserve shared To-do behavior. |
| Global confirmations | Shared accessible dialog already exists; booking removal still has one native path. | Partially implemented: F11. |
| Activity reminder after trip-date changes | Activity linked-record reviews exist, but Itinerary does not render the general trip-date-change reminder described in the backlog. | Still open; distinguish it from a linked booking's schedule warning and agree persistence/dismissal behavior. |
| Darker text | Booking summary and expanded detail colors were changed; other metadata roles remain separate. | Partially implemented: F02/F04, not a request to undo the current palette. |
| Separate Budget/Expenses and savings/spending progress | Future direction is documented; current TripBudget still mounts both. | Needs product requirements: D07, not a pure refactor. |

## Proposed review/implementation sequence

| Step | Work | Gate before implementation |
| --- | --- | --- |
| 1 | Complete F14 verification/user acceptance; repair obsolete test coverage; reassess dependency advisories; reproduce F10 and touch issues. | Approve each maintenance chunk; no UI redesign needed. |
| 2 | Agree D01 using the concrete examples above. | Explicit decisions on ownership, updates, intentional overrides and existing records. |
| 3 | Mock up D02–D06, plus common text/control roles. | User chooses the interaction/layout direction, including mobile and keyboard use. |
| 4 | Extract required tokens/control variants and focused feature sections; consolidate equivalent Undo/refresh behavior where justified. | Preserve existing behavior with regression checks before applying product changes. |
| 5 | Implement approved relationship and compact-layout improvements in small vertical slices. | Reuse shared components across booking/activity rather than implementing each twice. |
| 6 | Deliver grouping/navigation/budget/packing improvements separately, following D07. | Defined persistence/sorting rules and touch verification; no automatic scope expansion. |

For every chunk: identify affected consumers, keep tests focused on meaningful behavior, check refresh/Undo/error paths,
verify mobile/keyboard interactions, obtain independent review and user feedback, and pause at the manual commit checkpoint.

## Decisions and completion log

- **Agreed process:** audit first; discuss behavior and visual direction; approve small implementation chunks afterward.
- **Approved follow-up implementation:** F14 shared unsaved-form protection and focused regression coverage.
  Verification and independent review passed; user acceptance remains. No broader new
  runtime/security/performance verification is implied.
  The original temporary diagnostic files were removed; permanent regression tests accompany the fix.
- **Next discussion:** agree the architecture-first process and maintenance priorities, then D01 and representative
  interaction/layout examples. Backend/cleanup proposals and all product redesigns remain open until explicitly approved.
