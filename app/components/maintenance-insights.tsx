import clsx from "clsx";
import type { MaintenanceInsight, InsightCategory } from "~/utils/maintenance-intervals";
import { formatNumber } from "~/utils/numberUtils";
import { Card, CardHeading } from "~/components/card";

type MaintenanceInsightsCardProps = {
  insights: MaintenanceInsight[];
  className?: string;
};

const DISPLAY_ORDER: InsightCategory[] = ["Flüssigkeiten", "Reifen", "Batterie", "Wartung"];

const monthYearFormatter = new Intl.DateTimeFormat("de-CH", {
  month: "short",
  year: "numeric",
});

/**
 * Share of the service interval already used (0–1+), from time and — when a
 * km interval is set — distance, whichever is further along. Null when the
 * insight has no interval to measure against.
 */
function intervalUsed(insight: MaintenanceInsight): number | null {
  const shares: number[] = [];
  if (insight.lastDate && insight.nextDate) {
    const last = new Date(insight.lastDate).getTime();
    const next = new Date(insight.nextDate).getTime();
    if (next > last) shares.push((Date.now() - last) / (next - last));
  }
  if (insight.kmsSinceLast !== undefined && insight.kmsRemaining !== undefined) {
    const total = insight.kmsSinceLast + insight.kmsRemaining;
    if (total > 0) shares.push(insight.kmsSinceLast / total);
  }
  return shares.length > 0 ? Math.max(0, ...shares) : null;
}

/** Interval length in whole years, from the last date to the next due date. */
function intervalYears(insight: MaintenanceInsight): number | null {
  if (!insight.lastDate || !insight.nextDate) return null;
  const last = new Date(insight.lastDate);
  const next = new Date(insight.nextDate);
  const years = next.getFullYear() - last.getFullYear();
  return years > 0 ? years : null;
}

const STATUS_TAG: Record<MaintenanceInsight["status"], { label: string; text: string; bar: string; row: string }> = {
  overdue: { label: "Überfällig", text: "text-error", bar: "bg-error", row: "bg-error/5 dark:bg-error/10" },
  due: {
    label: "Fällig",
    text: "text-[var(--color-workshop-ink)] dark:text-[var(--color-workshop-soft)]",
    bar: "bg-[var(--color-workshop)]",
    row: "bg-[var(--color-workshop)]/10",
  },
  ok: { label: "OK", text: "text-success", bar: "bg-success", row: "" },
  unknown: { label: "—", text: "text-base-content/60", bar: "bg-base-content/30", row: "" },
};

/**
 * Service intervals as one flat list: each item names its status, shows how
 * much of the interval is used as a bar, and below it the last service and
 * the interval with the share in percent.
 */
export function MaintenanceInsightsCard({
  insights,
  className,
}: MaintenanceInsightsCardProps) {
  // Board order: fluids first, then tires, battery, the rest — stable within.
  const ordered = [...insights].sort(
    (a, b) => DISPLAY_ORDER.indexOf(a.category) - DISPLAY_ORDER.indexOf(b.category),
  );

  const tally = insights.reduce(
    (acc, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1;
      return acc;
    },
    { overdue: 0, due: 0, ok: 0, unknown: 0 } as Record<MaintenanceInsight["status"], number>,
  );

  const isEmpty = insights.length === 0;
  const summary = [
    tally.overdue > 0 ? `${tally.overdue} überfällig` : null,
    tally.due > 0 ? `${tally.due} fällig` : null,
    tally.ok > 0 ? `${tally.ok} OK` : null,
  ].filter(Boolean).join(" · ");
  const summaryTone = tally.overdue > 0
    ? "text-error"
    : tally.due > 0
      ? "text-[var(--color-workshop-ink)] dark:text-[var(--color-workshop-soft)]"
      : "text-success";

  return (
    <Card className={className}>
      <CardHeading
        title="Service-Intervalle"
        trailing={
          !isEmpty && summary ? (
            <span className={clsx("font-mono text-[12px] font-bold uppercase", summaryTone)}>{summary}</span>
          ) : undefined
        }
      />

      {isEmpty ? (
        <p className="px-4 py-4 text-sm text-base-content/70 dark:text-navy-300">
          Noch keine service-relevanten Einträge — Intervalle erscheinen nach dem ersten Öl-, Reifen- oder Batteriewechsel.
        </p>
      ) : (
        <ul>
          {ordered.map((insight) => {
            const tag = STATUS_TAG[insight.status];
            const used = intervalUsed(insight);
            const pct = used === null ? null : Math.round(used * 100);
            const years = intervalYears(insight);
            const meta = [
              insight.lastDate ? monthYearFormatter.format(new Date(insight.lastDate)) : null,
              insight.kmsSinceLast !== undefined ? `seit ${formatNumber(insight.kmsSinceLast)} km` : null,
            ].filter(Boolean).join(" · ");
            const interval = [
              years ? `alle ${years} J.` : null,
              pct !== null ? `${pct} %` : null,
            ].filter(Boolean).join(" · ");

            return (
              <li
                key={insight.key}
                className={clsx(
                  "flex flex-col gap-1.5 border-t border-base-200/70 px-4 py-2.5 first:border-t-0 dark:border-navy-700",
                  tag.row,
                )}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-base-content dark:text-white">{insight.label}</span>
                  <span className={clsx("font-mono text-[11px] font-bold uppercase tracking-[0.1em]", tag.text)}>
                    {tag.label}
                  </span>
                </div>
                {pct !== null && (
                  <>
                    <span suppressHydrationWarning className="sr-only">{`${pct} % des Intervalls verbraucht`}</span>
                    <div aria-hidden="true" className="h-1.5 overflow-hidden bg-base-200 dark:bg-navy-700">
                      <div className={clsx("h-full", tag.bar)} style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </>
                )}
                <div
                  suppressHydrationWarning
                  className="flex justify-between gap-3 font-mono text-[12px] text-base-content/70 dark:text-navy-300"
                >
                  <span>{meta || "Keine Daten"}</span>
                  {interval && <span className="shrink-0 uppercase">{interval}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
