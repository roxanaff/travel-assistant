import { useOutletContext } from "react-router-dom";

import { PackingChecklist } from "../components/packing/PackingChecklist";
import type { TripWorkspaceContext } from "./Workspace";

/**
 * Route adapter for the packing URL. The feature component owns the checklist UI and interactions;
 * this page only connects it to the trip data shared by the workspace.
 */
export function TripPackingPage() {
    const workspace = useOutletContext<TripWorkspaceContext>();

    return <PackingChecklist {...workspace} />;
}
