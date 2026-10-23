import { ChevronDown, ChevronUp } from "lucide-react";
import type { LinkedRecordReview } from "../../api/linkedRecordReviewsApi";
import { LinkedRecordWarnings } from "./LinkedRecordWarnings";
import "./RelatedRecordReviews.css";

type Props = {
    tripId: string;
    currency: string;
    recordName: string;
    panelId: string;
    reviews: LinkedRecordReview[];
    isExpanded: boolean;
    onToggle: () => void;
    onResolved: () => Promise<void>;
    disabled?: boolean;
};

/** Shared outgoing review disclosure for bookings and activities. */
export function RelatedRecordReviews({
    tripId,
    currency,
    recordName,
    panelId,
    reviews,
    isExpanded,
    onToggle,
    onResolved,
    disabled = false,
}: Props) {
    if (reviews.length === 0) return null;

    return (
        <section className="related-record-reviews" aria-label={`Related changes for ${recordName}`}>
            <button
                className="text-button related-review-toggle"
                type="button"
                aria-expanded={isExpanded}
                aria-controls={panelId}
                onClick={onToggle}
            >
                <span>Review related changes ({reviews.length})</span>
                {isExpanded ? <ChevronUp size={17} aria-hidden="true" /> : <ChevronDown size={17} aria-hidden="true" />}
            </button>
            {isExpanded && (
                <div className="related-review-list" id={panelId}>
                    <LinkedRecordWarnings
                        tripId={tripId}
                        currency={currency}
                        reviews={reviews}
                        perspective="target"
                        presentation="review"
                        disabled={disabled}
                        onResolved={onResolved}
                    />
                </div>
            )}
        </section>
    );
}
