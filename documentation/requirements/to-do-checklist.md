# To-do Checklist

## Purpose

The To-do checklist helps a traveller track tasks that must be completed before, during, or after a trip, such as
booking transport, arranging documents, and checking in for a flight.

It is a manual, trip-specific checklist. It follows the established Packing interaction model where that behaviour is
useful, without treating tasks as packing items.

## Workspace

- Add a **To-do** section to the trip workspace.
- Route: `/trips/:id/todo`
- The planned workspace order is:

  `Details · Itinerary · Bookings · Budget & expenses · To-do · Packing`

- The page handles loading, not-found, and API-error states consistently with existing workspace pages.
- Switching away from an unsaved add or edit form follows the existing unsaved-changes confirmation behaviour.

## Task data

Each task has:

- A required name.
- An optional category.
- An optional deadline date.
- A completed state.
- A saved manual order.
- Creation timestamp.

The only task states are **To do** and **Done**. A task that is no longer relevant can be deleted; Skipped and Cancelled
states are not included.

### Deadline and When

The deadline represents **Complete by**. A separate Start-by deadline is not included in the first version.

When a trip has complete dates, a new task's deadline defaults to the trip start date. The user can edit the date
without restriction.

The app derives **When** from a task's deadline and the trip dates. It is not a user-editable task field:

- A deadline on or before the trip start is **Before trip**.
- A deadline after the trip start through the trip end is **During trip**.
- A deadline after the trip end is **After trip**.

## Draft trips and changed dates

Tasks can be created for Draft trips.

- When a trip has no complete dates, deadline input is unavailable.
- The task does not show a When detail while trip dates are unavailable.
- The page explains: “Add trip dates in Details to set deadlines and organise tasks around the trip.”
- When complete trip dates are added, tasks without deadlines are assigned the trip start date automatically.
- If trip dates are removed later, stored deadlines remain saved, but deadline editing and When details are hidden until
  complete trip dates exist again.

Deadlines do not move automatically when trip dates change. The app recalculates When using the changed trip dates and
shows a dismissible message:

> Trip dates have changed. Check that your task deadlines are still correct.

The message remains visible until closed with its `×` control. It is not shown again unless the trip dates change
another time.

## Categories

Categories are optional. The initial fixed list is:

- Travel & transport
- Accommodation
- Documents & money
- Bookings & activities
- Health
- Connectivity
- Before leaving
- Other

Custom and free-text categories are deferred.

## Display, grouping, sorting, and progress

- One underlying task list is displayed as **To do** and **Done** sections.
- Completing or reopening a task moves it between sections without changing its saved manual order.
- Each task shows its name, optional category, deadline when available, and When detail when it can be derived.
- A whole-page **Group by** control offers:
  - None
  - When
  - Category
- In ungrouped view, When appears as secondary task detail.
- The grouping modes are mutually exclusive; the first version does not group by both When and Category.
- A whole-page sort control offers:
  - Manual order, the default
  - Deadline, earliest first
- Tasks without deadlines sort last and retain manual order among themselves.
- Done tasks follow the same selected sort.
- To do and Done appear side by side on desktop and stack on narrow screens.
- The page header always shows overall completion, for example `8 of 14 complete`.
- In ungrouped view, no additional progress is shown.
- When grouped by When or Category, each group heading shows a compact count, for example
  `Before trip — 5 of 8 complete` or `Documents & money — 3 of 5 complete`.

## Add, edit, reorder, and delete

- Users can add and edit tasks.
- The name is required.
- Add and edit forms use the established form keyboard behaviour: focus on open, Enter submits a single-line form,
  Escape cancels an unchanged form, and changed forms require discard confirmation.
- Tasks can be reordered from a drag grip only within their current To do or Done section.
- Dragging does not move a task between Before trip, During trip, or After trip; those are derived from the deadline.
- A drop outside a valid position restores the original order.
- Individual deletion is optimistic and offers Undo for five seconds.
- A failed individual deletion restores the task and reports the failure.

### Reset checklist

A **Reset checklist** action is available after the checklist has started.

- Reset opens an app-styled confirmation dialog warning that all current tasks will be permanently removed.
- Confirming deletes all tasks and returns the page to the initial choice: **Use default list** or **Start empty**.
- Reset has no Undo because the user confirmed the destructive action.

## Empty checklist and default list

An empty checklist offers **Use default list** or **Start empty**.

Choosing either option records that the user has started the checklist. Default items are copied into the trip and
remain fully editable.

The user cannot apply the default list after choosing Start empty, and cannot apply it twice. Resetting the checklist is
the way to return to the initial choice.

| Category              | Default tasks                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| Travel & transport    | Book outbound travel; Book return travel; Check check-in requirements; Plan airport/station transfer        |
| Accommodation         | Book accommodation; Pay for accommodation; Save accommodation address and check-in details                  |
| Documents & money     | Check passport/ID validity; Check visa/entry requirements; Arrange travel insurance; Prepare payment method |
| Bookings & activities | Reserve priority activities; Buy required tickets                                                           |
| Health                | Check medication needs                                                                                      |
| Connectivity          | Arrange roaming/eSIM; Download offline maps                                                                 |
| Before leaving        | Share itinerary/contact details; Check weather forecast; Complete packing                                   |

The default list is deliberately generic. It does not assume every trip needs a visa, flight, insurance, roaming, or
tickets.

The default list does not include savings tasks. When savings progress is added later, it can optionally add a relevant
task to the checklist.

## Access and ownership

- Every task belongs to one trip.
- Every trip-scoped To-do endpoint enforces the existing account ownership rules.
- Another account's trip or task is treated as not found.

## Deferred scope

The first version does not include:

- Start-by deadlines or relative deadlines, such as 24 hours before departure.
- Notes or subtasks.
- Notifications, reminders, or deadline alerts.
- Booking links or automatic task completion from booking changes.
- User-editable templates.
- Custom categories.
- Shared/group trip task assignment.
- Dashboard or workspace-overview progress summaries.
