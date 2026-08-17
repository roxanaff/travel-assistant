# Trip Workspace / Details Page — Requirements and Task List

This document defines the page opened from a dashboard trip card. It is the workspace for one trip, not a single long details page.

## Agreed structure

Clicking a dashboard card opens the trip workspace on **Itinerary**.

```text
Trip workspace header
  [ Itinerary ] [ Budget & expenses ] [ Packing ] [ Details ]
```

| Section | Route | Purpose |
|---|---|---|
| Itinerary | `/trips/:id` | Default section for activities and planning |
| Budget & expenses | `/trips/:id/budget` | Budget summary, then planned categories and expenses as they are implemented |
| Packing | `/trips/:id/packing` | Manual packing checklist in the first stage |
| Details | `/trips/:id/details` | View and edit trip setup information |

There is no Overview section initially. The dashboard provides cross-trip overview; an Overview section can be added later for shared-trip and progress summaries.

Keep a compact persistent header above the tabs. Do not use a permanent side panel; it reduces working space on desktop and does not adapt well to mobile.

## Current implementation — complete or already available

- [x] Dashboard cards link to `/trips/:id`.
- [x] The existing trip details page loads a trip and handles loading/not-found/API errors.
- [x] The page has a return link to the dashboard.
- [x] A header currently displays type, a hard-coded status, destination, dates, and budget information.
- [x] Itinerary and budget/expense content are currently rendered together in one page grid.

## First-stage implementation tasks

### A. Routing and navigation

- [ ] Add nested routes for Budget & expenses, Packing, and Details while retaining `/trips/:id` for Itinerary.
- [ ] Add tab-style navigation beneath the workspace header.
- [ ] Make the active tab visually clear and accessible (`aria-current` or equivalent).
- [ ] Preserve a direct URL for each workspace section.
- [ ] Keep a return link to the dashboard.

### B. Persistent workspace header

- [ ] Show trip name, primary destination, date range, and calculated lifecycle status.
- [ ] Hide optional values that are absent; show Draft prompts for missing destination or dates.
- [ ] Make the header work for Draft trips without invalid date formatting.
- [ ] Remove the hard-coded `Planned` status.

### C. Details section

- [ ] Add a Details page that displays the complete trip setup information.
- [ ] Add edit functionality for name, destination, dates, trip type(s), currency, target budget, and notes.
- [ ] Reuse the trip-creation form for editing, pre-filled with the selected trip's current values.
- [ ] Apply the agreed trip-date change rules to itinerary activities when dates are edited.
- [ ] Provide clear save, cancel, validation, and API-error states.

### D. Section ownership

- [ ] Move the current itinerary component into the Itinerary route only.
- [ ] Move the current budget/expense UI into the Budget & expenses route only.
- [ ] Add the manual packing checklist to the Packing route.
- [ ] Ensure changing tabs does not lose an unsaved form without warning or an explicit discard action.

### E. Verification

- [ ] Test direct navigation to every route and returning to the dashboard.
- [ ] Test the workspace with Draft, Upcoming, Ongoing, and Past trips.
- [ ] Test narrow/mobile navigation and keyboard tab navigation.
- [ ] Test not-found and API-error states for each route.

## Later-stage workspace features

- [ ] Overview section for progress, upcoming reminders, shared travellers, and budget status.
- [ ] Shared-trip actions and collaborator indicators.
- [ ] Archive/history treatment for Past trips.
- [ ] Advanced section permissions and sharing controls.

## Relevant current files

- Existing workspace page: `frontend/src/pages/TripDetails.tsx`
- Existing page styles: `frontend/src/pages/TripDetails.css`
- Router configuration: `frontend/src/App.tsx`
- Itinerary section: `frontend/src/components/Itinerary.tsx`
