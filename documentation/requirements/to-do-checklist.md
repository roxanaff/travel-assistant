# To-do Checklist

## Purpose

The To-do checklist helps a traveller track tasks that must be completed before, during, or after a trip, such as
booking transport, arranging documents, and checking in for a flight.

It is a manual, trip-specific checklist. It follows the established Packing interaction model where that behaviour is
useful, without treating tasks as packing items.

## Workspace

- Add a **To-do** section to the trip workspace.
- Route: `/trips/:id/todo`
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

### Deadline

The deadline represents **Complete by**. A separate Start-by deadline is not included in the first version.

When a trip has a start date, a new task's deadline defaults to that date. Otherwise, the deadline starts blank. The
user can add, edit, or clear a deadline without restriction.

## Draft trips and changed dates

Tasks can be created for Draft trips.

- Deadline input remains available when a trip has no dates.
- The page explains that adding trip dates in Details prefills future task deadlines with the trip start date.
- When complete trip dates are added, tasks without deadlines are assigned the trip start date automatically.
- If trip dates are removed later, stored deadlines remain saved and editable.

Deadlines do not move automatically when trip dates change. If at least one task has a saved deadline, the app shows a
dismissible message:

> Trip dates changed. Existing task deadlines were kept, so please review them.

The message remains visible until dismissed. It is not shown again unless the trip dates change another time. Resetting
the checklist clears any pending review reminder.

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

## Display, grouping, and progress

- One underlying task list is displayed as **To do** and **Done** sections.
- Completing or reopening a task moves it between sections without changing its saved manual order.
- Each task shows its name, optional category, and deadline when one is set.
- A whole-page **Group by** control offers:
    - Ungrouped
    - Category
- The selected grouped or ungrouped view is remembered separately for each trip.
- In grouped view, a category heading replaces the repeated category detail on each row. Each named category heading has
  a `+` action that opens an item form with that category selected.
- To do and Done appear side by side on desktop and stack on narrow screens.
- The page header always shows overall completion, for example `8 of 14 complete`.

## Add, edit, reorder, and delete

- Users can add and edit tasks.
- The name is required.
- Add and edit forms use the established form keyboard behaviour: focus on open, Enter submits a single-line form,
  Escape cancels an unchanged form, and changed forms require discard confirmation.
- Tasks can be reordered from a drag grip only within their current To do or Done section. In grouped view, reordering
  stays within the current category group.
- A drop outside a valid position restores the original order.
- Adding through a category `+` in the Done section creates a Done task in that category; the equivalent Packing action
  creates a Packed item.
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
