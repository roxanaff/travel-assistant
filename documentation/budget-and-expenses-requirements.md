# Budget and Expenses — Requirements and Task List

This document covers the Budget & expenses workspace section. Planned costs and recorded expenses are separate datasets that use the same optional Target budget.

## Agreed behaviour

### Target budget

- The Target budget is optional and is the user's spending limit/goal.
- It never changes automatically when planned costs or expenses change.
- The user may manually edit it in Trip Details.
- If no target exists, planned costs and expenses still work; remaining-budget and over-budget states are hidden.

### Planned budget by category

- Planned costs are grouped by category.
- A category appears only after it has at least one entry.
- Each shown category has a `+` action to add an entry directly to that category.
- Every planned-cost entry has a required amount and an optional name.
- The category total is calculated from its entries; there is no separate editable category total.
- Users can edit, rename, and delete entries. Delete has no confirmation dialog and supplies a short-lived Undo action.
- `Theoretical remaining = target budget − total planned costs`.
- A negative theoretical remaining value is displayed as over budget.
- Unallocated target money is allowed, and planned costs may exceed the target.

### Expenses

- Expense tracking is implemented after the planned budget by category.
- Every expense requires a name and amount.
- Category is optional and empty by default.
- Date defaults to today and can be cleared.
- Users may record pre-trip and during-trip expenses.
- Expenses are grouped by category in fixed category order; **Uncategorised** is last.
- Within a category, dated expenses are newest first and undated expenses are last.
- Users can edit, rename, and delete expenses. Delete has no confirmation dialog and supplies a short-lived Undo action.
- `Actual remaining = target budget − total actual expenses`.
- Actual remaining is independent from theoretical remaining.

### Categories

Planned-budget categories, in display order:

1. Travel to/from destination
2. Accommodation
3. Local transport
4. Food
5. Activities & museums
6. Bars & nightlife
7. Shopping
8. Emergency buffer
9. Other

Expenses use the same list except **Emergency buffer**. Entries without a category appear under **Uncategorised**, last.

## Current implementation — complete or already available

- [x] The API supports listing, creating, updating, and deleting the current `BudgetItem` records.
- [x] The existing UI supports add, inline edit, and delete for those records.
- [x] The existing record has name, amount, category, and optional expense date fields.
- [x] The current page calculates one total spent/remaining value against the trip budget.

## Phase 2 — Planned budget implementation tasks

### A. Data model and API

- [ ] Make the trip Target budget nullable.
- [ ] Add a planned-cost entity distinct from recorded expenses.
- [ ] Migrate or replace the current `BudgetItem` model so expenses and planned costs cannot be confused.
- [ ] Add the agreed category set and support a null category.
- [ ] Ensure Emergency buffer can be used for planned costs but not expenses.
- [ ] Add CRUD endpoints for planned-cost entries.
- [ ] Update frontend types, API contracts, database migrations, and validation.
- [ ] Decide how existing `GettingThereCost` data is migrated into the new category model.

### B. Planned budget UI

- [ ] Add the Planned budget view to `/trips/:id/budget`.
- [ ] Group entries by category in the agreed fixed order.
- [ ] Hide categories with no entries.
- [ ] Provide an action to add a first entry and a `+` action within each visible category.
- [ ] Allow a planned-cost name to be blank while requiring a positive amount.
- [ ] Calculate each category total and total planned costs from entries only.
- [ ] Show Target budget, total planned costs, and theoretical remaining when a target exists.
- [ ] Show an accessible over-budget state for a negative theoretical remaining value.
- [ ] Support edit, rename, delete, and short-lived Undo for planned costs.

### C. Phase 2 verification

- [ ] Test unnamed and named planned-cost entries.
- [ ] Test category totals, overall totals, unused target money, and over-budget plans.
- [ ] Test trips without a target budget.
- [ ] Test the Emergency buffer category is available only for planned costs.
- [ ] Test deletion Undo, expiry, and API failure.

## Phase 3 — Expense tracking implementation tasks

### A. Expense model and form

- [ ] Rename the user-facing current BudgetItem concept to Expense.
- [ ] Require name and positive amount.
- [ ] Make category nullable with no selected default.
- [ ] Default the date to today and allow the user to clear it.
- [ ] Preserve support for pre-trip expense dates.
- [ ] Add edit, rename, delete, and short-lived Undo.

### B. Expenses view and calculations

- [ ] Group expenses by category in the agreed order, with Uncategorised last.
- [ ] Order dated entries newest first and undated entries last within each group.
- [ ] Show category subtotals and total actual spending.
- [ ] When a target exists, calculate and display actual remaining and its over-budget state.
- [ ] Keep planned costs and actual expenses separate; do not automatically link activity costs yet.

### C. Phase 3 verification

- [ ] Test uncategorised, pre-trip, dated, and undated expenses.
- [ ] Test category ordering and newest-first ordering.
- [ ] Test actual remaining independently from theoretical remaining.
- [ ] Test expenses with no Target budget.

## Later features

- [ ] Expected dates on planned costs, plus close-date reminders or visual indicators.
- [ ] Per-day and per-traveller budget summaries.
- [ ] Link activity entry costs to planned-cost entries with a clear source-of-truth rule.
- [ ] Negative expenses and refunds.
- [ ] Receipt capture, upload, and OCR.
- [ ] Multiple currencies and exchange-rate conversion.
- [ ] Shared payments, splits, and settlements.

## Relevant current files

- Existing budget/expense UI: `frontend/src/pages/TripBudgetPage.tsx`
- Frontend types: `frontend/src/types/budgetItem.ts`
- Backend model: `backend/Models/BudgetItem.cs`
- API endpoints/validation: `backend/Program.cs`
- Create/update contract: `backend/Contracts/CreateBudgetItemRequest.cs`
