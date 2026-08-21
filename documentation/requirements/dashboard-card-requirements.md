# Dashboard Cards — Requirements and Task List

This document records requirements for the cards on the trip dashboard.
It reflects the current product plan and codebase.

## Current behavior

Each dashboard card represents one trip.

- Cards are ordered: **Ongoing**, then **Upcoming** (nearest start date first), then **Draft**, then **Past**.
- Past trips remain on the dashboard for now, but use a visually muted style.
- Clicking a trip name opens that trip's details page.
- Cards do not expand inline.
- Missing optional values are hidden rather than shown as `Not specified`.
- The notes preview is truncated to one or two lines. The full note is available on the trip details page.
- A three-dot actions menu provides **Edit** and **Delete**. The menu is deliberately extensible for later actions, such as sharing.

### Card content and visual order

1. Trip name and lifecycle-status pill
2. Destination
3. Travel dates
4. Trip type(s), when set
5. Total target budget, when set
6. Truncated notes preview, when set

For a Draft, show a useful missing-information prompt such as `Destination not set` or `Dates not set` instead of 
leaving the central card content empty.

## Current implementation — complete or already available

- [x] The dashboard loads trips from `GET /api/trips`.
- [x] Trips are rendered in a responsive card grid.
- [x] Each trip name links to the trip details route: `/trips/{id}`.
- [x] The current card shows destination, date range, trip type, and total budget.
- [x] Cards have hover/focus-ready visual treatment through the card link.
- [x] The backend already exposes `DELETE /api/trips/{id}` for a future Delete card action.
- [x] Trips support a required name plus optional destination, dates, type, target budget, and note.
- [x] The trip API calculates and returns Draft, Upcoming, Ongoing, or Past status.
- [x] The reusable trip form supports creating Draft trips and editing existing trips.
- [x] Cards use lifecycle ordering, show Draft prompts, hide absent optional values, and mute Past trips.
- [x] Cards display name, status, destination, dates, type, target budget, and a two-line notes preview where available.
- [x] The name is the card navigation link; the actions menu provides Edit and Delete.
- [x] The actions menu closes with Escape, and delete failures leave the dashboard visible.

## First-stage implementation tasks

### A. Database migration verification

- [ ] Update database migrations and verify that existing trips can be migrated safely.

### Dashboard UX improvements

- [ ] On desktop widths that support it, use a stable three-column grid: a single trip should occupy one third of a row rather than stretching across the full row. Use responsive one- and two-column layouts at narrower breakpoints.
- [ ] When a trip is edited from a card, the card is replaced by the edit form in the same grid position. A duplicate visible card is not left behind.
- [ ] The edit form should visually read as the card opened into editing mode and retain the surrounding grid context.

### B. Navigation and actions menu

- [ ] Verify keyboard navigation, focus management, Escape behavior, and accessible labels for the menu.

### C. Verification

- [ ] Test one card for each status: Draft, Upcoming, Ongoing, and Past.
- [ ] Test a draft with no destination, no dates, and no optional fields.
- [ ] Test one-, two-, and three-or-more-card layouts at desktop and responsive widths.
- [ ] Test that editing a card replaces that same card and cancelling restores it in its original position.
- [ ] Test long trip names and long notes on narrow and wide screens.
- [ ] Test that clicking the card navigates, while clicking the actions button/menu does not navigate.
- [ ] Test edit and delete error states when the backend is unavailable.

## Later-stage dashboard features

- [ ] Add actions to the same menu for sharing/inviting travellers.
- [ ] Show shared-trip indicators and collaborator avatars.
- [ ] Add a near-trip reminder or visual indicator, for example one week before departure.
- [ ] Move Past trips to a dedicated archive/history view if the dashboard becomes crowded.
- [ ] Reduce or reorganize card information based on real usage and card density.
- [ ] Add search or filtering only if users accumulate enough trips for lifecycle ordering to stop being sufficient.
- [ ] Support multiple countries/cities on cards once multi-destination trips are implemented.

## Relevant current files

- Frontend dashboard: `frontend/src/pages/TripDashboard.tsx`
- Dashboard styles: `frontend/src/pages/TripDashboard.css`
- Frontend trip types: `frontend/src/types/trip.ts`
- Backend trip model: `backend/Models/Trip.cs`
- Trip API endpoints: `backend/Endpoints/TripEndpoints.cs`
- Trip validation: `backend/Validation/TripValidation.cs`
- Trip create/update contract: `backend/Contracts/CreateTripRequest.cs`
