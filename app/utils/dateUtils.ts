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

export const getAgeText = (
  dateString: string | undefined | null
): string | null => {
  const daysDifference = getAgeInDays(dateString);
  if (daysDifference === null) {
    return null;
  }

  if (daysDifference < 30) {
    return `${Math.floor(daysDifference)} Tage`;
  }

  if (daysDifference < 365) {
    const months = Math.floor(daysDifference / 30);
    return `${months} ${months === 1 ? "Monat" : "Monate"}`;
  }

  const years = Math.floor(daysDifference / 365);
  return `${years} ${years === 1 ? "Jahr" : "Jahre"}`;
};

export const nextInpectionDays = ({
  lastInspection,
  licenseType,
  firstRegistration,
}: {
  lastInspection: string;
  licenseType: "regular" | "veteran";
  firstRegistration: string;
}): number | null => {
  const age = getAgeInDays(firstRegistration);
  if (age === null) {
    return null;
  }

  const lastInspectionAge = getAgeInDays(lastInspection) ?? age;
  const ageInYears = Math.floor(age / 365);

  if (licenseType === "veteran" || ageInYears < 6) {
    return Math.floor(6 * 365 - lastInspectionAge);
  }

  return Math.floor(2 * 365 - lastInspectionAge);
};
