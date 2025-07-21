import { formatDistanceToNowStrict } from "date-fns";
import { de } from "date-fns/locale";

export const getTireInfo = (dotCode: string) => {
  if (dotCode.length !== 4 || !/^\d+$/.test(dotCode)) {
    return { manufacturingDate: "Ungültig", age: null, date: null };
  }

  const week = parseInt(dotCode.substring(0, 2), 10);
  const yearDigits = parseInt(dotCode.substring(2, 4), 10);
  const currentYear = new Date().getFullYear();
  const currentCentury = Math.floor(currentYear / 100) * 100;

  // Simple logic: if year is greater than current year's last two digits, assume previous century.
  // This is flawed for oldtimers, but a decent guess for most cases.
  const year =
    yearDigits > currentYear % 100
      ? currentCentury - 100 + yearDigits
      : currentCentury + yearDigits;

  if (week < 1 || week > 53) {
    return { manufacturingDate: "Ungültig", age: null, date: null };
  }

  // Get the date of the Monday of that week
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dayOfWeek = simple.getDay();
  const isoWeekStart = simple;
  // Get the Monday of the week
  isoWeekStart.setDate(simple.getDate() - dayOfWeek + 1);

  return {
    manufacturingDate: `Woche ${week}, ${year}`,
    age: formatDistanceToNowStrict(isoWeekStart, { locale: de, unit: "month" }),
    date: isoWeekStart,
  };
};
