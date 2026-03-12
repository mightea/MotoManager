import { formatCurrency, formatNumber } from "~/utils/numberUtils";
import type { DashboardStats as DashboardStatsType } from "~/utils/home-stats";
import clsx from "clsx";

interface DashboardStatsProps {
  stats: DashboardStatsType;
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground dark:text-white">
        Flotte {stats.year}
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Kilometer dieses Jahr"
          value={`${formatNumber(stats.totalKmThisYear)} km`}
          description={`Registrierte Fahrten ${stats.year}`}
          accent="primary"
        />
        <StatCard
          label="Kilometer insgesamt"
          value={`${formatNumber(stats.totalKmOverall)} km`}
          description="Gesamtkilometer aller Bikes"
        />
        <StatCard
          label="Offene Mängel"
          value={stats.totalActiveIssues.toString()}
          description="Ausstehend über alle Motorräder"
          accent={stats.totalActiveIssues > 0 ? "warning" : undefined}
        />
        <StatCard
          label={`Kosten ${stats.year}`}
          value={formatCurrency(stats.totalMaintenanceCostThisYear)}
          description="Erfasste Wartungskosten"
        />
        <StatCard
          label="Veteranen-Bikes"
          value={stats.veteranCount.toString()}
          description="Motorräder mit Veteranen-Status"
        />
        <StatCard
          label="Fleissigstes Bike"
          value={stats.topRider ? `${stats.topRider.make} ${stats.topRider.model}` : "—"}
          description={
            stats.topRider
              ? `${formatNumber(stats.topRider.odometerThisYear)} km in ${stats.year}`
              : "Keine Fahrten in diesem Jahr"
          }
          accent={stats.topRider ? "primary" : undefined}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
  accent,
}: {
  label: string;
  value: string;
  description: string;
  accent?: "primary" | "warning";
}) {
  const accentBorder =
    accent === "primary"
      ? "border-t-primary dark:border-t-primary-light"
      : accent === "warning"
      ? "border-t-orange-500 dark:border-t-orange-400"
      : "border-t-transparent";

  const valueColor =
    accent === "primary"
      ? "text-primary dark:text-primary-light"
      : accent === "warning"
      ? "text-orange-600 dark:text-orange-400"
      : "text-foreground dark:text-white";

  return (
    <div
      className={clsx(
        "flex flex-col justify-between rounded-2xl border border-gray-200 border-t-2 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-navy-700 dark:bg-navy-800",
        accentBorder
      )}
    >
      <div>
        <dt className="text-xs font-semibold text-secondary dark:text-navy-400">
          {label}
        </dt>
        <dd className={clsx("mt-2 text-2xl font-bold tabular-nums", valueColor)}>
          {value}
        </dd>
      </div>
      <p className="mt-3 text-xs text-secondary/70 dark:text-navy-500">
        {description}
      </p>
    </div>
  );
}
