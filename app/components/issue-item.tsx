import clsx from "clsx";
import { Link } from "react-router";
import type { Issue } from "~/types/db";
import { formatNumber } from "~/utils/numberUtils";

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
 * Spare parts linked to the defect follow as small links to the part
 * ("Teil auf Lager: … · 2 Stk →"); older backends send no `linkedParts`.
 */
export function IssueItem({ issue, dateFormatter, onSelect }: IssueItemProps) {
  const cfg = PRIORITY_CONFIG[issue.priority as PriorityKey] ?? PRIORITY_CONFIG.low;
  const linkedParts = Array.isArray(issue.linkedParts) ? issue.linkedParts : [];

  return (
    <div
      className={clsx(
        "overflow-hidden rounded-sm border border-l-[3px] border-base-300 bg-base-100 dark:border-navy-700 dark:bg-navy-800",
        cfg.border,
      )}
    >
      <button
        type="button"
        onClick={() => onSelect?.(issue)}
        aria-label={`Mangel bearbeiten: ${issue.title}`}
        className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-base-200/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 dark:hover:bg-navy-700/40"
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
      {linkedParts.length > 0 && (
        <ul className="flex flex-col gap-1 px-3 pb-2.5">
          {linkedParts.map((part) => (
            <li key={part.id}>
              <Link
                to={`/parts/${part.id}`}
                className={clsx(
                  "font-mono text-[11px] font-semibold uppercase tracking-[0.08em] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  part.onHand > 0
                    ? "text-primary dark:text-primary-light"
                    : "text-base-content/70 dark:text-navy-300",
                )}
              >
                {part.onHand > 0
                  ? `Teil auf Lager: ${part.name} · ${formatNumber(part.onHand)} Stk →`
                  : `Teil verknüpft: ${part.name} · nicht auf Lager`}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
