# Trip Workspace — Stage 1 Requirements

## Purpose

The trip workspace is the working area for one trip. It separates planning tasks into focused sections rather than placing every feature on one long page.

## Product behavior

- Opening a dashboard trip opens the workspace on **Details**.
- On desktop, the compact header uses two aligned columns: the return link and trip name on the left; lifecycle status, dates, and destination on the right. The metadata begins level with the return link.
- Section tabs remain full width beneath the header.
- The workspace sections and routes are:

  | Section | Route | Purpose |
  | --- | --- | --- |
  | Details | `/trips/:id` | Trip setup information |
  | Itinerary | `/trips/:id/itinerary` | Activities and planning |
  | Budget & expenses | `/trips/:id/budget` | Planned costs and actual spending |
  | Packing | `/trips/:id/packing` | Manual packing checklist |

- A return link takes the user to the dashboard.
- Loading, not-found, and API-error states are handled for a trip workspace.
- Switching sections warns before an open add/edit form with unsaved changes is discarded.
- `/trips/:id/details` remains available as a compatible Details URL.

## Open Stage 1 work

- Cross-cutting tab and keyboard improvements are recorded in [experience and quality requirements](experience-and-quality-requirements.md).

## Verification

- [ ] Verify direct navigation to every workspace route and returning to the dashboard.
- [ ] Verify the workspace with Draft, Upcoming, Ongoing, and Past trips.
- [ ] Verify narrow/mobile navigation, keyboard tab navigation, not-found states, and API-error states.

## Constraints

A permanent side panel is not used because it reduces working space on desktop and does not adapt well to mobile.

## Beyond Stage 1

Future workspace directions are recorded in [personal trip planning](../future/personal-trip-planning.md) and [accounts and collaboration](../future/accounts-and-collaboration.md).
