# Itinerary — Requirements and Task List

This document covers manual itinerary activities and the Itinerary section of a trip workspace.

## Agreed first-stage behaviour

- Only the activity name is required.
- Activities may be scheduled or unscheduled.
- A Draft trip may contain only unscheduled activities until trip dates are set.
- The itinerary is an ordered list, not a calendar.
- Every dated trip day has a section, even when empty; sections are arranged vertically and **Unscheduled** appears last.
- Timed activities sort chronologically. Dated-but-untimed activities follow them. Unscheduled activities sort by priority, then creation order.
- An activity that runs past midnight appears only on the date on which it starts.
- Clicking an activity row does nothing. Each row has Edit and Delete buttons.
- Delete has no confirmation dialog; it shows a short-lived Undo message.

### Activity fields

| Field | First stage behaviour |
|---|---|
| Name | Required |
| Category | Optional; Museum, Tour, Event, Food, Beach, Bar, Attraction, Other |
| Date | Optional; must be within the trip when dates exist |
| Start time | Optional; requires a date |
| Estimated duration | Optional; entered as hours/minutes, stored as total minutes |
| Opening/closing hours | Optional; manual hours for the planned visit day |
| Entry cost | Optional; independent of the budget in this stage |
| Location / external link | Optional |
| Priority | Must-do, Would-like-to-do, Optional; default is Would-like-to-do |
| Notes | Optional |

Opening hours may run past midnight, such as `18:00–02:00`.

### Opening-hours warnings

- No start time: no warning.
- Start time without a duration: warn when the start is one hour or less before closing.
- Start time and duration: warn when calculated end time is after closing.

## Current implementation — complete or already available

- [x] The API supports listing, creating, updating, and deleting itinerary items.
- [x] The UI loads itinerary items for a trip.
- [x] The UI provides add, inline edit, and delete actions.
- [x] The existing item form supports name, date, start time, end time, category, cost, and note.
- [x] The current UI shows a flat chronological list and action buttons for each item.

## First-stage implementation tasks

### A. Data model and API

- [ ] Make an activity date nullable.
- [ ] Replace `EndTime` with nullable `DurationMinutes`.
- [ ] Make category nullable; do not store a visible `None` category.
- [ ] Replace the existing categories with Museum, Tour, Event, Food, Beach, Bar, Attraction, and Other.
- [ ] Add optional opening time and closing time.
- [ ] Add optional location and external link fields.
- [ ] Add priority with a default of Would-like-to-do.
- [ ] Update create/update contracts, API responses, frontend types, and database migrations.
- [ ] Validate that a start time cannot exist without a date.
- [ ] Validate that a dated activity is inside the trip date range.
- [ ] Allow unscheduled activities for Draft trips.
- [ ] Support closing times after midnight when evaluating opening-hours warnings.

### B. Activity form

- [ ] Remove the required date and the automatic/default date from the form.
- [ ] Disable or hide date/time scheduling controls until a Draft trip has dates.
- [ ] Replace End time with hours/minutes duration input.
- [ ] Add optional fields for opening/closing hours, location, external link, priority, and notes.
- [ ] Set defaults: no category, no date/time, no duration, Would-like-to-do priority.
- [ ] Show field-level validation messages for invalid date/time combinations.

### C. Itinerary list

- [ ] Render every trip day as a section, including empty days.
- [ ] Use a single vertical sequence of day sections rather than a multi-column day layout.
- [ ] Add the Unscheduled section after trip-day sections.
- [ ] Apply the agreed timed, untimed, and priority ordering rules.
- [ ] Keep activities that run past midnight in their start-date section only.
- [ ] Render compact activity details: time, name, category, duration, cost, and priority only when present.
- [ ] Keep Edit and Delete buttons on each item; the rest of the row is not interactive.
- [ ] Add accessible empty states for an empty day and for no unscheduled activities.

### D. Warnings and delete recovery

- [ ] Calculate and render opening-hours warnings using the agreed rules.
- [ ] Clearly distinguish an informational warning from a blocking validation error.
- [ ] After Delete, remove the item visually and show an Undo action for a short fixed period.
- [ ] Delay the API delete until the Undo period ends, so Undo restores the same item without recreating it.
- [ ] Report an error if the deferred delete fails.

### E. Changes to trip dates

- [ ] When a trip start date changes and the revised trip is the same length or longer, shift all scheduled activity dates by the start-date difference.
- [ ] When a trip is shortened, automatically clear date and start time for activities beyond the new end date; preserve all other activity data.
- [ ] Verify the user is informed when activities are moved to Unscheduled.

### F. Verification

- [ ] Test Draft, Upcoming, Ongoing, and Past trips.
- [ ] Test an unscheduled activity, a dated item without time, and timed items with/without duration.
- [ ] Test opening hours that close on the following day.
- [ ] Test the one-hour closing warning and the duration-over-closing warning.
- [ ] Test trip-date shifts and trip shortening.
- [ ] Test Undo, including expiry and an API failure.

## Later-stage itinerary features

- [ ] Calendar view and explicit empty time slots.
- [ ] Drag and drop between itinerary sections and manual ordering for untimed activities.
- [ ] Overlap/conflict detection.
- [ ] Travel-time estimates and route optimization.
- [ ] Opening-hours hints for activities without a start time.
- [ ] Reservations, ticket/booking status, and attendee counts.
- [ ] Expanded activity details and recommendations.
- [ ] Custom categories and category ordering based on trip type.
- [ ] Link activity costs to budget-planner entries.

## Relevant current files

- Frontend component: `frontend/src/components/Itinerary.tsx`
- Itinerary styles: `frontend/src/components/Itinerary.css`
- Frontend types: `frontend/src/types/itineraryItem.ts`
- Backend model: `backend/Models/ItineraryItem.cs`
- API endpoints/validation: `backend/Program.cs`
- Create/update contract: `backend/Contracts/CreateItineraryItemRequest.cs`
