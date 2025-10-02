import { describe, expect, it } from "vitest";
import { formatCurrency, parseFloatSafe, parseIntSafe } from "./numberUtils";

const CH_CURRENCY = new Intl.NumberFormat("de-CH", {
  style: "currency",
  currency: "CHF",
});

describe("numberUtils", () => {
  describe("parseIntSafe", () => {
    it("returns 0 for falsy input", () => {
      expect(parseIntSafe(null)).toBe(0);
      expect(parseIntSafe(undefined)).toBe(0);
      expect(parseIntSafe(0)).toBe(0);
      expect(parseIntSafe("")).toBe(0);
    });

    it("parses strings and numbers", () => {
      expect(parseIntSafe("42")).toBe(42);
      expect(parseIntSafe(7.9)).toBe(7);
    });

    it("guards against NaN", () => {
      expect(parseIntSafe("not-a-number")).toBe(0);
    });
  });

  describe("parseFloatSafe", () => {
    it("returns 0 for falsy input", () => {
      expect(parseFloatSafe(null)).toBe(0);
      expect(parseFloatSafe(undefined)).toBe(0);
      expect(parseFloatSafe("")).toBe(0);
    });

    it("parses numeric values", () => {
      expect(parseFloatSafe("3.14")).toBeCloseTo(3.14);
      expect(parseFloatSafe(2)).toBe(2);
    });

    it("guards against NaN", () => {
      expect(parseFloatSafe("abc")).toBe(0);
    });
  });

  describe("formatCurrency", () => {
    it("falls back to CHF when currency is not provided", () => {
      expect(formatCurrency(null)).toBe(CH_CURRENCY.format(0));
      expect(formatCurrency(1234.5)).toBe(CH_CURRENCY.format(1234.5));
    });

    it("honors the provided currency code", () => {
      const euroFormatter = new Intl.NumberFormat("de-CH", {
        style: "currency",
        currency: "EUR",
      });

      expect(formatCurrency(25, "EUR")).toBe(euroFormatter.format(25));
    });
  });
});
