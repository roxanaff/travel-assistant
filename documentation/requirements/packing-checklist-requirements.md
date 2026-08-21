# Packing Checklist — Requirements and Task List

This document covers the first-stage manual Packing section of a trip workspace.

## Current product behavior

- Packing works for Draft, Upcoming, Ongoing, and Past trips.
- Each item has a required name, optional category, optional quantity, packed state, and saved manual order.
- Quantity defaults to one; only quantities greater than one are displayed, e.g. `10 × T-shirts`.
- Categories are Documents & money, Toiletries, Clothing, Electronics, Health, and Other.
- The checklist has one underlying list but two displayed sections:
  - **To pack** for unpacked items
  - **Packed** for packed items, visually muted
- Ticking or unticking an item moves it between displayed sections without changing its saved manual order.
- Progress is based on checklist rows, e.g. `8 of 15 packed`, not the sum of quantities.
- The normal display keeps each section in manual order and shows an optional category label on the right.
- A display option groups To pack and Packed items by category.
- Users may drag-and-drop reorder items within the To pack and Packed sections.
- Users can add, edit, rename, and delete items. Delete has no confirmation dialog and includes a short-lived Undo action.

## Default-list behaviour

For an empty checklist, offer the user:

- **Use default list**
- **Start empty**

Using the default list creates independent copies inside the trip checklist. Users may freely edit or delete those copies.

| Category | Default items |
|---|---|
| Documents & money | Passport/ID, Wallet/cards/cash, Tickets/reservations, Keys |
| Toiletries | Toothbrush, Toothpaste, Deodorant |
| Clothing | Underwear, Socks, Sleepwear |
| Electronics | Phone charger |
| Health | Regular medication |

The default list deliberately does not include a phone.

Later, users may add default items after starting empty. Duplicate prevention should compare normalized item names, ignoring case and surrounding whitespace.

## Current implementation

- [x] The workspace includes the Packing checklist route at `/trips/:id/packing`.
- [x] The packing-item database model and migration are in place.
- [x] The packing API supports loading, creating, editing, toggling, reordering, and deleting checklist items.
- [x] The Packing route offers the initial default-list or empty-list choice and displays the basic two-section checklist.

## First-stage implementation tasks

### A. Data model and API

- [x] Create a packing-item model with trip ID, name, optional category, quantity, packed state, sort order, and creation timestamp.
- [x] Store quantity as a positive integer with a default of one.
- [x] Add the agreed fixed categories and allow a null category.
- [x] Add list, create, update, reorder, and delete API endpoints scoped to a trip.
- [x] Add frontend types, request contracts, validation, and database migrations.
- [x] Preserve packing items when trip dates or status change.

### B. Packing route and checklist UI

- [x] Add the Packing section at `/trips/:id/packing` in the trip workspace.
- [x] Render the To pack and Packed lists from one set of packing items.
- [x] Toggle packed state directly from the checklist row.
- [x] Keep manual order stable when an item is packed or unpacked.
- [x] Show item quantity only when greater than one.
- [x] Show progress as packed checklist rows divided by all checklist rows.
- [x] Render optional category labels in the standard, ungrouped display.
- [x] Add a view control for grouping list items by category.
- [x] Support drag-and-drop ordering within To pack and Packed lists, with Move up / Move down controls for keyboard users.

### C. Item management and recovery

- [x] Provide quick Add item flow with fields for name, optional quantity, and optional category.
- [x] Add edit/rename controls for every item.
- [x] Delete immediately, remove the row optimistically, and display a short-lived Undo action.
- [x] Delay the API delete until the Undo window ends so Undo restores the same item.
- [x] Report errors if saving or deferred deletion fails. Reordering errors will be added with drag-and-drop.

### D. Default-list flow

- [x] Show the Use default list / Start empty choice only for a truly empty checklist.
- [x] Copy the agreed default items into the trip checklist when Use default list is selected.
- [x] Ensure copied default items are normal editable trip items, not template links.

### E. Verification

- [ ] Test Draft and dated trips.
- [ ] Test default-list creation and starting empty.
- [ ] Test quantities of one and greater than one.
- [ ] Test check/uncheck, progress, ordering, grouping, editing, delete, Undo expiry, and API failure.
- [ ] Test narrow/mobile layouts and keyboard interaction.

## Later features

- [ ] Add default items after the initial empty-state choice, with duplicate prevention using normalized names.
- [ ] Custom categories and free-text category names when Other is selected.
- [ ] User-customizable default templates.
- [ ] Rule-based suggestions based on trip type, activities, destination, duration, and laundry access.
- [ ] Weather-aware suggestions.
- [ ] Shared and personal packing lists for group trips.

## Relevant implementation locations

- Trip workspace routing: `frontend/src/App.tsx`
- Trip workspace layout: `frontend/src/pages/TripWorkspace.tsx`
- Packing page: `frontend/src/pages/TripPackingPage.tsx`
- Packing API helper: `frontend/src/api/packingItemsApi.ts`
- Backend model folder: `backend/Models`
- Packing API endpoints: `backend/Endpoints/PackingItemEndpoints.cs`
