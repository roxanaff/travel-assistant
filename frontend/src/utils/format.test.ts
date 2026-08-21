import { describe, expect, it } from "vitest";

import { formatDate, formatMoney } from "./format";

describe("formatDate", () => {
    it("formats an ISO date without changing its calendar day", () => {
        expect(formatDate("2026-09-01")).toBe("1 Sept 2026");
    });

    it("shows a friendly fallback when no date is set", () => {
        expect(formatDate(null)).toBe("Date not set");
    });
});

describe("formatMoney", () => {
    it("formats money in the trip currency", () => {
        expect(formatMoney(1234.5, "EUR")).toBe("€1,235");
    });

    it("shows a dash for an unset amount", () => {
        expect(formatMoney(undefined, "EUR")).toBe("—");
    });
});
