/** Formats an ISO date for display without shifting it across time zones. */
export const formatDate = (date: string | null | undefined) => {
    if (!date) return "Date not set";

    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
};

/** Formats a complete trip range without duplicating the separator at each call site. */
export const formatDateRange = (
    startDate: string | null | undefined,
    endDate: string | null | undefined,
) =>
    startDate && endDate
        ? `${formatDate(startDate)} – ${formatDate(endDate)}`
        : "Dates not set";

export const formatMoney = (
    amount: number | null | undefined,
    currency: string,
) => {
    if (amount == null) return "—";

    return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
    }).format(amount);
};
