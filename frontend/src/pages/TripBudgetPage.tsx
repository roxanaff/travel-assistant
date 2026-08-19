import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { ExpenseTracking } from "../components/ExpenseTracking";
import { PlannedBudget } from "../components/PlannedBudget";
import type { TripWorkspaceContext } from "./TripWorkspace";

import "./TripBudgetPage.css";

/** Combines independent planned-budget and expense-tracking sections for one trip. */
export function TripBudgetPage() {
  const { trip, setHasUnsavedForm } = useOutletContext<TripWorkspaceContext>();
  const [hasPlannedCostForm, setHasPlannedCostForm] = useState(false);
  const [hasExpenseForm, setHasExpenseForm] = useState(false);
  const [expenseRefreshKey, setExpenseRefreshKey] = useState(0);

  useEffect(() => {
    setHasUnsavedForm(hasPlannedCostForm || hasExpenseForm);
    return () => setHasUnsavedForm(false);
  }, [hasExpenseForm, hasPlannedCostForm, setHasUnsavedForm]);

  return (
    <div className="trip-budget-page">
      <PlannedBudget
        trip={trip}
        onFormOpenChange={setHasPlannedCostForm}
        onExpenseAdded={() => setExpenseRefreshKey((current) => current + 1)}
      />
      <ExpenseTracking
        trip={trip}
        onFormOpenChange={setHasExpenseForm}
        refreshKey={expenseRefreshKey}
      />
    </div>
  );
}
