import clsx from "clsx";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import type { MaintenanceInsight, InsightCategory } from "~/utils/maintenance-intervals";

type MaintenanceInsightsCardProps = {
  insights: MaintenanceInsight[];
  className?: string;
};

export function MaintenanceInsightsCard({
  insights,
  className,
}: MaintenanceInsightsCardProps) {
  const dateFormatter = new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
  });

  const getStatusIcon = (status: MaintenanceInsight["status"]) => {
    switch (status) {
      case "ok":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "due":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "overdue":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatRelativeDuration = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "In der Zukunft";
    if (diffDays === 0) return "Heute";

    const years = Math.floor(diffDays / 365);
    const remainingDaysAfterYears = diffDays % 365;
    const months = Math.floor(remainingDaysAfterYears / 30);

    if (years > 0) {
        return `vor ${years} Jahr${years > 1 ? 'en' : ''}`;
    }
    if (months > 0) {
        return `vor ${months} Monat${months > 1 ? 'en' : ''}`;
    }
    return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
  };

  // Sort within groups: overdue first, then due, then ok
  const sortInsights = (items: MaintenanceInsight[]) => {
      const priority = { overdue: 0, due: 1, ok: 2, unknown: 3 };
      return [...items].sort((a, b) => priority[a.status] - priority[b.status]);
  };

  // Group by category
  const groupedInsights = insights.reduce<Record<InsightCategory, MaintenanceInsight[]>>((acc, insight) => {
      if (!acc[insight.category]) {
          acc[insight.category] = [];
      }
      acc[insight.category].push(insight);
      return acc;
  }, {} as Record<InsightCategory, MaintenanceInsight[]>);

  // Define display order for categories
  const categoryOrder: InsightCategory[] = ["Reifen", "Batterie", "Flüssigkeiten"];

  return (
    <div
      className={clsx(
        "rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-navy-700 dark:bg-navy-800",
        className,
      )}
    >
      <h2 className="mb-4 text-base font-semibold text-foreground dark:text-white">
        Wartungsintervalle
      </h2>

      {Object.keys(groupedInsights).length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-secondary dark:border-navy-600 dark:text-navy-300">
          <p className="text-sm font-medium">
            Keine wartungsrelevanten Daten gefunden.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
            {categoryOrder.map(category => {
                const items = groupedInsights[category];
                if (!items || items.length === 0) return null;

                const sortedItems = sortInsights(items);

                return (
                    <div key={category}>
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-secondary/70 dark:text-navy-300/70">
                            {category}
                        </h3>
                        <ul className="space-y-3">
                            {sortedItems.map((insight) => {
                                const formattedDate = insight.lastDate ? dateFormatter.format(new Date(insight.lastDate)) : "";
                                const relativeDuration = insight.lastDate ? formatRelativeDuration(insight.lastDate) : "";
                                const kmsSince = insight.kmsSinceLast ? `${insight.kmsSinceLast.toLocaleString('de-CH')} km` : "";

                                const parts = [
                                    formattedDate,
                                    relativeDuration ? `(${relativeDuration})` : null,
                                    kmsSince ? `• ${kmsSince}` : null
                                ].filter(Boolean).join(" ");

                                return (
                                <li key={insight.key} className="flex items-start gap-3">
                                    <div className="mt-0.5 shrink-0">
                                        {getStatusIcon(insight.status)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm text-foreground dark:text-white">
                                            {insight.label}
                                        </p>
                                        <p className="text-xs text-secondary dark:text-navy-400">
                                            {parts || "Keine Daten"}
                                        </p>
                                    </div>
                                </li>
                                );
                            })}
                        </ul>
                    </div>
                );
            })}
        </div>
      )}
    </div>
  );
}
