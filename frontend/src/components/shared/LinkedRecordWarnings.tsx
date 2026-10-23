import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { resolveLinkedRecordReview, type LinkedRecordReview } from "../../api/linkedRecordReviewsApi";
import { unlinkBookingExpense } from "../../api/bookingsApi";
import { deleteExpense } from "../../api/expensesApi";
import { formatDate, formatMoney } from "../../utils/format";
import { ConfirmDialog } from "./ConfirmDialog";
import { InlineMessage } from "./InlineMessage";

type Props = {
    tripId: string;
    currency: string;
    reviews: LinkedRecordReview[];
    onResolved: () => Promise<void>;
    disabled?: boolean;
};

const kindLabels = { Booking: "Booking", Activity: "Activity", Expense: "Expense", PlannedCost: "Planned cost" };

/** Older flags have no saved prior values; do not invent a before/after history for them. */
export function LegacyLinkedRecordWarning({ children, onKeep, disabled, label }: {
    children: ReactNode;
    onKeep: () => void;
    disabled: boolean;
    label: string;
}) {
    return (
        <div className="inline-message inline-message-warning linked-record-warning" role="status">
            <div className="linked-record-warning-content">
                <strong>{children}</strong>
                <span>Previous values were not recorded. Review manually or keep as is.</span>
            </div>
            <div className="linked-review-actions">
                <button className="text-button" type="button" disabled={disabled} aria-label={label} onClick={onKeep}>
                    Keep as is
                </button>
            </div>
        </div>
    );
}

export function LinkedRecordWarnings({ tripId, currency, reviews, onResolved, disabled = false }: Props) {
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<LinkedRecordReview | null>(null);

    const formatValue = (field: string, value: string | number | null) => {
        if (value === null) return "Not set";
        if (field === "Amount" || field === "Cost") return formatMoney(Number(value), currency);
        if (field === "Date" || field === "EndDate") return formatDate(String(value));
        if (field === "Time" || field === "EndTime") return String(value).slice(0, 5);
        if (field === "Duration") return `${value} min`;
        return String(value);
    };
    const fieldLabel = (field: string, kind: LinkedRecordReview["sourceKind"]) => ({
        Amount: kind === "Booking" ? "Net cost" : "Cost",
        Cost: kind === "Booking" ? "Total cost" : "Cost",
        Date: "Date",
        Time: "Start time",
        Duration: "Duration",
        Location: "Location",
        ArrivalLocation: "Arrival location",
        EndDate: "End date",
        EndTime: "End time",
    })[field] ?? field;

    const run = async (action: () => Promise<unknown>) => {
        if (pending || disabled) return;
        setPending(true);
        setError(null);
        try {
            await action();
            try {
                await onResolved();
            } catch {
                setError("The change was saved, but the record could not be refreshed. Reload the page to see it.");
            }
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : "Could not resolve this warning.");
            // A conflict can carry a new revision or target value. Do not leave stale buttons stuck.
            window.dispatchEvent(new CustomEvent("linked-records-changed", { detail: tripId }));
            try {
                await onResolved();
            } catch {
                // Keep the original actionable error; the page can still be refreshed manually.
            }
        } finally {
            setPending(false);
        }
    };

    return (
        <>
            {reviews.map((review) => (
                <div className="inline-message inline-message-warning linked-record-warning" role="status" key={review.id}>
                    <div className="linked-record-warning-content">
                        <strong>
                            {kindLabels[review.sourceKind]} “{review.sourceName}”
                            {review.role && review.role !== "General" ? ` (${review.role.toLowerCase()} journey)` : ""}
                            {review.isMismatch ? ": linked values differ" : " changed"}
                        </strong>
                        <div className="linked-record-changes">
                            {review.changes.map((change) => {
                                const targetValue = change.targetValue === undefined ? change.before : change.targetValue;
                                const sourceLabel = fieldLabel(change.field, review.sourceKind);
                                const before = formatValue(change.field, change.before);
                                const after = formatValue(change.field, change.after);
                                const target = formatValue(change.field, targetValue);
                                return (
                                    <div key={change.field}>
                                        {review.isMismatch ? (
                                            <>
                                                {fieldLabel(change.field, review.targetKind)} {target}
                                                {` · ${kindLabels[review.sourceKind]} ${sourceLabel.toLowerCase()} ${after}`}
                                            </>
                                        ) : (
                                            <>
                                                {`${sourceLabel}: ${before} → ${after}`}
                                                {targetValue !== change.before && targetValue !== change.after
                                                    && ` · Replaces ${target}`}
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                            {review.targetKind === "Booking" && review.proposedAmount !== null
                                && review.changes.some((change) => change.field === "Amount"
                                    && Number(change.after) !== review.proposedAmount) && (
                                <div>Paid after update: {formatMoney(review.proposedAmount, currency)}</div>
                            )}
                        </div>
                        {review.requiresUnscheduled && (
                            <span>The date is outside this trip. Updating will make the activity unscheduled.</span>
                        )}
                        {review.blockedReason && <span>{review.blockedReason}</span>}
                    </div>
                    <div className="linked-review-actions">
                        {!review.blockedReason && (
                            <button className="text-button" type="button" disabled={pending || disabled}
                                onClick={() => void run(() => resolveLinkedRecordReview(
                                    tripId, review, review.requiresUnscheduled ? "unschedule" : "apply",
                                ))}>
                                {review.requiresUnscheduled ? "Make unscheduled" : "Update"}
                            </button>
                        )}
                        <button className="text-button" type="button" disabled={pending || disabled}
                            onClick={() => void run(() => resolveLinkedRecordReview(tripId, review, "keep"))}>
                            Keep as is
                        </button>
                        {review.requiresUnscheduled && (
                            <Link className="text-button" to={`/trips/${tripId}/details`} state={{ editTripDates: true }}>
                                Edit trip dates
                            </Link>
                        )}
                        {review.sourceKind === "Booking" && review.targetKind === "Expense"
                            && review.changes.some((change) => change.field === "Amount" && Number(change.after) <= 0) && (
                            <>
                                <button className="text-button" type="button" disabled={pending || disabled}
                                    onClick={() => void run(() => unlinkBookingExpense(tripId, review.sourceId, review.targetId))}>
                                    Keep expense and unlink
                                </button>
                                <button className="text-button" type="button" disabled={pending || disabled}
                                    onClick={() => setDeleting(review)}>
                                    Delete
                                </button>
                            </>
                        )}
                    </div>
                </div>
            ))}
            {error && <InlineMessage variant="error">{error}</InlineMessage>}
            <ConfirmDialog
                isOpen={deleting !== null}
                title="Delete linked expense?"
                confirmLabel="Delete"
                onCancel={() => setDeleting(null)}
                onConfirm={() => {
                    const review = deleting;
                    setDeleting(null);
                    if (review) void run(() => deleteExpense(tripId, review.targetId));
                }}
            >
                <p>Delete {deleting?.targetName}? It will be removed from spending. Its booking and any linked planned cost will be kept and unlinked.</p>
            </ConfirmDialog>
        </>
    );
}
