import type { PressureUnit } from "~/types/db";

/**
 * 1 bar = 14.5037738 psi (exact NIST value).
 * Conversion is symmetric — we just divide/multiply by this constant.
 */
export const PSI_PER_BAR = 14.5037738;

export const psiFromBar = (bar: number) => bar * PSI_PER_BAR;
export const barFromPsi = (psi: number) => psi / PSI_PER_BAR;

/**
 * Round bar to one decimal (service-manual precision: 2.3) and psi to
 * a whole number (33). Pump gauges are typically integer-graduated, so
 * fractional psi is noise.
 */
export const roundBar = (value: number) => Math.round(value * 10) / 10;
export const roundPsi = (value: number) => Math.round(value);
export const roundPressure = (value: number, unit: PressureUnit) =>
  unit === "psi" ? roundPsi(value) : roundBar(value);

export type FormattedPressure = {
  /** Primary unit string the user entered, e.g. "2.3 bar" */
  primary: string;
  /** Converted unit string, e.g. "33.4 psi" */
  secondary: string;
  /** Just the unit token for the primary value. */
  primaryUnit: PressureUnit;
  /** Just the unit token for the secondary value. */
  secondaryUnit: PressureUnit;
};

/**
 * Render a canonical (bar) pressure for the UI: the user's preferred
 * unit first, the converted unit second. Both rounded to one decimal.
 */
export function formatPressure(
  bar: number,
  preferred: PressureUnit,
): FormattedPressure {
  const barStr = `${roundBar(bar).toFixed(1)} bar`;
  const psiStr = `${roundPsi(psiFromBar(bar))} psi`;
  if (preferred === "psi") {
    return {
      primary: psiStr,
      secondary: barStr,
      primaryUnit: "psi",
      secondaryUnit: "bar",
    };
  }
  return {
    primary: barStr,
    secondary: psiStr,
    primaryUnit: "bar",
    secondaryUnit: "psi",
  };
}

/**
 * Take a raw input number (in whichever unit the form is currently
 * displaying) and return the canonical bar value to persist. Returns
 * null when input is empty / not a number.
 */
export function toCanonicalBar(
  rawValue: string | number,
  inputUnit: PressureUnit,
): number | null {
  const num = typeof rawValue === "number" ? rawValue : Number.parseFloat(rawValue);
  if (!Number.isFinite(num)) return null;
  return inputUnit === "psi" ? barFromPsi(num) : num;
}

/**
 * Render a canonical bar value as a plain number string in the given
 * display unit — bar to one decimal, psi as a whole number. Used to
 * seed form inputs.
 */
export function displayValue(bar: number, unit: PressureUnit): string {
  if (unit === "psi") return roundPsi(psiFromBar(bar)).toString();
  return roundBar(bar).toFixed(1);
}

/**
 * Sensible bounds for motorcycle tire pressure — soft guards used for
 * "looks wrong" warnings, not hard validation. Anything below 1.0 bar
 * or above 5.0 bar is unusual for a road bike.
 */
export const PRESSURE_RANGE_BAR = { min: 1.0, max: 5.0 } as const;
export const PRESSURE_RANGE_PSI = {
  min: roundPsi(psiFromBar(PRESSURE_RANGE_BAR.min)),
  max: roundPsi(psiFromBar(PRESSURE_RANGE_BAR.max)),
} as const;

export function isPressureOutOfRange(bar: number): boolean {
  return bar < PRESSURE_RANGE_BAR.min || bar > PRESSURE_RANGE_BAR.max;
}
