import { useOutletContext } from "react-router-dom";
import { Itinerary } from "../features/itinerary/Itinerary";
import type { TripWorkspaceContext } from "./Workspace";

/** Connects the itinerary feature to the shared trip workspace. */
export function TripItineraryPage() {
    const { trip, setHasUnsavedForm } = useOutletContext<TripWorkspaceContext>();
    return <Itinerary trip={trip} setHasUnsavedForm={setHasUnsavedForm} />;
}
