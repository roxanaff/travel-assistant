import type { BudgetItem } from "../types/budgetItem";
import { apiBaseUrl } from "./travelAssistantApi";

export type BudgetItemRequest = { 
    name: string; 
    category: string | null; 
    amount: number; 
    expenseDate: string | null; 
    plannedCostId: string | null 
};

const budgetItemsUrl = (tripId: string) => `${apiBaseUrl}/api/trips/${tripId}/budget-items`;

export async function getBudgetItems(tripId: string): Promise<BudgetItem[]> { 
    const response = await fetch(budgetItemsUrl(tripId)); 
    if (!response.ok) 
        throw new Error("Could not load expenses."); 
    return response.json(); 
}

export async function createBudgetItem(tripId: string, request: BudgetItemRequest): Promise<BudgetItem> { 
    const response = await fetch(
        budgetItemsUrl(tripId), 
        { 
            method: "POST", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify(request) 
        }
    ); 
    if (!response.ok) 
        throw new Error((await response.text()) || "Could not save this expense."); 
    
    return response.json(); 
}

export async function updateBudgetItem(tripId: string, itemId: string, request: BudgetItemRequest): Promise<BudgetItem> { 
    const response = await fetch(
        `${budgetItemsUrl(tripId)}/${itemId}`, 
        { 
            method: "PUT", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify(request) 
        }
    ); 
    if (!response.ok) 
        throw new Error((await response.text()) || "Could not save these changes."); 
    
    return response.json(); 
}

export async function deleteBudgetItem(tripId: string, itemId: string): Promise<void> { 
    const response = await fetch(
        `${budgetItemsUrl(tripId)}/${itemId}`, 
        { method: "DELETE" }
    ); 
    if (!response.ok) 
        throw new Error("Could not delete this expense."); 
}
