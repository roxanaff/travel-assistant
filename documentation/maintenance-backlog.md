# Maintenance Backlog

This is the non-feature-specific backlog for bugs, small usability improvements, accessibility work, technical quality
work, and documentation corrections.

Items remain here while open. Delete an item when it is no longer relevant, or move it to **Done** after it is
completed. Promote an item into a feature's requirements only when it becomes necessary to complete that feature.

Priority labels describe urgency:

- **P0 — Blocking:** prevents development, data safety, security, or a core user flow from working. Fix immediately
  rather than waiting for a backlog pass.
- **P1 — Important:** clear user impact or likely regression; schedule in the next suitable work slice.
- **P2 — Normal:** useful improvement, but not urgent.
- **P3 — Nice to have:** record it so it is not forgotten; revisit when relevant.

## Bugs and regressions

Add confirmed bugs here with a concise description, affected area, reproduction steps when known, and a priority.

## Usability and interaction improvements

- [P2] Expenses — Within each category, keep entries ordered by expense date. Add user-selectable sorting options
  later; implement this separately from the booking work.
- [P1] Workspace view state — Remember view choices when moving between workspace tabs instead of resetting them.
  Expenses currently resets Group by to Category when the page is remounted. Extend the established checklist
  preference pattern as appropriate. Include grouping, collapsed groups, and custom category order in the design;
  decide preference scope and persistence before implementation.
- [P2] Planned budget — Add **Ungrouped** viewing alongside categories, and remember the selected grouping. Documentation
  only for now; implement after the booking work.
- [P2] Planned cost to expense — Replace **Added** with a navigation control naming the created expense, alongside
  **Undo**. Selecting it should scroll to and briefly highlight that expense. This is separate maintenance work,
  not part of booking-feature completion.
- [P2] Expenses — Add an inline disclosure for related records, showing the linked planned cost and/or booking with
  navigation controls. A shared expense can have both relationships. Proposed treatment is two clearly labelled rows
  within one disclosure, rather than choosing a single source. Final disclosure layout is still to be decided;
  documentation only until the booking work is complete.
- [P2] Shared grouped lists — Allow category and date groups to expand/collapse wherever they appear in workspace
  tabs, including expense categories. Keep headings and any totals visible when collapsed. Allow manual category
  ordering, such as Accommodation above Travel to/from. Date groups retain their chronological ordering unless a
  different behavior is explicitly agreed. Budget and Expenses start with the same default category order, but each
  saves its own custom order independently; reordering one does not reorder the other, including after the tab split.
- [P2] Saved detail alignment — In expanded activity and booking cards, align values and related-record controls to a
  shared starting position after the labels, regardless of label length. Long notes and other wrapped values continue
  beneath the value column rather than beneath the label. Align relationship controls vertically with their label;
  allow a stacked layout on narrow screens. Keep create/edit form layouts unchanged.
- [P2] Budget group headings — Align category totals with item amounts and reserve a consistent action area aligned
  with item edit/delete controls. Design compact group expand/collapse and category move-up/move-down controls in that
  area. Final control order, add-item placement, and whether move controls use a separate reorder mode remain open.
