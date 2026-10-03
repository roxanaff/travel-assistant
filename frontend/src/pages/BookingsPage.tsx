import { useOutletContext } from "react-router-dom";
import { Bookings } from "../components/bookings/Bookings";
import type { TripWorkspaceContext } from "./Workspace";

/** Connects the bookings feature to the shared trip workspace. */
export function TripBookingsPage() {
    const { trip, setHasUnsavedForm } = useOutletContext<TripWorkspaceContext>();
    return <Bookings trip={trip} setHasUnsavedForm={setHasUnsavedForm} />;
}

