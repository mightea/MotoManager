import { AlertTriangle, CircleAlert, Info, CloudOff } from "lucide-react";
import clsx from "clsx";
import type { Issue } from "~/types/db";

type IssueItemProps = {
  issue: Issue & { isPending?: number };
  dateFormatter: Intl.DateTimeFormat;
  onSelect?: (issue: Issue) => void;
};

export function IssueItem({ issue, dateFormatter, onSelect }: IssueItemProps) {
  const handleClick = () => {
    onSelect?.(issue);
  };

  const PriorityIcon = issue.priority === "high"
    ? CircleAlert
    : issue.priority === "medium"
      ? AlertTriangle
      : Info;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={clsx(
        "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        issue.isPending === 1
          ? "bg-orange-50/40 hover:bg-orange-50/60 dark:bg-orange-950/10 dark:hover:bg-orange-950/20 border border-orange-200/50 dark:border-orange-900/30"
          : "hover:bg-gray-50 dark:hover:bg-navy-700/50"
      )}
      aria-label="Mangel bearbeiten"
    >
      <PriorityIcon
        className={clsx("h-5 w-5", {
          "text-red-500": issue.priority === "high",
          "text-orange-500": issue.priority === "medium",
          "text-blue-500": issue.priority === "low",
        })}
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground dark:text-gray-200">
            {issue.description || "Beschreibung fehlt"}
          </p>
          {issue.isPending === 1 && (
            <CloudOff className="h-3 w-3 text-orange-500" />
          )}
        </div>
        <p suppressHydrationWarning className="text-xs text-secondary dark:text-navy-400">
          {issue.date
            ? dateFormatter.format(new Date(issue.date))
            : "Datum unbekannt"}
        </p>
      </div>
      <span
        className={clsx(
          "rounded-md px-2 py-0.5 text-xs font-semibold",
          {
            "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300":
              issue.priority === "high",
            "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300":
              issue.priority === "medium",
            "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300":
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
    </button>
  );
}
