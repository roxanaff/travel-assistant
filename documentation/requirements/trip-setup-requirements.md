# Trip Setup — Stage 1 Requirements

## Purpose

Trip setup creates and updates the information that defines a trip and its lifecycle status.

## Product behavior

- Trip name is required. Destination, dates, trip type, currency, target budget, and notes are optional.
- A trip without a destination or complete dates is a Draft. With those fields complete, its status is calculated as
  Upcoming, Ongoing, or Past from its dates.
- When dates are provided, both a start date and end date are required. The end date cannot be before the start date.
- The field is named **Destination** throughout the product.
- Required fields use `*`. Routine `(optional)` markers are not used.
- Trip type supports one selection from this ordered list: City break; Beach holiday; Hiking; Mountaineering & climbing;
  Skiing & winter sports; Road trip; Camping; Cabin stay; Cruise; All-inclusive resort; Festival / event; Work trip;
  Visiting friends & family; and Other.

## Open Stage 1 work

No additional trip-details UX work is currently planned for Stage 1.

## Verification

- [ ] Verify create and edit states with Draft, Upcoming, Ongoing, and Past trips.
- [ ] Verify field labels, required markers, date validation, keyboard behavior, and responsive layouts.
- [ ] Verify selected trip types persist and display correctly.

## Constraints

Hiking is distinct from Mountaineering & climbing: the former covers walks and multi-day hikes, while the latter covers
technical or summit-focused trips.

## Beyond Stage 1

Future trip-setup directions are recorded in [personal trip planning](../future/personal-trip-planning.md).
