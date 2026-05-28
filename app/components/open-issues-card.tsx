import { Plus, ShieldCheck } from "lucide-react";
import type { Issue } from "~/types/db";
import { IssueItem } from "~/components/issue-item";
import { Card, CardAction, CardHeading } from "~/components/card";

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
    <Card className={className} accent={issues.length > 0 ? "error" : undefined}>
      <CardHeading
        code="04"
        title="Offene Mängel"
        meta={issues.length > 0 ? `${issues.length} ${issues.length === 1 ? "Eintrag" : "Einträge"}` : undefined}
        trailing={
          <CardAction onClick={onAddIssue} aria-label="Mangel hinzufügen">
            <Plus className="h-3 w-3" aria-hidden="true" />
            Neuer Mangel
          </CardAction>
        }
      />

      <div className="px-4 py-4">
        {issues.length === 0 ? (
          <div className="flex items-center gap-3 rounded-sm border border-dashed border-base-300 bg-base-100/40 px-4 py-4 dark:border-navy-600 dark:bg-navy-900/30">
            <ShieldCheck className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-subdisplay text-sm text-base-content">
                Keine Mängel
              </p>
              <p className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-base-content/55">
                Fahrzeug ist fahrbereit
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
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
    </Card>
  );
}
