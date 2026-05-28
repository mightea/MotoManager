import type { LucideIcon } from "lucide-react";
import clsx from "clsx";
import type { ReactNode } from "react";

interface StatisticEntryProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  valueClassName?: string;
  checkValue?: any; // Used to check for null/empty/zero if different from value
}

/**
 * StatisticEntry — one row of a service-manual stat list.
 * Label in IBM Plex Sans + uppercase mono caption pairing.
 * Value in IBM Plex Mono (tabular figures) so columns align.
 */
export function StatisticEntry({
  icon: Icon,
  label,
  value,
  valueClassName,
  checkValue,
}: StatisticEntryProps) {
  const valueToCheck = checkValue !== undefined ? checkValue : value;

  if (
    valueToCheck === null ||
    valueToCheck === undefined ||
    valueToCheck === "" ||
    valueToCheck === 0
  ) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div className="flex items-center gap-2 text-base-content/65 dark:text-navy-300 min-w-0">
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] truncate">
          {label}
        </span>
      </div>
      <span
        suppressHydrationWarning
        className={clsx(
          "font-numeric text-[13px] font-semibold text-right",
          valueClassName ? valueClassName : "text-base-content dark:text-gray-100",
        )}
      >
        {value}
      </span>
    </div>
  );
}
