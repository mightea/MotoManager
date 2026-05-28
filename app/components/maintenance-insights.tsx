import clsx from "clsx";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import type { MaintenanceInsight, InsightCategory } from "~/utils/maintenance-intervals";
import { formatNumber } from "~/utils/numberUtils";
import { Card, CardHeading } from "~/components/card";

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

const CATEGORY_ORDER: InsightCategory[] = ["Reifen", "Batterie", "Flüssigkeiten", "Wartung"];

const STATUS_ICON = {
  ok:      { Icon: CheckCircle2,  className: "text-success" },
  due:     { Icon: AlertTriangle, className: "text-[var(--color-workshop)]" },
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

  const tally = insights.reduce(
    (acc, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1;
      return acc;
    },
    { overdue: 0, due: 0, ok: 0, unknown: 0 } as Record<MaintenanceInsight["status"], number>,
  );

  const isEmpty = insights.length === 0;
  const worstStatus = tally.overdue > 0 ? "overdue" : tally.due > 0 ? "due" : "ok";
  const accent = worstStatus === "overdue" ? "error" : worstStatus === "due" ? "workshop" : undefined;

  return (
    <Card className={className} accent={accent}>
      <CardHeading
        code="03"
        title="Service-Intervalle"
        trailing={
          !isEmpty && (
            <div className="flex items-center gap-2 font-mono text-[10px] font-semibold tabular-nums">
              {tally.overdue > 0 && (
                <span className="inline-flex items-center gap-1 text-error" aria-label={`${tally.overdue} überfällig`}>
                  <XCircle className="h-3 w-3" aria-hidden="true" />
                  {tally.overdue}
                </span>
              )}
              {tally.due > 0 && (
                <span className="inline-flex items-center gap-1 text-[var(--color-workshop)]" aria-label={`${tally.due} fällig`}>
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  {tally.due}
                </span>
              )}
              {tally.ok > 0 && (
                <span className="inline-flex items-center gap-1 text-success" aria-label={`${tally.ok} in Ordnung`}>
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  {tally.ok}
                </span>
              )}
            </div>
          )
        }
      />

      <div className="px-4 py-4">
        {isEmpty ? (
          <div className="rounded-sm border border-dashed border-base-300 bg-base-100/40 px-4 py-5 text-center dark:border-navy-600 dark:bg-navy-900/30">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-base-content/55">
              Keine service-relevanten Daten
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {CATEGORY_ORDER.map((category) => {
              const items = groupedInsights[category];
              if (!items || items.length === 0) return null;

              return (
                <div key={category}>
                  <h3 className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-base-content/50">
                    {category}
                  </h3>
                  <ul className="space-y-2">
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

                      const meta = [datePart, kmsSincePart].filter(Boolean).join(" · ");

                      return (
                        <li key={insight.key} className="flex items-start gap-2.5">
                          <Icon
                            className={clsx("mt-0.5 h-4 w-4 shrink-0", iconClassName)}
                            aria-hidden="true"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold leading-tight text-base-content dark:text-white">
                              {insight.label}
                            </p>
                            <p
                              suppressHydrationWarning
                              className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] leading-snug text-base-content/55 dark:text-navy-400"
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
    </Card>
  );
}
