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
- Every expense requires an amount; its name is optional and defaults to `Cost item` when blank.
- Category is optional and empty by default.
- Date defaults to today and can be cleared.
- Users may record pre-trip and during-trip expenses.
- Expenses can be grouped by category in fixed category order, with **Uncategorised** last, or by expense day with **Undated** last.
- Within a category, dated expenses are newest first and undated expenses are last.
- Users can edit, rename, and delete expenses. Delete has no confirmation dialog and supplies a short-lived Undo action.
- `Actual remaining = target budget − total actual expenses`.
- Actual remaining is independent from theoretical remaining.

### Categories

Planned-budget categories, in display order:

1. Travel to/from
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
- [x] Planned costs are stored separately from expenses and have their own CRUD API.
- [x] Planned costs use the agreed category list, including Travel to/from and Emergency buffer. A blank name is stored as `Cost item`.
- [x] The Planned budget UI groups populated categories, calculates category and overall totals, supports target-budget comparison, and provides add, edit, delete, and five-second Undo actions.
- [x] The user-facing expense tracking section supports optional categories, an initially-today date that can be cleared, pre-trip dates, Category/Day grouping, newest-first ordering, totals, target-budget comparison, and five-second Undo.
- [x] Planned-cost rows can be copied to Expenses with today's date. Each copied expense stays linked to its source planned cost so it cannot be added twice; Emergency-buffer rows have no copy action because that category is not valid for expenses.

## Phase 2 — Planned budget implementation tasks

### A. Data model and API

All planned-cost data and API tasks are complete. Existing expense records are intentionally left unchanged; no historical `GettingThereCost` field exists to migrate.

### B. Planned budget UI

All planned-budget UI tasks are complete.

### C. Phase 2 verification

- [ ] Test unnamed and named planned-cost entries.
- [ ] Test category totals, overall totals, unused target money, and over-budget plans.
- [ ] Test trips without a target budget.
- [ ] Test the Emergency buffer category is available only for planned costs.
- [ ] Test deletion Undo, expiry, and API failure.

## Phase 3 — Expense tracking implementation tasks

### A. Expense model and form

All expense model and form tasks are complete. `BudgetItem` remains the internal backend type for now, while the UI and API behavior use the user-facing term Expenses.

### B. Expenses view and calculations

All expense-view and calculation tasks are complete. Planned costs and expenses remain separate and are not linked to itinerary activity costs.

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

- Budget page: `frontend/src/pages/TripBudgetPage.tsx`
- Planned-budget UI: `frontend/src/components/PlannedBudget.tsx`
- Expense UI: `frontend/src/components/ExpenseTracking.tsx`
- Expense types: `frontend/src/types/budgetItem.ts`
- Backend model: `backend/Models/BudgetItem.cs`
- Expense API endpoints: `backend/Endpoints/BudgetItemEndpoints.cs`
- Planned-cost API endpoints: `backend/Endpoints/PlannedCostEndpoints.cs`
- Planned-cost contract and validation: `backend/Contracts/CreatePlannedCostRequest.cs`, `backend/Validation/PlannedCostValidation.cs`
- Expense contract and validation: `backend/Contracts/CreateBudgetItemRequest.cs`, `backend/Validation/BudgetItemValidation.cs`
- Data migrations: `backend/Migrations/20260819083911_AddPlannedCosts.cs`, `backend/Migrations/20260819095049_LinkExpensesToPlannedCosts.cs`
