import clsx from "clsx";
import type { Issue } from "~/types/db";

type IssueItemProps = {
  issue: Issue;
  dateFormatter: Intl.DateTimeFormat;
  onSelect?: (issue: Issue) => void;
};

type PriorityKey = "high" | "medium" | "low";

const PRIORITY_CONFIG: Record<PriorityKey, { tone: string; border: string; label: string }> = {
  high: { tone: "text-error", border: "border-l-error", label: "Hoch" },
  medium: {
    tone: "text-[var(--color-workshop-ink)] dark:text-[var(--color-workshop-soft)]",
    border: "border-l-[var(--color-workshop)]",
    label: "Mittel",
  },
  low: { tone: "text-base-content/70 dark:text-navy-300", border: "border-l-base-content/30", label: "Niedrig" },
};

/**
 * IssueItem — one defect line: a priority-coloured left edge, the title with
 * its priority on the right, the date underneath. Opens the edit dialog.
 */
export function IssueItem({ issue, dateFormatter, onSelect }: IssueItemProps) {
  const cfg = PRIORITY_CONFIG[issue.priority as PriorityKey] ?? PRIORITY_CONFIG.low;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(issue)}
      aria-label={`Mangel bearbeiten: ${issue.title}`}
      className={clsx(
        "flex w-full flex-col gap-0.5 rounded-sm border border-l-[3px] border-base-300 bg-base-100 px-3 py-2.5 text-left transition-colors hover:bg-base-200/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-navy-700 dark:bg-navy-800 dark:hover:bg-navy-700/40",
        cfg.border,
      )}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 font-semibold text-base-content line-clamp-2 dark:text-white">{issue.title}</span>
        <span className={clsx("shrink-0 font-mono text-[11px] font-bold uppercase tracking-[0.1em]", cfg.tone)}>
          {cfg.label}
        </span>
      </span>
      <span suppressHydrationWarning className="font-mono text-[12px] text-base-content/70 dark:text-navy-300">
        {issue.date ? dateFormatter.format(new Date(issue.date)) : "Datum unbekannt"}
      </span>
    </button>
  );
}
