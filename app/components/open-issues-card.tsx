import { Plus } from "lucide-react";
import clsx from "clsx";
import type { Issue } from "~/db/schema";
import { Button } from "~/components/button";
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
  const handleAddIssue = () => {
    onAddIssue?.();
  };

  return (
    <div
      className={clsx(
        "rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-navy-700 dark:bg-navy-800",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground dark:text-white">Offene Mängel</h2>
        <Button type="button" onClick={handleAddIssue} variant="secondary" size="sm" className="rounded-lg">
          <Plus className="h-4 w-4" />
          Mangel hinzufügen
        </Button>
      </div>

      {issues.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-secondary dark:border-navy-600 dark:text-navy-300">
          <p className="text-sm font-medium">
            Super! Es sind keine Mängel für dieses Motorrad erfasst.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
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
