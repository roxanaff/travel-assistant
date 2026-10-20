import { apiBaseUrl, apiFetch, throwIfApiError } from "./travelAssistantApi";

export type LinkedRecordKind = "Booking" | "Activity" | "Expense" | "PlannedCost";

export type LinkedRecordReview = {
    id: string;
    revision: string;
    sourceKind: LinkedRecordKind;
    sourceId: string;
    sourceName: string;
    targetKind: LinkedRecordKind;
    targetId: string;
    targetName: string;
    role: "General" | "Outbound" | "Return" | null;
    isMismatch: boolean;
    changes: Array<{ field: string; before: string | number | null; after: string | number | null }>;
    updateLabel: string;
    proposedAmount: number | null;
    blockedReason: string | null;
};

export async function getLinkedRecordReviews(tripId: string): Promise<LinkedRecordReview[]> {
    const response = await apiFetch(`${apiBaseUrl}/api/trips/${tripId}/linked-record-reviews`);
    await throwIfApiError(response, "Could not load linked-record warnings.");
    return response.json();
}

export async function resolveLinkedRecordReview(tripId: string, review: LinkedRecordReview, action: "apply" | "keep") {
    const response = await apiFetch(`${apiBaseUrl}/api/trips/${tripId}/linked-record-reviews/${review.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision: review.revision, action }),
    });
    await throwIfApiError(response, "Could not resolve this linked-record warning.");
}
