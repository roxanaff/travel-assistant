# Itinerary — Stage 1 Feature

## Purpose

The itinerary is a manual, ordered activity plan for one trip. It supports both confirmed plans and unscheduled ideas.

## Product behavior

- Only an activity name is required. Activities can be scheduled or unscheduled.
- Draft trips allow unscheduled activities only. Scheduled dates must fall within a trip's dates.
- Optional activity fields are category, date, start time, estimated duration, opening/closing hours, entry cost,
  location or external link, priority, and notes.
- Categories are Museum, Tour, Event, Food, Beach, Bar, Attraction, and Other. Priority defaults to Want-to-do.
- Time requires a date. Duration uses the same native hours-and-minutes control and is stored as total minutes.
- A blank new-item date remains unset. Its native date picker is restricted to the trip's date range, but the initial
  date displayed by that browser-controlled picker can differ by device; for example, desktop browsers may show the trip
  start while phone browsers may show today.
- The activity form opens with optional details collapsed. Its essential fields are arranged as Name, Price, and
  Priority, followed by Date, Time, and Duration. Category and opening hours share the first optional row; location and
  link share the next. Notes occupies a full row. Optional-field labels use dark gray rather than the primary label
  colour.
- Opening hours apply to the planned visit day and can run past midnight.
- The itinerary is an ordered list, not a calendar. Dated activities appear in vertical day sections; Unscheduled
  appears last.
- Timed activities are ordered chronologically, then dated untimed activities. Unscheduled activities are ordered by
  priority, then creation order.
- Activities that run past midnight appear only on their start date.
- Cards use an icon-based expand control for available secondary details. Compact cards use separate rows for the
  activity name, unlabelled category and priority, and labelled time or cost details; they include time rather than
  repeating the day-section date. Expanded cards show only details that are not already shown in the compact card. Edit
  and Delete remain available as icon actions.
- An Expand all / Collapse all control affects every card with available secondary details.
- Expanded link details display the actual URL, with wrapping for long links.
- Delete is optimistic and can be undone for five seconds. A failed deletion restores the activity.
- An informational warning appears when a timed visit is within one hour of closing or would finish after closing.
- When trip dates move without shortening the trip, scheduled activities shift by the same number of days. Activities
  outside a shortened trip become unscheduled.

## Beyond Stage 1

Future itinerary directions are recorded in the [product roadmap](../roadmap.md).
