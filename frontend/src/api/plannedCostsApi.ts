import type { PlannedCost, PlannedCostCategory } from "../types/plannedCost";
import { apiBaseUrl } from "./travelAssistantApi";

export type PlannedCostRequest = { name: string | null; category: PlannedCostCategory | null; amount: number };
const plannedCostsUrl = (tripId: string) => `${apiBaseUrl}/api/trips/${tripId}/planned-costs`;
export async function getPlannedCosts(tripId: string): Promise<PlannedCost[]> { const response = await fetch(plannedCostsUrl(tripId)); if (!response.ok) throw new Error("Could not load planned costs."); return response.json(); }
export async function createPlannedCost(tripId: string, request: PlannedCostRequest): Promise<PlannedCost> { const response = await fetch(plannedCostsUrl(tripId), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) }); if (!response.ok) throw new Error((await response.text()) || "Could not save this planned cost."); return response.json(); }
export async function updatePlannedCost(tripId: string, costId: string, request: PlannedCostRequest): Promise<PlannedCost> { const response = await fetch(`${plannedCostsUrl(tripId)}/${costId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) }); if (!response.ok) throw new Error((await response.text()) || "Could not save these changes."); return response.json(); }
export async function deletePlannedCost(tripId: string, costId: string): Promise<void> { const response = await fetch(`${plannedCostsUrl(tripId)}/${costId}`, { method: "DELETE" }); if (!response.ok) throw new Error("Could not delete this planned cost."); }
