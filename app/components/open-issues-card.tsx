import { AlertCircle, Plus } from "lucide-react";
import clsx from "clsx";
import type { Issue } from "~/db/schema";
import { Button } from "~/components/button";

type OpenIssuesCardProps = {
  issues: Issue[];
  dateFormatter: Intl.DateTimeFormat;
  onAddIssue?: () => void;
  className?: string;
};

export default function OpenIssuesCard({
  issues,
  dateFormatter,
  onAddIssue,
  className,
}: OpenIssuesCardProps) {
  const handleAddIssue = () => {
    onAddIssue?.();
  };

  return (
    <div
      className={clsx(
        "rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-navy-700 dark:bg-navy-800",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold leading-tight text-foreground dark:text-white">
          Offene Mängel
        </h2>
        <Button
          type="button"
          onClick={handleAddIssue}
          variant="secondary"
          size="sm"
          className="rounded-2xl"
        >
          <Plus className="h-4 w-4" />
          Mangel hinzufügen
        </Button>

        <div className="text-sm text-muted-foreground">Verfolge und verwalte offene Probleme mit deinem Motorrad.</div>
      </div>

      {issues.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-white to-gray-50 p-6 text-center text-secondary dark:border-navy-600 dark:from-navy-800 dark:to-navy-900 dark:text-navy-300">
          <p className="text-base font-medium">
            Super! Es sind keine Mängel für dieses Motorrad erfasst.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {issues.map((issue) => (
            <li key={issue.id} className="flex items-center gap-3">
              <AlertCircle
                className={clsx("h-5 w-5", {
                  "text-red-500": issue.priority === "high",
                  "text-orange-500": issue.priority === "medium",
                  "text-yellow-500": issue.priority === "low",
                })}
              />
              <div className="flex-1">
                <p className="font-medium text-foreground dark:text-gray-200">
                  {issue.description || "Beschreibung fehlt"}
                </p>
                <p className="text-xs text-secondary dark:text-navy-400">
                  {issue.date
                    ? dateFormatter.format(new Date(issue.date))
                    : "Datum unbekannt"}
                </p>
              </div>
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  {
                    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400":
                      issue.priority === "high",
                    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400":
                      issue.priority === "medium",
                    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400":
                      issue.priority === "low",
                  }
                )}
              >
                {issue.priority === "high"
                  ? "Hoch"
                  : issue.priority === "medium"
                    ? "Mittel"
                    : "Niedrig"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
