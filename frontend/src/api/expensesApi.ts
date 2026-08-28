import type { Expense } from "../types/expense";
import { apiBaseUrl, apiFetch } from "./travelAssistantApi";

export type ExpenseRequest = {
    name: string;
    category: string | null;
    amount: number;
    expenseDate: string | null;
    plannedCostId: string | null;
};

const expensesUrl = (tripId: string) =>
    `${apiBaseUrl}/api/trips/${tripId}/expenses`;

export async function getExpenses(tripId: string): Promise<Expense[]> {
    const response = await apiFetch(expensesUrl(tripId));
    if (!response.ok) throw new Error("Could not load expenses.");
    return response.json();
}

export async function createExpense(
    tripId: string,
    request: ExpenseRequest,
): Promise<Expense> {
    const response = await apiFetch(expensesUrl(tripId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    if (!response.ok)
        throw new Error(
            (await response.text()) || "Could not save this expense.",
        );

    return response.json();
}

export async function updateExpense(
    tripId: string,
    itemId: string,
    request: ExpenseRequest,
): Promise<Expense> {
    const response = await apiFetch(`${expensesUrl(tripId)}/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    if (!response.ok)
        throw new Error(
            (await response.text()) || "Could not save these changes.",
        );

    return response.json();
}

export async function deleteExpense(
    tripId: string,
    itemId: string,
): Promise<boolean> {
    const response = await apiFetch(`${expensesUrl(tripId)}/${itemId}`, {
        method: "DELETE",
    });
    if (response.status === 404) return false;
    if (!response.ok) throw new Error("Could not delete this expense.");
    return true;
}
