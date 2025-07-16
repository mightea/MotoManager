import { isFalsy } from "./falsyUtils";

export const getAgeInDays = (
  dateString: string | undefined | null
): number | null => {
  if (isFalsy(dateString)) {
    return null;
  }

  const start = new Date(dateString).getTime();
  const end = new Date().getTime();

  let timeDifference = end - start;
  return timeDifference / (1000 * 3600 * 24);
};

export const getAgeText = (days: number | null): string | null => {
  if (days === null) {
    return null;
  }

  if (days < 30) {
    return `${Math.floor(days)} Tage`;
  }

  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} ${months === 1 ? "Monat" : "Monate"}`;
  }

  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? "Jahr" : "Jahre"}`;
};

export const nextInpectionDays = ({
  lastInspection,
  isVeteran,
  firstRegistration,
}: {
  lastInspection: string;
  isVeteran: boolean;
  firstRegistration: string;
}): number | null => {
  const age = getAgeInDays(firstRegistration);
  if (age === null) {
    return null;
  }

  const lastInspectionAge = getAgeInDays(lastInspection) ?? age;
  const ageInYears = Math.floor(age / 365);

  if (isVeteran === true || ageInYears < 6) {
    return Math.floor(6 * 365 - lastInspectionAge);
  }

  return Math.floor(2 * 365 - lastInspectionAge);
};

/**
 * Formats a Date object or a date string into the 'YYYY-MM-DD' format
 * required for an <input type="date"> element.
 *
 * This function is robust and handles various edge cases:
 * - If the input is already a valid YYYY-MM-DD string, it returns it directly.
 * - If the input is a Date object, it converts it to the YYYY-MM-DD format.
 * - If the input is a different string format, it attempts to parse it into a Date object first.
 * - If the input is invalid or cannot be parsed, it returns an empty string.
 *
 * @param value - The date to format, which can be a string or a Date object.
 * @returns A string in 'YYYY-MM-DD' format, or an empty string if the input is invalid.
 */
export const dateInputString = (
  value: string | Date | null | undefined
): string => {
  // Return an empty string for null, undefined, or empty string inputs
  if (!value) {
    return "";
  }

  let date: Date;

  // Check if the input is a string or a Date object
  if (typeof value === "string") {
    // Forgivingly parse the string into a Date object.
    // This handles ISO strings, common date formats, etc.
    date = new Date(value);
  } else {
    // If it's already a Date object, use it directly.
    date = value;
  }

  // Check if the created date is valid.
  // `new Date('invalid-string')` results in an "Invalid Date" object,
  // and its getTime() will return NaN.
  if (isNaN(date.getTime())) {
    return "";
  }

  // Extract year, month, and day
  const year = date.getFullYear();

  // getMonth() is zero-based (0-11), so we add 1.
  // Pad with '0' if the month is a single digit (e.g., 7 -> "07").
  const month = (date.getMonth() + 1).toString().padStart(2, "0");

  // Pad with '0' if the day is a single digit.
  const day = date.getDate().toString().padStart(2, "0");

  // Assemble and return the final formatted string
  return `${year}-${month}-${day}`;
};
