export const maximumMoneyAmount = 999_999_999.99;

/**
 * Keeps money entry limited to digits and one decimal separator with up to two decimal places.
 * A comma is normalised to a period so both common keyboard conventions work.
 */
export const normalizeMoneyInput = (value: string): string | null => {
    const normalized = value.replace(",", ".");

    if (!/^\d*(?:\.\d{0,2})?$/.test(normalized)) return null;
    if (normalized !== "" && Number(normalized) > maximumMoneyAmount)
        return null;

    return normalized;
};
