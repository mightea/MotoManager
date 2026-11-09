import { Plus } from "lucide-react";
import type { Issue } from "~/types/db";
import { IssueItem } from "~/components/issue-item";
import { Card } from "~/components/card";
import { Button } from "~/components/button";

type OpenIssuesCardProps = {
  issues: Issue[];
  dateFormatter: Intl.DateTimeFormat;
  onAddIssue?: () => void;
  onIssueSelect?: (issue: Issue) => void;
  className?: string;
};

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/**
 * Open issues of one motorcycle. With none it collapses to a single line —
 * a green rail and "fahrbereit" next to the title; otherwise the rail takes
 * the worst priority and the issues list underneath, most severe first.
 */
export default function OpenIssuesCard({
  issues,
  dateFormatter,
  onAddIssue,
  onIssueSelect,
  className,
}: OpenIssuesCardProps) {
  const sorted = [...issues].sort(
    (a, b) => (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3),
  );
  const worst = sorted[0]?.priority;
  const accent = issues.length === 0
    ? "success"
    : worst === "high"
      ? "error"
      : worst === "medium"
        ? "workshop"
        : "secondary";

  const addButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onAddIssue}
      leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
      className="h-10 w-full sm:h-8 sm:w-auto"
    >
      Neuer Mangel
    </Button>
  );

  if (issues.length === 0) {
    return (
      <Card className={className} accent={accent}>
        <div className="flex flex-col gap-2 py-3 pl-5 pr-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-subdisplay text-[15px] uppercase tracking-[0.06em] text-base-content dark:text-white">
              Offene Mängel
            </h2>
            <span className="font-mono text-[12px] font-bold uppercase tracking-[0.08em] text-success">
              Keine Mängel — Fahrzeug ist fahrbereit
            </span>
          </div>
          {addButton}
        </div>
      </Card>
    );
  }

  return (
    <Card className={className} accent={accent}>
      <div className="flex flex-col gap-2 border-b border-base-200 py-3 pl-[18px] pr-3.5 dark:border-navy-700 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline justify-between gap-3 sm:justify-start">
          <h2 className="font-subdisplay text-[15px] uppercase tracking-[0.06em] text-base-content dark:text-white">
            Offene Mängel
          </h2>
          <span className="font-mono text-[12px] font-semibold uppercase text-base-content/70">
            {issues.length} {issues.length === 1 ? "Eintrag" : "Einträge"}
          </span>
        </div>
        {addButton}
      </div>
      <ul className="flex flex-col gap-2.5 py-3 pl-[18px] pr-3.5">
        {sorted.map((issue) => (
          <li key={issue.id}>
            <IssueItem issue={issue} dateFormatter={dateFormatter} onSelect={onIssueSelect} />
          </li>
        ))}
      </ul>
    </Card>
  );
}
