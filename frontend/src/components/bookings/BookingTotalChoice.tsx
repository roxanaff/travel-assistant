import type { BookingExpenseTotalSource } from "../../api/bookingsApi";
import { formatMoney } from "../../utils/format";

type Props = {
    name: string;
    bookingTotal: number | null;
    plannedTotal: number;
    currency: string;
    source: BookingExpenseTotalSource | null;
    disabled: boolean;
    disableBookingTotal?: boolean;
    onChange: (source: BookingExpenseTotalSource) => void;
};

export function BookingTotalChoice({
    name, bookingTotal, plannedTotal, currency, source, disabled, disableBookingTotal, onChange,
}: Props) {
    return (
        <fieldset className="booking-expense-payment-offer" disabled={disabled}>
            <legend>Which total cost should the booking and plan use?</legend>
            <label>
                <input
                    type="radio"
                    name={name}
                    checked={source === "Booking"}
                    disabled={disableBookingTotal}
                    onChange={() => onChange("Booking")}
                />
                Booking · Total {formatMoney(bookingTotal, currency, 2)}
            </label>
            <label>
                <input
                    type="radio"
                    name={name}
                    checked={source === "PlannedCost"}
                    onChange={() => onChange("PlannedCost")}
                />
                Planned cost · Total {formatMoney(plannedTotal, currency, 2)}
            </label>
        </fieldset>
    );
}
