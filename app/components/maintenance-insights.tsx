import clsx from "clsx";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import type { MaintenanceInsight, InsightCategory } from "~/utils/maintenance-intervals";
import { formatNumber } from "~/utils/numberUtils";

type MaintenanceInsightsCardProps = {
  insights: MaintenanceInsight[];
  className?: string;
};

const STATUS_PRIORITY: Record<MaintenanceInsight["status"], number> = {
  overdue: 0,
  due: 1,
  ok: 2,
  unknown: 3,
};

// Display order across categories — same as the design kit.
const CATEGORY_ORDER: InsightCategory[] = ["Reifen", "Batterie", "Flüssigkeiten", "Wartung"];

const STATUS_ICON = {
  ok:      { Icon: CheckCircle2,  className: "text-success" },
  due:     { Icon: AlertTriangle, className: "text-warning" },
  overdue: { Icon: XCircle,       className: "text-error" },
  unknown: { Icon: Info,          className: "text-base-content/40" },
} as const;

const monthYearFormatter = new Intl.DateTimeFormat("de-CH", {
  month: "short",
  year: "numeric",
});

function formatRelativeDuration(dateStr: string): string {
  const diffDays = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return "in der Zukunft";
  if (diffDays === 0) return "heute";

  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);

  if (years > 0) return `vor ${years} Jahr${years > 1 ? "en" : ""}`;
  if (months > 0) return `vor ${months} Monat${months > 1 ? "en" : ""}`;
  return `vor ${diffDays} Tag${diffDays > 1 ? "en" : ""}`;
}

export function MaintenanceInsightsCard({
  insights,
  className,
}: MaintenanceInsightsCardProps) {
  // Group by category and sort overdue → due → ok → unknown within each group.
  const groupedInsights = insights.reduce<Record<InsightCategory, MaintenanceInsight[]>>(
    (acc, insight) => {
      (acc[insight.category] ??= []).push(insight);
      return acc;
    },
    {} as Record<InsightCategory, MaintenanceInsight[]>,
  );

  for (const cat in groupedInsights) {
    groupedInsights[cat as InsightCategory].sort(
      (a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status],
    );
  }

  // Header tally — overdue/due/ok counts, mirroring the kit's small status strip.
  const tally = insights.reduce(
    (acc, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1;
      return acc;
    },
    { overdue: 0, due: 0, ok: 0, unknown: 0 } as Record<MaintenanceInsight["status"], number>,
  );

  const isEmpty = insights.length === 0;

  return (
    <div
      className={clsx(
        "rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm dark:border-navy-700 dark:bg-navy-800",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 pb-3 mb-3 border-b border-base-200 dark:border-navy-700">
        <h2 className="text-sm font-semibold text-foreground dark:text-white">
          Service-Intervalle
        </h2>
        {!isEmpty && (
          <div className="flex items-center gap-3 text-xs font-semibold tabular-nums">
            {tally.overdue > 0 && (
              <span className="inline-flex items-center gap-1 text-error" aria-label={`${tally.overdue} überfällig`}>
                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {tally.overdue}
              </span>
            )}
            {tally.due > 0 && (
              <span className="inline-flex items-center gap-1 text-warning" aria-label={`${tally.due} fällig`}>
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                {tally.due}
              </span>
            )}
            {tally.ok > 0 && (
              <span className="inline-flex items-center gap-1 text-success" aria-label={`${tally.ok} in Ordnung`}>
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                {tally.ok}
              </span>
            )}
          </div>
        )}
      </div>

      {isEmpty ? (
        <div className="rounded-lg border border-dashed border-base-300 px-4 py-6 text-center text-secondary dark:border-navy-600 dark:text-navy-300">
          <p className="text-sm font-medium">
            Keine service-relevanten Daten gefunden.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {CATEGORY_ORDER.map((category) => {
            const items = groupedInsights[category];
            if (!items || items.length === 0) return null;

            return (
              <div key={category}>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-base-content/55 dark:text-navy-300/70">
                  {category}
                </h3>
                <ul className="space-y-2.5">
                  {items.map((insight) => {
                    const { Icon, className: iconClassName } = STATUS_ICON[insight.status];

                    const dateLabel = insight.lastDate
                      ? monthYearFormatter.format(new Date(insight.lastDate))
                      : "";
                    const relativeLabel = insight.lastDate
                      ? formatRelativeDuration(insight.lastDate)
                      : "";

                    const datePart = [
                      dateLabel,
                      relativeLabel ? `(${relativeLabel})` : null,
                    ]
                      .filter(Boolean)
                      .join(" ");

                    const kmsSincePart =
                      insight.kmsSinceLast !== undefined
                        ? `seit ${formatNumber(insight.kmsSinceLast)} km`
                        : "";

                    const meta = [datePart, kmsSincePart].filter(Boolean).join(" • ");

                    return (
                      <li key={insight.key} className="flex items-start gap-2.5">
                        <Icon
                          className={clsx("mt-0.5 h-4 w-4 shrink-0", iconClassName)}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-tight text-foreground dark:text-white">
                            {insight.label}
                          </p>
                          <p
                            suppressHydrationWarning
                            className="mt-0.5 text-[11px] leading-snug tabular-nums text-secondary dark:text-navy-400"
                          >
                            {meta || "Keine Daten"}
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
