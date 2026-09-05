# Frontend map

This folder contains the Vite/React browser application. The app loads in `main.tsx`, `App.tsx` selects a page from the
URL, and pages use feature components and API helpers to display and change the backend data.

| Location                                      | Responsibility                                                                           |
| --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/main.tsx`                                | Browser entry point. Creates the React application and enables client-side routing.      |
| `src/App.tsx`                                 | Shared visual shell and route tree.                                                      |
| `src/api/travelAssistantApi.ts`               | Resolves the backend URL for either local development or deployment.                     |
| `src/api/tripsApi.ts`                         | HTTP client for listing, loading, creating, updating, and deleting trips.                |
| `src/api/itineraryApi.ts`                     | HTTP client for loading, creating, updating, and deleting itinerary activities.          |
| `src/api/packingItemsApi.ts`                  | Packing-list HTTP client. The remaining feature API modules will follow this convention. |
| `src/types/`                                  | Shared API data shapes, controlled-form shapes, select-option labels, and form defaults. |
| `src/utils/format.ts`                         | Pure display helpers for dates and money.                                                |
| `src/pages/Dashboard.tsx`                     | Dashboard workflow: list, create, edit, and delete trips.                                |
| `src/pages/Workspace.tsx`                     | Loads one selected trip and provides its data to the nested sections.                    |
| `src/pages/ItineraryPage.tsx`                 | Thin route adapter connecting the workspace to the itinerary component.                  |
| `src/pages/BudgetPage.tsx`                    | Coordinates planned costs and actual expenses, including refreshes between them.         |
| `src/pages/PackingPage.tsx`                   | Thin route adapter connecting the workspace to the packing feature.                      |
| `src/pages/SetupPage.tsx`                     | Displays and edits core trip details.                                                    |
| `src/components/packing/PackingChecklist.tsx` | Packing checklist setup, editing, drag ordering, and deletion Undo flow.                 |
| `src/components/itinerary/Itinerary.tsx`      | Activity scheduling, inline editing, expanded details, and deletion Undo flow.           |
| `src/components/Header.tsx`                   | Persistent application header and dashboard link.                                        |
| `src/components/TripCard.tsx`                 | Summary card and action menu for one dashboard trip.                                     |
| `src/components/TripForm.tsx`                 | Reusable create/edit form for a trip.                                                    |
| `src/components/PlannedBudget.tsx`            | Estimated cost management and conversion of a plan into an actual expense.               |
| `src/components/ExpenseTracking.tsx`          | Actual-expense management, grouping, and deletion Undo flow.                             |
| `src/index.css`                               | Global design tokens and browser-level styles.                                           |
| `src/styles/shared.css`                       | Reusable layout and form primitives.                                                     |
| `src/App.css`                                 | Overall page-shell layout.                                                               |
| `src/pages/*.css`                             | Styles exclusive to the matching route page or workspace.                                |
| `src/components/*/*.css`                      | Styles exclusive to the matching component.                                              |
| `src/components/*.css`                        | Styles exclusive to the matching reusable component.                                     |
| `src/assets/`                                 | Static image assets; currently includes the hero image and starter Vite/React SVGs.      |

## Main data flow

1. A user opens a route in `App.tsx`.
2. The appropriate page or component loads data from the ASP.NET Core API.
3. The component keeps UI-only state—open forms, loading, errors, pending deletions—in React state.
4. On a save/delete action, it sends a request to the API and updates local state from the response. A few reversible
   actions use optimistic UI updates and restore the old data if the request fails.