- [P2] Linked financial values — The former one-time planned-cost/expense update-note proposal is superseded by
  the agreed shared-data design. Expected/confirmed total and Paid/Refunded retain different meanings; use the
  [review plan](requirements/app-review-and-improvements.md#decided-shared-data-and-relationships--d01), not an
  extra synchronization prompt. Implementation remains part of the approved-chunk workflow.
- [P3 — Deferred/optional] Packing/To-do — Live row movement while dragging was skipped by the user on 25 October
  2026 because it adds little value. Keep the current preview; this is not required for review completion. Reopen only
  if the user requests it. Any later implementation should use the shared path (audit F15/Q02).
- [P3] Packing — Consider making the Group by control apply to the whole page, rather than separately to the To pack and
  Packed sections.
- [P2] Shared UI — Replace browser-default destructive-action confirmations with accessible, app-styled confirmation
  dialogs.
- [P2] Outside-trip dates — Bookings and activities retain real scheduled dates outside the trip, with the agreed
  Update trip dates / Edit item dates / Keep as is warning. Preserve dated activity visibility. The exact question,
  boundary-expansion and focus behavior are owned by the
  [review plan](requirements/app-review-and-improvements.md#allow-dates-outside-the-trip).

## Post-booking review topics

Evidence, implementation overlap, open decisions and the proposed sequence are tracked in the
[application review and improvements audit](requirements/app-review-and-improvements.md). That register does not
authorize implementation; reconcile these backlog items when each decision or change is accepted.

The first booking release is complete. Decisions from the follow-up discussion are now recorded in the review plan;
use that plan for current scope/order. Entries here are pointers, not a second set of conflicting requirements.
Agreed requirements do not themselves authorize every implementation chunk.

- [P2] Linked data — Small shared core with optional activity/booking/budget/expense parts is the agreed direction.
  Shared values are stored once, standalone entries remain possible, and duplicate expenses are prevented. Exact
  tables, APIs, permissions and migration/reset steps still need technical planning and independent review. See
  [D01](requirements/app-review-and-improvements.md#decided-shared-data-and-relationships--d01).
- [P2] Related-entry creation — Explore clearer, more visible Add to schedule/activity and Add expense actions from a
  booking, creating a sensible entry without the full form where safe, with Undo and optional editing. Decide how
  outbound/return/both are selected and when recording spending still requires an amount/payment choice.
- [P2] Related-entry actions — Replace the four separate activity/expense create/link controls with one **Add link**
  disclosure on the right of the expanded booking view. It opens four choices: new activity, existing activity,
  new expense and existing expense. Consider existing eligibility rules and narrow-screen placement when designing
  the menu. Deferred improvement only; keep the current controls until implementation is approved.
- [P2] Inline editing — Explore changing status pills and selected names, dates or money values without opening the
  full form. User suggested double-click; discuss discoverable single-click/tap alternatives, keyboard access,
  save/cancel behavior and which fields still need a full form. No interaction choice is final yet.
- [P2] Warning consistency — Review the blue To-do notice after trip dates change; consider the shared yellow caution
  treatment because it asks the traveller to review retained deadlines. Review notice semantics consistently across tabs.
- [P2] Text readability — Darken summary and expanded-detail text; reserve lighter grey for secondary hints and
  placeholders. Agree the shared text hierarchy rather than adjusting individual cards independently. Centralise
  semantic colours for summary text, detail text and muted hints, and reuse them across booking/activity cards and
  equivalent entries. Remove scattered feature-specific colour overrides so each text role can be adjusted in one
  place without changing every grey element globally.
- [P2] Layout density — Remove outer page cards first and retain individual item boxes initially. Review the result
  on mobile/desktop before considering divider-separated item rows. Improve mobile page navigation; its replacement
  still needs design. Avoid adding nested financial boxes for related-entry details.
- [P2] Related-review presentation — Revisit the current pink disclosure and neutral review panel after booking
  completion. The current appearance is a working version, not the user's final visual acceptance.
- [P2] Naming — Replace the user-facing word Itinerary with a clearer name. Schedule, Activities and Trip plan were
  discussed; Schedule is the current suggestion, not an agreed rename. Keep naming consistent in navigation,
  headings and related-entry actions after a choice is made.

- [P3] App-wide Undo/Redo — Future Ctrl+Z / Ctrl+Y for supported actions. Preserve native text undo inside inputs;
  changes to linked records must reverse together and redo safely. Not part of the current review scope.

## Technical and quality improvements

Add accessibility refinements, performance work, test-coverage gaps, dependency upgrades, error-handling improvements,
and documentation corrections here.

## Done

- Packing/To-do touch dragging — Shared handle gestures no longer require sideways movement, and pointer cancellation
  clears without saving. All 109 frontend tests, lint/build and 15 browser checks pass; user accepted and committed.
  Live row movement is deferred/optional. See [audit F15](requirements/app-review-and-improvements.md#f15--checklist-touch-dragging-cancels-and-cancelled-gestures-can-save).

- Stale trip/expense loading — Trip-keyed content and current-request guards prevent old results/errors from
  replacing the current context. Successful loads recover from prior errors. All 106 frontend tests, lint/build,
  two browser checks passed; user accepted and committed. Checklist routing/hook unchanged. See
  [audit F10](requirements/app-review-and-improvements.md#f10--stale-requests-and-failed-load-recovery-protected-checklist-key-transitions).

- Backend dependency servicing — Scoped Microsoft references updated to 10.0.13, with required Microsoft.OpenApi
  compatibility update to 2.12.2. Both package audits are clear; 107 backend tests, Release build and browser smoke
  pass. Local SDK 10.0.402/runtimes 10.0.13 installed; user confirmed the Windows restart. Old versions remain;
  deployed containers are unchanged. See [audit B09](requirements/app-review-and-improvements.md#b09--patch-vulnerable-cryptography-dependencies-and-verify-runtime-servicing).

- Frontend test baseline — Migrated obsolete TripSetup coverage to TripDetails, preserving display and edit/save
  checks. All 95 frontend unit tests pass without excluding the old failure; lint and build pass. See
  [audit F01](requirements/app-review-and-improvements.md#f01--restore-the-full-frontend-test-baseline).

- Unsaved form protection — The shared guard now compares controlled form values and resets its baseline for each
  Add/Edit session. Escape and Cancel require confirmation for changed Activity, Planned cost, Expense, Packing,
  To-do and Trip forms; cancelling confirmation preserves edits. Focused unit tests and the five-area Chromium
  regression pass; accepted by the user. See [audit F14](requirements/app-review-and-improvements.md#f14--dirty-form-snapshot-misses-the-controls-it-is-protecting).

Move completed items here when keeping a short record is useful. Otherwise, delete them from the active sections.
