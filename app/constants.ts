export const MIN_KM_PER_YEAR = 100;

/** `conversionFactor` = CHF per one unit (CHF = amount × factor). These are
 *  rough offline fallbacks; prefer the server's currency list. */
export type CurrencyPreset = {
  code: string;
  symbol: string;
  label: string;
  conversionFactor: number;
};

export const AVAILABLE_CURRENCY_PRESETS: readonly CurrencyPreset[] = [
  {
    code: "CHF",
    symbol: "CHF",
    label: "Schweizer Franken",
    conversionFactor: 1,
  },
  {
    code: "EUR",
    symbol: "€",
    label: "Euro",
    conversionFactor: 0.95,
  },
  {
    code: "AUD",
    symbol: "A$",
    label: "Australischer Dollar",
    conversionFactor: 0.56,
  },
];

export const findCurrencyPreset = (code: string) =>
  AVAILABLE_CURRENCY_PRESETS.find((currency) => currency.code === code);

export const DEFAULT_CURRENCY_CODE = "CHF";

