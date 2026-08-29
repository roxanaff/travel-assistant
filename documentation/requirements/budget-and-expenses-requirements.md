# Budget and Expenses — Stage 1 Requirements

## Purpose

Budget and expenses provide separate views of expected and actual trip spending against an optional target budget.

## Product behavior

### Target budget

- The target budget is an optional spending limit or goal. It is edited in trip details and never changes automatically.
- Without a target budget, planning and expense tracking remain available but remaining-budget and over-budget states
  are hidden.

### Planned costs

- Planned costs are grouped by category. A category appears only when it contains an entry, and has a `+` action for
  adding another entry.
- Each entry has a required amount and an optional name. Blank names are stored as `Cost item`.
- Category totals are calculated from their entries and are not edited separately.
- Entries can be edited or deleted. Deletion has a five-second Undo period.
- Theoretical remaining is `target budget − total planned costs`; a negative value is shown as over budget.

### Expenses

- Each expense has a required amount, optional name, optional category, and optional date. Blank names are stored as
  `Cost item`.
- The date starts as today and can be cleared. Pre-trip expenses are supported.
- Expenses can be displayed ungrouped or grouped by category or date. Categories use the fixed order below;
  Uncategorised and Undated appear last. When grouped by category, each expense displays its date; when grouped by date,
  it displays its category; ungrouped expenses display both where available.
- The `+` action in a category group starts an expense with that category selected. The same action in a date group
  starts an expense with that date selected; Undated starts one with no date.
- Within a category, dated expenses are newest first and undated expenses are last.
- Expenses can be edited or deleted. Deletion has a five-second Undo period.
- Actual remaining is `target budget − total actual expenses` and is independent from theoretical remaining.

### Categories

Planned costs use: Travel to/from, Accommodation, Local transport, Food, Activities & museums, Bars & nightlife,
Shopping, Emergency buffer, and Other.

Expenses use the same list except Emergency buffer. Planned-cost rows can be copied to expenses with today's date. A
linked row displays `Added · Undo`; Undo removes the linked expense and makes the planned cost available to add again.
If the linked expense was already deleted from the expense list, the Undo action remains idempotent and completes
without restoring stale expense data.

Across both sections, each item places its name and a prominent, right-aligned amount on the first row. Applicable
secondary information remains left-aligned below it.

## Open Stage 1 work

No additional budget-specific UX work is currently planned for Stage 1.

## Verification

- [ ] Verify named and unnamed planned costs, category totals, overall totals, unallocated money, and over-budget plans.
- [ ] Verify trips without a target budget and that Emergency buffer is unavailable for expenses.
- [ ] Verify uncategorised, pre-trip, dated, and undated expenses; category ordering; day grouping; and newest-first
      ordering.
- [ ] Verify theoretical and actual remaining independently, including Undo expiry and API failure recovery.

## Constraints

Activity entry costs are independent from planned costs and expenses during Stage 1.

## Beyond Stage 1

Future budget and expense directions are recorded in [budget and packing](../future/budget-and-packing.md) and
[accounts and collaboration](../future/accounts-and-collaboration.md).
