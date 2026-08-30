# Experience and Quality — Stage 1 Requirements

This document records the cross-cutting quality baseline for Stage 1. It covers usability improvements, accessibility,
visual consistency, and verification; it does not introduce new product capabilities.

## Product behavior

- Forms use consistent labels: required fields are bold and marked with `*`; routine optional labels are omitted. Input
  text uses ink rather than emphasis blue.
- Date ranges are validated in the browser before a trip is saved.
- Quantity accepts positive whole digits only. Money inputs accept up to `999,999,999.99`, with digits and one decimal
  separator only; impossible characters and excessive values are silently ignored while typing.
- Forms should use consistent keyboard behavior and cancellation behavior.
- A single-line form can be submitted with Enter; textarea fields retain Enter for new lines. Open add/edit forms focus
  their first field and can be cancelled with Escape or Cancel. Changed forms ask before their values are discarded.
- Popup menus close on Escape and return focus to their trigger. Account dialogs focus their first field, retain
  keyboard focus while open, and return focus to the account control when closed. Icon-only controls have accessible
  names and visible keyboard focus.
- The dashboard and workspace should remain usable and understandable across supported screen sizes and input methods.
- The visual system uses sans-serif text, a warm-neutral surface for list items, and consistent typography, colour,
  spacing, and controls.

## Stage 1 completion

Responsive and keyboard-only manual checks are complete. The current colour system is applied consistently: blue is
reserved for emphasis, pink is used intentionally, and ink is used for neutral text and controls.

### Engineering consistency

Shared status presentation, trip-type labels, form keyboard behavior, and action-menu presentation are used where the
behavior is common. Feature-specific API and form workflows remain explicit when their behavior differs.

## Completed coverage

- Frontend coverage includes the dashboard empty state and trip creation, trip-form date validation and type options,
  Trip Details display and editing, planned-cost totals, Add expense/Undo behavior, dashboard loading-error and
  lifecycle states, and Escape cancellation for an unchanged trip form.
- Backend integration coverage includes registration, authenticated trip creation, and account ownership when reading a
  trip. The tests use a disposable SQLite database and ephemeral data-protection keys; production remains PostgreSQL
  with database-backed key protection.
- Chromium smoke coverage includes registration, sign-in, creating a trip, adding an itinerary item, recording an
  expense, and adding a packing item. It starts a test-only API host with an in-memory database and never uses local or
  deployed trip data.
- Feature-specific manual verification checklists are complete.

## Constraints

This work should improve consistency without obscuring feature-specific behavior or introducing new product
capabilities.

## Beyond Stage 1

Later experience changes are recorded with the relevant product direction in [future/](../future/).
