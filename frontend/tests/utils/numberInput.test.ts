import { describe, expect, it } from "vitest";

import {
    maximumMoneyAmount,
    normalizeMoneyInput,
} from "../../src/utils/numberInput";

describe("normalizeMoneyInput", () => {
    it("accepts a valid two-decimal money amount", () => {
        expect(normalizeMoneyInput("123.45")).toBe("123.45");
    });

    it("normalises a comma decimal separator", () => {
        expect(normalizeMoneyInput("123,45")).toBe("123.45");
    });

    it("rejects signs, exponent notation, extra decimals, and values above the maximum", () => {
        expect(normalizeMoneyInput("-1")).toBeNull();
        expect(normalizeMoneyInput("1e3")).toBeNull();
        expect(normalizeMoneyInput("1.234")).toBeNull();
        expect(normalizeMoneyInput(`${maximumMoneyAmount}1`)).toBeNull();
    });
});
