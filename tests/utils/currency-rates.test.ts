import { describe, expect, it } from "vitest";
import type { CurrencySetting } from "~/types/db";
import { formatRatesStand, rateExample, ratesAsOf } from "~/utils/currency-rates";

const currency = (code: string, overrides: Partial<CurrencySetting> = {}): CurrencySetting => ({
  id: 1,
  code,
  symbol: code,
  label: null,
  conversionFactor: 1,
  createdAt: "2025-10-09T19:55:27Z",
  ...overrides,
});

describe("ratesAsOf", () => {
  it("takes the stalest non-base rate", () => {
    const asOf = ratesAsOf([
      currency("CHF", { rateUpdatedAt: "2020-01-01T00:00:00Z" }),
      currency("EUR", { rateUpdatedAt: "2026-11-09T09:00:00Z" }),
      currency("AUD", { rateUpdatedAt: "2026-11-08T09:00:00Z" }),
    ]);
    expect(asOf?.toISOString()).toBe("2026-11-08T09:00:00.000Z");
  });

  it("is unknown when an older API sends no rateUpdatedAt", () => {
    expect(ratesAsOf([currency("CHF"), currency("EUR")])).toBeNull();
  });

  it("is unknown when any rate has no date", () => {
    expect(
      ratesAsOf([
        currency("EUR", { rateUpdatedAt: "2026-11-09T09:00:00Z" }),
        currency("AUD", { rateUpdatedAt: null }),
      ]),
    ).toBeNull();
  });

  it("is unknown with only the base currency", () => {
    expect(ratesAsOf([currency("CHF", { rateUpdatedAt: "2026-11-09T09:00:00Z" })])).toBeNull();
  });
});

describe("formatRatesStand", () => {
  it("formats dd.mm.yyyy HH:mm", () => {
    expect(formatRatesStand(new Date(2026, 10, 9, 8, 5))).toBe("Stand: 09.11.2026 08:05");
  });

  it("says unknown without a date", () => {
    expect(formatRatesStand(null)).toBe("Stand unbekannt");
  });
});

describe("rateExample", () => {
  it("multiplies the foreign amount by the factor (CHF per unit)", () => {
    expect(rateExample({ code: "EUR", symbol: "€", conversionFactor: 0.9131 })).toBe("€ 100 ≈ CHF 91");
  });

  it("keeps Rappen for weak currencies", () => {
    expect(rateExample({ code: "JPY", symbol: "¥", conversionFactor: 0.0055 })).toBe("¥ 100 ≈ CHF 0.55");
  });

  it("has no example for the base currency or a broken factor", () => {
    expect(rateExample({ code: "CHF", symbol: "CHF", conversionFactor: 1 })).toBeNull();
    expect(rateExample({ code: "EUR", symbol: "€", conversionFactor: 0 })).toBeNull();
  });
});
