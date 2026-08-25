# Itinerary — Stage 1 Requirements

## Purpose

The itinerary is a manual, ordered activity plan for one trip. It supports both confirmed plans and unscheduled ideas.

## Product behavior

- Only an activity name is required. Activities can be scheduled or unscheduled.
- Draft trips allow unscheduled activities only. Scheduled dates must fall within a trip's dates.
- Optional activity fields are category, date, start time, estimated duration, opening/closing hours, entry cost, location or external link, priority, and notes.
- Categories are Museum, Tour, Event, Food, Beach, Bar, Attraction, and Other. Priority defaults to Would-like-to-do.
- Start time requires a date. Duration is entered as `HH:MM` and stored as total minutes.
- Opening hours apply to the planned visit day and can run past midnight.
- The itinerary is an ordered list, not a calendar. Dated activities appear in vertical day sections; Unscheduled appears last.
- Timed activities are ordered chronologically, then dated untimed activities. Unscheduled activities are ordered by priority, then creation order.
- Activities that run past midnight appear only on their start date.
- Cards expand inline for available details. Edit and Delete are the only card actions.
- Delete is optimistic and can be undone for five seconds. A failed deletion restores the activity.
- An informational warning appears when a timed visit is within one hour of closing or would finish after closing.
- When trip dates move without shortening the trip, scheduled activities shift by the same number of days. Activities outside a shortened trip become unscheduled.

## Open Stage 1 work

Form focus, keyboard behavior, and opening-hours control improvements are recorded in [experience and quality requirements](experience-and-quality-requirements.md).

## Verification

- [ ] Verify Draft, Upcoming, Ongoing, and Past trips.
- [ ] Verify unscheduled, dated untimed, and timed activities with and without duration.
- [ ] Verify opening hours that close the next day and both opening-hours warnings.
- [ ] Verify trip-date shifts, trip shortening, Undo expiry, and API failure recovery.

## Constraints

Activity entry cost is independent from the budget during Stage 1.

## Beyond Stage 1

Future itinerary directions are recorded in [personal trip planning](../future/personal-trip-planning.md).
