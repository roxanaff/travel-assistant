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
- [x] A shared workspace header displays the trip name, destination, dates, and calculated status.
- [x] Itinerary, Budget & expenses, Packing, and Details have separate routes beneath the workspace.
- [x] The Details page displays the complete trip setup and reuses the trip form for editing.
- [x] The Itinerary and Budget & expenses implementations each render only in their own workspace route.
- [x] Switching tabs warns before discarding an open Add/Edit form.

## First-stage implementation tasks

### A. Routing and navigation


### B. Persistent workspace header


### C. Details section

- [ ] Apply the agreed trip-date change rules to itinerary activities when dates are edited.

### D. Section ownership

- [ ] Add the manual packing checklist to the Packing route.

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

- Workspace layout: `frontend/src/pages/TripWorkspace.tsx`
- Workspace styles: `frontend/src/pages/TripWorkspace.css`
- Budget page: `frontend/src/pages/TripBudgetPage.tsx`
- Details page: `frontend/src/pages/TripSetupPage.tsx`
- Router configuration: `frontend/src/App.tsx`
- Itinerary section: `frontend/src/components/Itinerary.tsx`
