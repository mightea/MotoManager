const MS_PER_DAY = 1000 * 60 * 60 * 24;

const parseDate = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const addYears = (date: Date, years: number) => {
  const copy = new Date(date.getTime());
  copy.setFullYear(copy.getFullYear() + years);
  return copy;
};

export const formatDuration = (diffDays: number) => {
  const absDays = Math.abs(diffDays);

  const daysThreshold = 14;
  const weeksThreshold = 8; // up to ~2 months
  const monthsThreshold = 24; // up to ~2 years

  let unit:
    | "Tag"
    | "Tage"
    | "Woche"
    | "Wochen"
    | "Monat"
    | "Monaten"
    | "Jahr"
    | "Jahren";
  let value: number;

  if (absDays < daysThreshold) {
    value = absDays;
    unit = value === 1 ? "Tag" : "Tage";
  } else if (absDays < weeksThreshold * 7) {
    value = Math.round(absDays / 7);
    unit = value === 1 ? "Woche" : "Wochen";
  } else if (absDays < monthsThreshold * 30) {
    value = Math.round(absDays / 30);
    unit = value === 1 ? "Monat" : "Monaten";
  } else {
    value = Math.round(absDays / 365);
    unit = value === 1 ? "Jahr" : "Jahren";
  }

  return { value, unit };
};

const formatRelative = (diffDays: number) => {
  if (diffDays === 0) {
    return "Heute fällig";
  }

  const isOverdue = diffDays < 0;
  const { value, unit } = formatDuration(diffDays);

  if (value === 0) {
    return isOverdue ? "Überfällig" : "Heute fällig";
  }

  return isOverdue ? `seit ${value} ${unit} überfällig` : `in ${value} ${unit}`;
};

export type NextInspectionInfo = {
  dueDateISO: string;
  dueDateLabel: string;
  relativeLabel: string;
  isOverdue: boolean;
};

export const getNextInspectionInfo = ({
  firstRegistration,
  lastInspection,
  isVeteran,
}: {
  firstRegistration?: string | null;
  lastInspection?: string | null;
  isVeteran?: boolean;
}): NextInspectionInfo | null => {
  const registrationDate = parseDate(firstRegistration);
  const lastInspectionDate = parseDate(lastInspection);

  if (!registrationDate && !lastInspectionDate) {
    return null;
  }

  const initialIntervalYears = isVeteran ? 6 : 4;
  const regularIntervalYears = isVeteran ? 6 : 2;

  let dueDate: Date | null = null;

  if (lastInspectionDate) {
    dueDate = addYears(lastInspectionDate, regularIntervalYears);
  } else if (registrationDate) {
    const ageInYears =
      (Date.now() - registrationDate.getTime()) / (MS_PER_DAY * 365);
    if (ageInYears >= initialIntervalYears) {
      // No reliable inspection record but vehicle is already beyond initial interval.
      // Skip displaying misleading reminder.
      return null;
    }
    dueDate = addYears(registrationDate, initialIntervalYears);
    while (regularIntervalYears > 0 && dueDate < new Date()) {
      dueDate = addYears(dueDate, regularIntervalYears);
    }
  }

  if (!dueDate) {
    return null;
  }

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const dueStart = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate(),
  );

  const diffDays = Math.round(
    (dueStart.getTime() - todayStart.getTime()) / MS_PER_DAY,
  );

  const dateFormatter = new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
  });

  return {
    dueDateISO: dueDate.toISOString(),
    dueDateLabel: dateFormatter.format(dueDate),
    relativeLabel: formatRelative(diffDays),
    isOverdue: diffDays < 0,
  };
};
