# Future requirements

This document collects intentionally deferred improvements that span more than one feature. Items here are not part of the current implementation queue unless they are moved into a feature-specific requirements document.

## Account recovery and session management

- [ ] Add a forgot-password flow that sends a single-use reset link by email with a one-hour expiry.
- [ ] Choose and configure a transactional email provider and sending address for account recovery.
- [ ] Let users view and revoke active sessions/devices.
- [ ] Add device/session management: list each browser or device currently signed in, with controls to sign out of an individual device or sign out everywhere.
- [ ] Add rate limits to registration, login, and account-recovery requests to reduce automated abuse and password guessing.

## Trip arrival and departure times

- [ ] Decide whether arrival and departure times belong to the trip setup, the itinerary, or both. The current trip model has an arrival-time field, but it is not yet used in the itinerary and has no matching departure-time field.
- [ ] Support an arrival time on the first trip day and a departure time on the last trip day.
- [ ] Display those values in the related itinerary-day headings, for example `5 Sept (arrival: 10:00)` and `10 Sept (departure: 17:35)`.
- [ ] Define how these times interact with activities on the first and last day, including any warnings or scheduling hints.

## Accessibility and keyboard interaction

- [ ] Audit keyboard interaction across the app: Tab and Shift+Tab order, Enter submission, Escape behavior, visible focus styles, and focus return after menus or dialogs close.
- [ ] In forms, let Enter submit when focus is not in a multiline field and the form is valid; do not override normal textarea Enter behavior.
- [ ] Let Escape exit an open add/edit mode when it is safe to do so. If the form contains unsaved changes, warn before discarding them.
- [ ] Provide every icon-only control with an accessible label and keyboard operation.

## Form language and typography

- [ ] Replace remaining serif text with the product’s sans-serif typeface, including the `No trips yet` empty state.
- [ ] Standardise forms on `*` for required fields and remove routine `(optional)` markers. See `trip-setup-requirements.md` for the trip-form rule.

## Visual design refresh

- [ ] Rebalance the colour system: reduce the amount of blue, use pink more intentionally, and use ink for neutral text and controls that do not need emphasis.
- [ ] Rework the workspace header to use less vertical space and make better use of its empty area while retaining trip context and navigation.
- [ ] Improve the opening-hours input and display. Explore a compact time-picker or spinner-style control with narrower hour/minute fields; native time inputs behave differently across browsers and do not consistently support scroll-wheel selection.
- [ ] Redesign budget category headings and grouping controls so they are less cramped and visually clearer.

## Itinerary usability

- [ ] When an Add or Edit form opens, focus is moved to it and the form is scrolled into view so it can be used without manual scrolling.
- [ ] Provide an itinerary control for expanding or collapsing all activity details.

## List and card controls

- [ ] Let users switch planned costs between grouped and ungrouped views. In the ungrouped view, show the category on each planned-cost row.
- [ ] Add clear, appropriate sorting options to cards and lists across the app.
- [ ] Let users collapse the Planned budget or Expenses sections into compact, clickable summary cards when they do not need to work in that section.
- [ ] Let users adjust card and list-entry sizes using a small set of presets or drag-resize controls.

## Code quality and consistency

- [ ] Consolidate repeated UI styles and components, starting with the duplicated dashboard and workspace status-pill definitions.
- [ ] Identify other repeated API, form, and action-menu patterns that can safely be shared without making feature code harder to follow.
