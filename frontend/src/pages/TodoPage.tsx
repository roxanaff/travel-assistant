// Connects the to-do URL to its checklist component and the current trip.
// The actual checklist behavior lives in components/todo/TodoChecklist.tsx.
import { useOutletContext } from "react-router-dom";

import { TodoChecklist } from "../components/todo/TodoChecklist";
import type { TripWorkspaceContext } from "./Workspace";

/** Route adapter for the to-do URL; the feature component owns the checklist UI and interactions. */
export function TripTodoPage() {
    const workspace = useOutletContext<TripWorkspaceContext>();

    return <TodoChecklist key={workspace.trip.id} {...workspace} />;
}
