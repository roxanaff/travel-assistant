/** Formats an ISO date for display without shifting it across time zones. */
export const formatDate = (date: string | null | undefined) => {
  if (!date) 
    return "Date not set";
  
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
};

export const formatMoney = (
  amount: number | null | undefined,
  currency: string,
) => {
  if (amount == null) 
    return "—";
  
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};
