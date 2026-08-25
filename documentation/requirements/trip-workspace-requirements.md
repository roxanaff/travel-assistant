# Trip Workspace — Stage 1 Requirements

## Purpose

The trip workspace is the working area for one trip. It separates planning tasks into focused sections rather than placing every feature on one long page.

## Product behavior

- Opening a dashboard trip opens the workspace on **Itinerary**.
- A compact header shows the trip name, destination, dates, and lifecycle status above the section navigation.
- The workspace sections and routes are:

  | Section | Route | Purpose |
  | --- | --- | --- |
  | Itinerary | `/trips/:id` | Activities and planning |
  | Budget & expenses | `/trips/:id/budget` | Planned costs and actual spending |
  | Packing | `/trips/:id/packing` | Manual packing checklist |
  | Details | `/trips/:id/details` | Trip setup information |

- A return link takes the user to the dashboard.
- Loading, not-found, and API-error states are handled for a trip workspace.
- Switching sections warns before an open add/edit form with unsaved changes is discarded.

## Open Stage 1 work

Cross-cutting workspace header, tab, and keyboard improvements are recorded in [experience and quality requirements](experience-and-quality-requirements.md).

## Verification

- [ ] Verify direct navigation to every workspace route and returning to the dashboard.
- [ ] Verify the workspace with Draft, Upcoming, Ongoing, and Past trips.
- [ ] Verify narrow/mobile navigation, keyboard tab navigation, not-found states, and API-error states.

## Constraints

A permanent side panel is not used because it reduces working space on desktop and does not adapt well to mobile.

## Beyond Stage 1

Future workspace directions are recorded in [personal trip planning](../future/personal-trip-planning.md) and [accounts and collaboration](../future/accounts-and-collaboration.md).
