import { useOutletContext } from "react-router-dom";
import { Itinerary } from "../components/Itinerary";
import type { TripWorkspaceContext } from "./TripWorkspace";

/** Connects the itinerary feature to the shared trip workspace. */
export function TripItineraryPage() {
  const { trip, setHasUnsavedForm } = useOutletContext<TripWorkspaceContext>();
  return <Itinerary trip={trip} setHasUnsavedForm={setHasUnsavedForm} />;
}
