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
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-2 text-secondary dark:text-navy-400">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span
        className={clsx(
          "text-sm font-semibold",
          valueClassName
            ? valueClassName
            : "text-foreground dark:text-gray-100"
        )}
      >
        {value}
      </span>
    </div>
  );
}
