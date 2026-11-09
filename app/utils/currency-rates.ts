import { DEFAULT_CURRENCY_CODE } from "~/constants";
import type { CurrencySetting } from "~/types/db";
import { formatNumber } from "~/utils/numberUtils";

const STAND_FORMAT = new Intl.DateTimeFormat("de-CH", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * When the stalest non-base rate was last fetched or edited. Null when any
 * non-base currency has no known date (older APIs send no `rateUpdatedAt` at
 * all) or when there is nothing but the base currency.
 */
export function ratesAsOf(currencies: readonly CurrencySetting[]): Date | null {
  const foreign = currencies.filter((c) => c.code !== DEFAULT_CURRENCY_CODE);
  let oldest: Date | null = null;
  for (const currency of foreign) {
    if (!currency.rateUpdatedAt) return null;
    const date = new Date(currency.rateUpdatedAt);
    if (Number.isNaN(date.getTime())) return null;
    if (!oldest || date < oldest) oldest = date;
  }
  return oldest;
}

/** "Stand: 09.11.2026 10:14", or "Stand unbekannt". */
export function formatRatesStand(asOf: Date | null): string {
  return asOf ? `Stand: ${STAND_FORMAT.format(asOf).replace(",", "")}` : "Stand unbekannt";
}

/**
 * A worked example of a rate, e.g. "€ 100 ≈ CHF 91". `conversionFactor` is CHF
 * per one unit of the currency — the API and every normaliser multiply a
 * foreign amount by it to get CHF. Null for the base currency.
 */
export function rateExample(currency: Pick<CurrencySetting, "code" | "symbol" | "conversionFactor">, amount = 100): string | null {
  if (currency.code === DEFAULT_CURRENCY_CODE) return null;
  if (!Number.isFinite(currency.conversionFactor) || currency.conversionFactor <= 0) return null;
  const chf = amount * currency.conversionFactor;
  // Whole francs read best; small results (weak currencies) keep the Rappen.
  const decimals = chf < 10 ? 2 : 0;
  return `${currency.symbol} ${formatNumber(amount)} ≈ ${DEFAULT_CURRENCY_CODE} ${formatNumber(chf, decimals)}`;
}
