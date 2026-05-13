import { AlertTriangle, CircleAlert, Info } from "lucide-react";
import clsx from "clsx";
import type { Issue } from "~/types/db";

type IssueItemProps = {
  issue: Issue;
  dateFormatter: Intl.DateTimeFormat;
  onSelect?: (issue: Issue) => void;
};

type PriorityKey = "high" | "medium" | "low";

const PRIORITY_CONFIG: Record<
  PriorityKey,
  { Icon: typeof CircleAlert; iconClass: string; badgeClass: string; label: string }
> = {
  high: {
    Icon: CircleAlert,
    iconClass: "text-red-500",
    badgeClass: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    label: "Hoch",
  },
  medium: {
    Icon: AlertTriangle,
    iconClass: "text-orange-500",
    badgeClass: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    label: "Mittel",
  },
  low: {
    Icon: Info,
    iconClass: "text-blue-500",
    badgeClass: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    label: "Niedrig",
  },
};

export function IssueItem({ issue, dateFormatter, onSelect }: IssueItemProps) {
  const cfg = PRIORITY_CONFIG[issue.priority as PriorityKey] ?? PRIORITY_CONFIG.low;
  const PriorityIcon = cfg.Icon;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(issue)}
      className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-base-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-navy-700/50"
      aria-label="Mangel bearbeiten"
    >
      <PriorityIcon className={clsx("h-5 w-5 shrink-0", cfg.iconClass)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight text-foreground dark:text-gray-200">
          {issue.description || "Beschreibung fehlt"}
        </p>
        <p
          suppressHydrationWarning
          className="mt-0.5 text-[11px] leading-snug text-secondary dark:text-navy-400"
        >
          {issue.date ? dateFormatter.format(new Date(issue.date)) : "Datum unbekannt"}
        </p>
      </div>
      <span
        className={clsx(
          "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
          cfg.badgeClass,
        )}
      >
        {cfg.label}
      </span>
    </button>
  );
}
