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
- [P2] Budget — After changing a planned cost that has a linked expense, show a one-time dismissible note offering to
  adjust the expense amount. Closing the note deliberately keeps actual spending unchanged; show it again after a later
  planned-cost amount change.
- [P2] Packing — Move surrounding rows live while an item is dragged.
- [P1] Packing — Allow touch drag-and-drop to place an item in its intended position without moving sideways to avoid
  the original drop target.
- [P3] Packing — Consider making the Group by control apply to the whole page, rather than separately to the To pack and
  Packed sections.
- [P2] Shared UI — Replace browser-default destructive-action confirmations with accessible, app-styled confirmation
  dialogs.
- [P2] Itinerary — When trip dates change, show a dismissible message asking the user to check scheduled activities.
  Show it again only after a later date change.

## Post-booking review topics

Finish the agreed booking scope before revisiting these topics. These are discussion items, not approval to change
the current data model, automatic-update rules or layouts. Preserve the existing behavior until decisions are agreed.

- [P2] Linked data — Review whether booking, activity and expense information should share a common model/table or
  retain separate records with shared values. Explore a single source of truth for genuinely identical fields to
  reduce repeated updates and review prompts. Distinguish reservation price from paid/refunded money, travel dates
  from payment dates, and booking schedules from independent activities. Automatic updates, defaults for newly
  created links, treatment of existing mismatches and intentional overrides remain open decisions.
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
- [P2] Layout density — Revisit the space taken by cards and nested cards. Explore compact divider-separated rows
  within a page section, with expanded details and related records not introducing another layer of boxes.
- [P2] Related-review presentation — Revisit the current pink disclosure and neutral review panel after booking
  completion. The current appearance is a working version, not the user's final visual acceptance.
- [P2] Naming — Replace the user-facing word Itinerary with a clearer name. Schedule, Activities and Trip plan were
  discussed; Schedule is the current suggestion, not an agreed rename. Keep naming consistent in navigation,
  headings and related-entry actions after a choice is made.

## Technical and quality improvements

- [P1] Backend dependencies — The backend test run reports NU1902/NU1903 advisories for existing transitive
  System.Security.Cryptography.Pkcs and System.Security.Cryptography.Xml 10.0.11 packages. Assess and apply compatible
  patched dependencies in a separate maintenance change.
- [P2] Frontend tests — TripSetup.test.tsx imports the removed components/setup/TripSetup component, so the full unit
  suite fails during collection despite the runnable tests passing. Update or replace that stale setup coverage.

Add accessibility refinements, performance work, test-coverage gaps, dependency upgrades, error-handling improvements,
and documentation corrections here.

## Done

Move completed items here when keeping a short record is useful. Otherwise, delete them from the active sections.
