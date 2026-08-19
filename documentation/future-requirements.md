# Future requirements

This document collects intentionally deferred improvements that span more than one feature. Items here are not part of the current implementation queue unless they are moved into a feature-specific requirements document.

## Trip arrival and departure times

- [ ] Decide whether arrival and departure times belong to the trip setup, the itinerary, or both. The current trip model has an arrival-time field, but it is not yet used in the itinerary and has no matching departure-time field.
- [ ] Allow an arrival time on the first trip day and a departure time on the last trip day.
- [ ] Show those values in the related itinerary-day headings, for example `5 Sept (arrival: 10:00)` and `10 Sept (departure: 17:35)`.
- [ ] Define how these times interact with activities on the first and last day, including any warnings or scheduling hints.

## Accessibility and keyboard interaction

- [ ] Audit keyboard interaction across the app: Tab and Shift+Tab order, Enter submission, Escape behavior, visible focus styles, and focus return after menus or dialogs close.
- [ ] Let Escape close or cancel an open form when it is safe to do so, without discarding work unexpectedly.
- [ ] Ensure every icon-only control has an accessible label and can be used with a keyboard.

## Visual design refresh

- [ ] Rebalance the colour system: reduce the amount of blue, use pink more intentionally, and use ink for neutral text and controls that do not need emphasis.
- [ ] Rework the workspace header to use less vertical space and make better use of its empty area while retaining trip context and navigation.
- [ ] Improve the opening-hours input and display. Explore a compact time-picker or spinner-style control with narrower hour/minute fields; native time inputs behave differently across browsers and do not consistently support scroll-wheel selection.
- [ ] Redesign budget category headings and grouping controls so they are less cramped and visually clearer.

## Itinerary usability

- [ ] When an Add or Edit form opens, move focus to it and scroll it into view so the active form is fully usable without manual scrolling.
- [ ] Add an itinerary control to expand all activity details or collapse all activity details.

## List and card controls

- [ ] Let users switch planned costs between grouped and ungrouped views. In the ungrouped view, show the category on each planned-cost row.
- [ ] Add clear, appropriate sorting options to cards and lists across the app.
- [ ] Let users collapse the Planned budget or Expenses sections into compact, clickable summary cards when they do not need to work in that section.
- [ ] Let users adjust card and list-entry sizes using a small set of presets or drag-resize controls.

## Code quality and consistency

- [ ] Consolidate repeated UI styles and components, starting with the duplicated dashboard and workspace status-pill definitions.
- [ ] Identify other repeated API, form, and action-menu patterns that can safely be shared without making feature code harder to follow.
