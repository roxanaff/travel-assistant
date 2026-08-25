# Experience and Quality — Stage 1 Requirements

This document records the cross-cutting work that remains within Stage 1. It covers small usability improvements, accessibility, visual consistency, and verification; it does not introduce new product capabilities.

## Product behavior

- Forms should use consistent labels, required-field markers, keyboard behavior, and cancellation behavior.
- The dashboard and workspace should remain usable and understandable across supported screen sizes and input methods.
- The visual system should use typography, colour, spacing, and controls consistently.

## Open Stage 1 work

### Form behavior and language

- [ ] Use `*` for required fields and remove routine `(optional)` markers across forms. The trip form is the reference implementation.
- [ ] Use **Destination** rather than “Primary destination” throughout the product.
- [ ] When dates are supplied, validate in the frontend that both dates are present and that the end date is not before the start date.
- [ ] Submit a valid single-line form with Enter. Enter remains available for new lines in a textarea.
- [ ] Exit an open add/edit mode with Escape when there are no unsaved changes. If there are unsaved changes, confirm before they are discarded.
- [ ] Move focus to an opened add/edit form and scroll it into view.

### Dashboard and workspace usability

- [ ] Use a stable three-column dashboard grid on desktop, with one- and two-column layouts at narrower breakpoints.
- [ ] Replace a dashboard card with its edit form in the same grid position. The edit form should read as that card in an editing state, without a duplicate card remaining visible.
- [ ] Ensure keyboard navigation, focus return, Escape behavior, and accessible labels work for menus, dialogs, tabs, and icon-only controls.
- [ ] Keep the workspace header compact while retaining trip context and navigation.

### Visual consistency

- [ ] Replace remaining serif text with the product sans-serif typeface, including the `No trips yet` empty state.
- [ ] Apply the current colour system consistently: blue is reserved for emphasis, pink is used intentionally, and ink is used for neutral text and controls.
- [ ] Improve the opening-hours input and display, with a compact control that works consistently across browsers.
- [ ] Make budget category headings and grouping controls less cramped and easier to scan.

### Engineering consistency

- [ ] Consolidate repeated UI styles and components, starting with the duplicated dashboard and workspace status pills.
- [ ] Identify repeated API, form, and action-menu patterns that can be shared without obscuring feature behavior.

## Verification

- [ ] Add frontend coverage for dashboard lifecycle states, actions, in-place editing, and error states.
- [ ] Add frontend coverage for trip setup, including field validation, keyboard behavior, and responsive states.
- [ ] Add frontend coverage for planned costs and remaining-budget calculations.
- [ ] Add backend integration coverage for authentication, account ownership, and trip-scoped endpoints.
- [ ] Add end-to-end smoke coverage for registration, sign-in, creating a trip, adding an itinerary item, recording an expense, and adding a packing item.
- [ ] Complete the feature-specific verification checklists in the Stage 1 requirement files.

## Constraints

This work should improve consistency without obscuring feature-specific behavior or introducing new product capabilities.

## Beyond Stage 1

Later experience changes are recorded with the relevant product direction in [future/](../future/).
