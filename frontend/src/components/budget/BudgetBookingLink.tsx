import { useState } from "react";
import { Link } from "react-router-dom";
import { createCardFocusState } from "../../utils/useNavigationCardFocus";

type Props = {
    tripId: string;
    bookingId: string;
    bookingName?: string | null;
    onUnlink: () => Promise<void>;
};

export function BudgetBookingLink({ tripId, bookingId, bookingName, onUnlink }: Props) {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const unlink = async () => {
        setIsPending(true);
        setError(null);
        try {
            await onUnlink();
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : "Could not unlink this booking.");
        } finally {
            setIsPending(false);
        }
    };

    return (
        <>
            <div className="budget-booking-link">
                <strong>Booking</strong>
                <Link
                    className="internal-record-link"
                    to={`/trips/${tripId}/bookings`}
                    state={createCardFocusState(bookingId)}
                >
                    {bookingName || "View booking"}
                </Link>
                <button className="text-button" type="button" disabled={isPending} onClick={() => void unlink()}>
                    {isPending ? "Unlinking…" : "Unlink"}
                </button>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
        </>
    );
}
