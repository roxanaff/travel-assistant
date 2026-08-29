# Experience and Quality — Stage 1 Requirements

This document records the cross-cutting work that remains within Stage 1. It covers small usability improvements,
accessibility, visual consistency, and verification; it does not introduce new product capabilities.

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

## Open Stage 1 work

### Dashboard and workspace usability

- [ ] Complete responsive and keyboard-only manual checks across the dashboard and workspace.

### Visual consistency

- [ ] Apply the current colour system consistently: blue is reserved for emphasis, pink is used intentionally, and ink
      is used for neutral text and controls.

### Engineering consistency

Shared status presentation, trip-type labels, form keyboard behavior, and action-menu presentation are used where the
behavior is common. Feature-specific API and form workflows remain explicit when their behavior differs.

## Verification

- [x] Add frontend coverage for the dashboard empty state and trip creation, the trip form's date validation and type
      options, Trip Details display and editing, and planned-cost totals and Add expense/Undo behavior.
- [x] Add backend integration coverage for registration, authenticated trip creation, and account ownership when reading
      a trip. The tests use a disposable SQLite database and ephemeral data-protection keys; production remains
      PostgreSQL with database-backed key protection.
- [x] Add frontend coverage for dashboard loading-error and lifecycle states, plus Escape cancellation for an unchanged
      trip form.
- [ ] Add deeper frontend coverage for action failure paths, dialog and menu keyboard behavior, and Trip Details
      responsive states.
- [x] Add Chromium smoke coverage for registration, sign-in, creating a trip, adding an itinerary item, recording an
      expense, and adding a packing item. It starts a test-only API host with an in-memory database and never uses local
      or deployed trip data.
- [ ] Complete the feature-specific verification checklists in the Stage 1 requirement files.

## Constraints

This work should improve consistency without obscuring feature-specific behavior or introducing new product
capabilities.

## Beyond Stage 1

Later experience changes are recorded with the relevant product direction in [future/](../future/).
