import { useState } from "react";
import { Link } from "react-router-dom";
import { createCardFocusState } from "../../utils/useNavigationCardFocus";

type Props = {
    tripId: string;
    recordId: string;
    name?: string | null;
    label: "Booking" | "Planned cost" | "Expense";
    onUnlink: () => Promise<void>;
};

export function BudgetRecordLink({ tripId, recordId, name, label, onUnlink }: Props) {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const unlink = async () => {
        setIsPending(true);
        setError(null);
        try {
            await onUnlink();
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : "Could not unlink this entry.");
        } finally {
            setIsPending(false);
        }
    };

    return (
        <>
            <div className="budget-record-link">
                <strong>{label}</strong>
                <Link
                    className="internal-record-link"
                    to={`/trips/${tripId}/${label === "Booking" ? "bookings" : "budget"}`}
                    state={createCardFocusState(recordId)}
                >
                    {name || `View ${label.toLowerCase()}`}
                </Link>
                <button className="text-button" type="button" disabled={isPending} onClick={() => void unlink()}>
                    {isPending ? "Unlinking…" : "Unlink"}
                </button>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
        </>
    );
}
