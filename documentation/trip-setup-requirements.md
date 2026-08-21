# Trip Setup — Requirements and Task List

This document records trip-creation and editing requirements, including trip types. Dashboard-card layout and behavior are documented separately in `dashboard-card-requirements.md`.

## Current requirements

### Field language and required-field markers

- The field is called **Destination**, not “Primary destination”, throughout the product.
- `*` marks required fields. In the current trip form, Trip name is required.
- Optional fields do not use `(optional)` markers. Help text can explain a necessary conditional rule, such as a date requirement for a non-Draft trip.
- The same required-marker convention will be used in every form as it is updated.

### Trip types

- Trip type is optional and supports selecting more than one type.
- The current candidate types are: Beach; City break; Hiking & trekking; Skiing & winter sports; Work trip; Visiting friends & family; Road trip; Cabin stay; Camping; Cruise; All-inclusive resort; and Mountaineering & climbing.
- Hiking & trekking is kept distinct from Mountaineering & climbing: the former covers walks and multi-day hikes, while the latter covers technical or summit-focused trips.
- The labels and any additional types remain subject to a final product decision before implementation.

## Candidate additions to review

- Culture & sightseeing
- Wellness & spa
- Adventure & sports
- Festival or event trip
- Nature & wildlife

These will be added only if they help users find a meaningful match; a long list of near-duplicates should be avoided.

## Verification

- [ ] Test field labels and required markers for create and edit states.
- [ ] Test keyboard form completion, submission, cancellation, validation, and responsive layouts.
- [ ] Test trip-type selection, display, and persistence after the final type list is agreed.

## Later features

- Multiple destinations, including country/city structure and arrival/departure dates.
- Destination search and validation.
- Number of travellers.
- Arrival and departure time handling; see `future-requirements.md`.
