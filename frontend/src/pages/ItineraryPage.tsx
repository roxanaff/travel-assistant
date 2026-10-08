// Connects the itinerary URL to the current trip. For activity forms, lists,
// and booking links, look in components/itinerary/Itinerary.tsx.
import { useOutletContext } from "react-router-dom";
import { Itinerary } from "../components/itinerary/Itinerary";
import type { TripWorkspaceContext } from "./Workspace";

/** Connects the itinerary feature to the shared trip workspace. */
export function TripItineraryPage() {
    const { trip, setHasUnsavedForm } =
        useOutletContext<TripWorkspaceContext>();
    return <Itinerary trip={trip} setHasUnsavedForm={setHasUnsavedForm} />;
}
