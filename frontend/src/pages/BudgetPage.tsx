import { useOutletContext } from "react-router-dom";

import { TripBudget } from "../features/budget/TripBudget";
import type { TripWorkspaceContext } from "./Workspace";

/** Route adapter for the budget URL; the feature component owns the budget UI and interactions. */
export function TripBudgetPage() {
    const workspace = useOutletContext<TripWorkspaceContext>();
    return <TripBudget {...workspace} />;
}
