# Itinerary — Requirements and Task List

This document covers manual itinerary activities and the Itinerary section of a trip workspace.

## Current product behavior

- Only the activity name is required.
- Activities may be scheduled or unscheduled.
- A Draft trip may contain only unscheduled activities until trip dates are set.
- The itinerary is an ordered list, not a calendar.
- Dated days with activities appear as vertical sections; **Unscheduled** appears last when it contains activities.
- Timed activities sort chronologically. Dated-but-untimed activities follow them. Unscheduled activities sort by priority, then creation order.
- An activity that runs past midnight appears only on the date on which it starts.
- Clicking an activity row does nothing. Each row has Edit and Delete buttons.
- Delete has no confirmation dialog; it will show a short-lived Undo message.

### Activity fields

| Field                    | First stage behaviour                                              |
|--------------------------|--------------------------------------------------------------------|
| Name                     | Required                                                           |
| Category                 | Optional; Museum, Tour, Event, Food, Beach, Bar, Attraction, Other |
| Date                     | Optional; must be within the trip when dates exist                 |
| Start time               | Optional; requires a date                                          |
| Estimated duration       | Optional; entered as `HH:MM`, stored as total minutes              |
| Opening/closing hours    | Optional; manual hours for the planned visit day                   |
| Entry cost               | Optional; independent of the budget in this stage                  |
| Location / external link | Optional                                                           |
| Priority                 | Must-do, Would-like-to-do, Optional; default is Would-like-to-do   |
| Notes                    | Optional                                                           |

Opening hours may run past midnight, such as `18:00–02:00`.

### Opening-hours warnings

- No start time: no warning.
- Start time without a duration: warn when the start is one hour or less before closing.
- Start time and duration: warn when calculated end time is after closing.

## Current implementation

- The API and database support nullable dates and categories, duration in minutes, opening/closing hours, location, external links, priority, and notes.
- Validation prevents a start time without a date and dates outside a dated trip's range. Draft trips save activities as unscheduled.
- The activity form has no automatic date, uses an `HH:MM` duration field, and defaults to no category and Would-like-to-do priority.
- The itinerary uses day sections with activity cards. Timed activities precede untimed activities; Unscheduled is last and ordered by priority then creation time.
- The main Add item action opens a blank form under the header. A day's add icon opens a form under that day with its date preselected.
- Activity cards are not clickable; Edit and Delete are the only row actions.
- Cards expand inline to show opening hours, location, an external link, and notes when those details exist.
- Opening-hours warnings are informational and appear when an activity starts within an hour of closing or ends after closing, including closing times after midnight.
- Delete is optimistic: the item is hidden, an Undo action is available for five seconds, and the API delete runs only after that period. Failed deletes restore the item.
- When trip dates change, activities shift with the start date for trips that remain the same length or grow. Activities outside a shortened trip's dates are moved to Unscheduled and the user is informed.

## First-stage implementation tasks

### Verification (deferred)

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
- [ ] Add an Activity or Sport category, for activities such as skiing.
- [ ] Make opening-hours inputs available only for categories where they make sense, and design category-specific input forms. Hiking, beach time, and city walks should not ask for opening hours.

## Relevant current files

- Frontend component: `frontend/src/components/Itinerary.tsx`
- Itinerary styles: `frontend/src/components/Itinerary.css`
- Frontend types: `frontend/src/types/itineraryItem.ts`
- Backend model: `backend/Models/ItineraryItem.cs`
- API endpoints: `backend/Endpoints/ItineraryEndpoints.cs`
- Validation: `backend/Validation/ItineraryItemValidation.cs`
- Create/update contract: `backend/Contracts/CreateItineraryItemRequest.cs`
