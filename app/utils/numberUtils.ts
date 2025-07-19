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
