import { isFalsy } from "./falsyUtils";

export const parseIntSafe = (
  value: string | number | null | undefined
): number => {
  if (isFalsy(value)) {
    return 0;
  }

  const parsed = parseInt(value.toString(), 10);
  return isNaN(parsed) ? 0 : parsed;
};

export const parseFloatSafe = (
  value: string | number | null | undefined
): number => {
  if (isFalsy(value)) {
    return 0;
  }

  const parsed = parseFloat(value.toString());
  return isNaN(parsed) ? 0 : parsed;
};

export const formatCurrency = (
  amount: number | undefined | null,
  currency: string = "CHF"
) => {
  const val = isFalsy(amount) ? 0 : amount;
  // Use en-US to get reliable format like "12,345.67" (comma for thousands, dot for decimals)
  const formatted = new Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

  // Replace comma with apostrophe for thousands separator, keep dot for decimal
  return `${currency} ${formatted.replace(/,/g, "’")}`;
};

export const formatNumber = (value: number | undefined | null): string => {
  if (isFalsy(value)) {
    return "0";
  }
  // Ensure consistent formatting between server and client by forcing 'en-US' (comma)
  // and then replacing with the Swiss separator (RIGHT SINGLE QUOTATION MARK)
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace(/,/g, "’");
};
