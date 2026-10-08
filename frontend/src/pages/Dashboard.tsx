// Connects the home URL to the trip dashboard. The list and its create/edit
// workflow live in components/trips/TripsDashboard.tsx.
import { TripsDashboard } from "../components/trips/TripsDashboard";

/** Route page for the dashboard URL; the trips feature owns the dashboard workflow. */
export function TripDashboard() {
    return <TripsDashboard />;
}
