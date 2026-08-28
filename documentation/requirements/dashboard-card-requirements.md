# Dashboard — Stage 1 Requirements

## Purpose

The dashboard provides an account-level view of trips and the entry point to each trip workspace.

## Product behavior

- Each card represents one trip.
- The desktop grid has three stable columns, with two- and one-column responsive layouts at narrower widths.
- Cards are ordered Ongoing, Upcoming by nearest start date, Draft, then Past. Past cards are visually muted.
- The trip name opens the workspace. Cards do not expand inline.
- Missing optional values are hidden. Draft cards show useful missing-information prompts instead of an empty central area.
- When both destination and dates are missing, their prompts are shown on separate lines.
- Each card can show, in order: name and status, destination, dates, trip type, target budget, and a one- or two-line notes preview.
- The three-dot menu provides Edit and Delete. Escape closes the menu.
- Editing replaces the selected card with its form in the same grid position; cancelling restores the card.
- Delete failures leave the dashboard visible and report the failed action.

## Open Stage 1 work

The remaining card layout, in-place edit, keyboard, and responsive improvements are recorded in [experience and quality requirements](experience-and-quality-requirements.md).

## Verification

- [ ] Verify one card for each lifecycle status and a Draft with no optional fields.
- [ ] Verify one-, two-, and three-or-more-card layouts at desktop and responsive widths.
- [ ] Verify that card editing replaces the same card and that cancelling restores it in the original position.
- [ ] Verify long names and notes, card navigation, menu interaction, and edit/delete failure states.

## Beyond Stage 1

Future dashboard directions are recorded in [personal trip planning](../future/personal-trip-planning.md) and [accounts and collaboration](../future/accounts-and-collaboration.md).
