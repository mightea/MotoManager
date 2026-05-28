import { AlertTriangle, CircleAlert, Info, ChevronRight } from "lucide-react";
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
  { Icon: typeof CircleAlert; tone: string; railTone: string; label: string }
> = {
  high: {
    Icon: CircleAlert,
    tone: "text-error",
    railTone: "bg-error",
    label: "Hoch",
  },
  medium: {
    Icon: AlertTriangle,
    tone: "text-[var(--color-workshop)]",
    railTone: "bg-[var(--color-workshop)]",
    label: "Mittel",
  },
  low: {
    Icon: Info,
    tone: "text-info",
    railTone: "bg-info/70",
    label: "Niedrig",
  },
};

/**
 * IssueItem — a service-manual defect line.
 *
 *  █ [icon]  Description, truncated at one line ........... HOCH    ›
 *           [Datum · 12'500 km]
 */
export function IssueItem({ issue, dateFormatter, onSelect }: IssueItemProps) {
  const cfg = PRIORITY_CONFIG[issue.priority as PriorityKey] ?? PRIORITY_CONFIG.low;
  const PriorityIcon = cfg.Icon;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(issue)}
      aria-label="Mangel bearbeiten"
      className="group relative flex w-full items-center gap-3 rounded-sm border border-base-200 bg-base-100 px-3 py-2.5 text-left transition-colors hover:border-base-content/20 hover:bg-base-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-navy-700 dark:bg-navy-800 dark:hover:bg-navy-700/40"
    >
      <span aria-hidden="true" className={clsx("absolute inset-y-2 left-0 w-[3px] rounded-r-sm", cfg.railTone)} />
      <PriorityIcon className={clsx("h-4 w-4 shrink-0 ml-1", cfg.tone)} aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight text-base-content dark:text-gray-100">
          {issue.description || "Beschreibung fehlt"}
        </p>
        <p
          suppressHydrationWarning
          className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-base-content/55 dark:text-navy-400"
        >
          {issue.date ? dateFormatter.format(new Date(issue.date)) : "Datum unbekannt"}
        </p>
      </div>

      <span
        className={clsx(
          "shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.14em]",
          cfg.tone,
        )}
      >
        {cfg.label}
      </span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-base-content/30 transition-transform group-hover:translate-x-0.5 dark:text-navy-500" aria-hidden="true" />
    </button>
  );
}
