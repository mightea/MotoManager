import { Plus } from "lucide-react";
import clsx from "clsx";
import type { Issue } from "~/types/db";
import { IssueItem } from "~/components/issue-item";

type OpenIssuesCardProps = {
  issues: Issue[];
  dateFormatter: Intl.DateTimeFormat;
  onAddIssue?: () => void;
  onIssueSelect?: (issue: Issue) => void;
  className?: string;
};

export default function OpenIssuesCard({
  issues,
  dateFormatter,
  onAddIssue,
  onIssueSelect,
  className,
}: OpenIssuesCardProps) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm dark:border-navy-700 dark:bg-navy-800",
        className,
      )}
    >
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-base-200 dark:border-navy-700">
        <h2 className="text-sm font-semibold text-foreground dark:text-white">
          Offene Mängel
          {issues.length > 0 && (
            <span className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-base-200 px-1.5 text-[10px] font-bold tabular-nums text-base-content/60 dark:bg-navy-700 dark:text-navy-300">
              {issues.length}
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={() => onAddIssue?.()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:bg-navy-700 dark:text-primary-light dark:hover:bg-navy-600"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Mangel hinzufügen
        </button>
      </div>

      {issues.length === 0 ? (
        <div className="rounded-lg border border-dashed border-base-300 px-4 py-5 text-center text-secondary dark:border-navy-600 dark:text-navy-300">
          <p className="text-sm font-medium">
            Super! Es sind keine Mängel für dieses Motorrad erfasst.
          </p>
        </div>
      ) : (
        <ul className="space-y-1">
          {issues.map((issue) => (
            <li key={issue.id}>
              <IssueItem
                issue={issue}
                dateFormatter={dateFormatter}
                onSelect={onIssueSelect}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
