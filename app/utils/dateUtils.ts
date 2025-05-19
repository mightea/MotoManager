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
