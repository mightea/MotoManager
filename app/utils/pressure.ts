import type { PressureUnit } from "~/types/db";

/**
 * 1 bar = 14.5037738 psi (exact NIST value).
 * Conversion is symmetric — we just divide/multiply by this constant.
 */
export const PSI_PER_BAR = 14.5037738;

export const psiFromBar = (bar: number) => bar * PSI_PER_BAR;
export const barFromPsi = (psi: number) => psi / PSI_PER_BAR;

/**
 * Round a pressure value to one decimal place — the standard precision
 * service manuals use for both bar (2.3) and psi (33.4).
 */
export const roundPressure = (value: number) => Math.round(value * 10) / 10;

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
  if (preferred === "psi") {
    const psi = roundPressure(psiFromBar(bar));
    const barRounded = roundPressure(bar);
    return {
      primary: `${psi.toFixed(1)} psi`,
      secondary: `${barRounded.toFixed(1)} bar`,
      primaryUnit: "psi",
      secondaryUnit: "bar",
    };
  }
  const barRounded = roundPressure(bar);
  const psi = roundPressure(psiFromBar(bar));
  return {
    primary: `${barRounded.toFixed(1)} bar`,
    secondary: `${psi.toFixed(1)} psi`,
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
 * display unit, with one decimal. Used to seed form inputs.
 */
export function displayValue(bar: number, unit: PressureUnit): string {
  const v = unit === "psi" ? psiFromBar(bar) : bar;
  return roundPressure(v).toFixed(1);
}

/**
 * Sensible bounds for motorcycle tire pressure — soft guards used for
 * "looks wrong" warnings, not hard validation. Anything below 1.0 bar
 * or above 5.0 bar is unusual for a road bike.
 */
export const PRESSURE_RANGE_BAR = { min: 1.0, max: 5.0 } as const;
export const PRESSURE_RANGE_PSI = {
  min: roundPressure(psiFromBar(PRESSURE_RANGE_BAR.min)),
  max: roundPressure(psiFromBar(PRESSURE_RANGE_BAR.max)),
} as const;

export function isPressureOutOfRange(bar: number): boolean {
  return bar < PRESSURE_RANGE_BAR.min || bar > PRESSURE_RANGE_BAR.max;
}
