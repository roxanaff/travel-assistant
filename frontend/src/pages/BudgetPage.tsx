// Connects the budget URL to the current trip. The planned-cost and expense
// sections live under components/budget/.
import { useOutletContext } from "react-router-dom";

import { TripBudget } from "../components/budget/TripBudget";
import type { TripWorkspaceContext } from "./Workspace";

/** Route adapter for the budget URL; the feature component owns the budget UI and interactions. */
export function TripBudgetPage() {
    const workspace = useOutletContext<TripWorkspaceContext>();
    return <TripBudget {...workspace} />;
}
