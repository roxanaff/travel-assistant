# Dashboard — Stage 1 Feature

## Purpose

The dashboard provides an account-level view of trips and the entry point to each trip workspace.

## Product behavior

- Each card represents one trip.
- The desktop grid has three stable columns, with two- and one-column responsive layouts at narrower widths.
- Cards are ordered Ongoing, Upcoming by nearest start date, Draft, then Past. Past cards are visually muted.
- The trip name opens the workspace. Cards do not expand inline.
- Missing optional values are hidden. Draft cards show useful missing-information prompts instead of an empty central
  area.
- When both destination and dates are missing, their prompts are shown on separate lines.
- Each card can show, in order: name and status, destination, dates, trip type, target budget, and a one- or two-line
  notes preview.
- A narrow action column provides Edit and Delete. It leaves space for future actions without changing the card layout.
- Editing replaces the selected card with its form in the same grid position; cancelling restores the card.
- Delete failures leave the dashboard visible and report the failed action.

## Beyond Stage 1

Future dashboard and collaboration directions are recorded in the [product roadmap](../roadmap.md).
