import { useOutletContext } from "react-router-dom";

import { TripSetup } from "../components/setup/TripSetup";
import type { TripWorkspaceContext } from "./Workspace";

/** Route adapter for trip details; the setup feature owns editing and deletion behaviour. */
export function TripSetupPage() {
    const workspace = useOutletContext<TripWorkspaceContext>();
    return <TripSetup {...workspace} />;
}
