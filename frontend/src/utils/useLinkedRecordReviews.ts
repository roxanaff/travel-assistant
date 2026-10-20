import { useEffect, useRef, useState } from "react";
import { getLinkedRecordReviews, type LinkedRecordReview, type LinkedRecordKind } from "../api/linkedRecordReviewsApi";

/** One review request per feature, refreshed after saved mutations, not one request per card. */
export function useLinkedRecordReviews(tripId: string, kind: LinkedRecordKind, records: readonly { id: string }[]) {
    const [reviews, setReviews] = useState<LinkedRecordReview[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loadedTripId, setLoadedTripId] = useState<string | null>(null);
    const requestVersion = useRef(0);

    useEffect(() => {
        let active = true;
        const load = async () => {
            const version = ++requestVersion.current;
            try {
                const loaded = await getLinkedRecordReviews(tripId);
                if (!active || version !== requestVersion.current) return;
                setReviews(loaded.filter((review) => review.targetKind === kind));
                setLoadedTripId(tripId);
                setError(null);
            } catch (exception) {
                if (!active || version !== requestVersion.current) return;
                setError(exception instanceof Error ? exception.message : "Could not load linked-record warnings.");
            }
        };
        const onChange = (event: Event) => {
            if ((event as CustomEvent<string>).detail === tripId) void load();
        };
        void load();
        window.addEventListener("linked-records-changed", onChange);
        return () => {
            active = false;
            window.removeEventListener("linked-records-changed", onChange);
        };
    }, [tripId, kind, records]);

    return { reviews, error, loaded: loadedTripId === tripId };
}
