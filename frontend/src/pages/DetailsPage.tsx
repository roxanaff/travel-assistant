import { useOutletContext } from "react-router-dom";

import { TripDetails } from "../components/details/TripDetails";
import type { TripWorkspaceContext } from "./Workspace";

/** Route adapter for trip details; the feature owns editing and deletion behaviour. */
export function TripDetailsPage() {
    const workspace = useOutletContext<TripWorkspaceContext>();
    return <TripDetails {...workspace} />;
}
