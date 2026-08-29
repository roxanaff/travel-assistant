import { useEffect, useState } from "react";

import { ExpenseTracking } from "./ExpenseTracking";
import { PlannedBudget } from "./PlannedBudget";
import type { TripWorkspaceContext } from "../../pages/Workspace";

import "./TripBudget.css";

/** Combines independent planned-budget and expense-tracking sections for one trip. */
export function TripBudget({ trip, setHasUnsavedForm }: TripWorkspaceContext) {
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
                onExpenseAdded={() =>
                    setExpenseRefreshKey((current) => current + 1)
                }
            />
            <ExpenseTracking
                trip={trip}
                onFormOpenChange={setHasExpenseForm}
                refreshKey={expenseRefreshKey}
            />
        </div>
    );
}
