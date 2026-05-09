import { formatCurrency, formatNumber } from "~/utils/numberUtils";
import type { DashboardStats as DashboardStatsType } from "~/utils/home-stats";
import clsx from "clsx";

interface DashboardStatsProps {
  stats: DashboardStatsType;
  className?: string;
}

export function DashboardStats({ stats, className }: DashboardStatsProps) {
  const year = stats?.year ?? new Date().getFullYear();
  const totalKmThisYear = stats?.totalKmThisYear ?? (stats as any)?.total_km_this_year ?? 0;
  const totalKmOverall = stats?.totalKmOverall ?? (stats as any)?.total_km_overall ?? 0;
  const totalActiveIssues = stats?.totalActiveIssues ?? (stats as any)?.total_active_issues ?? 0;
  const totalMaintenanceCostThisYear = stats?.totalMaintenanceCostThisYear ?? (stats as any)?.total_maintenance_cost_this_year ?? 0;
  const veteranCount = stats?.veteranCount ?? (stats as any)?.veteran_count ?? 0;

  const busiestBike = stats?.busiestBike ?? (stats as any)?.busiest_bike;

  let bikeLabel = "—";
  if (typeof busiestBike === "string") {
    bikeLabel = busiestBike;
  } else if (busiestBike && typeof busiestBike === "object") {
    const bikeMake = busiestBike.make || (busiestBike as any).Make;
    const bikeModel = busiestBike.model || (busiestBike as any).Model;
    bikeLabel = bikeMake && bikeModel ? `${bikeMake} ${bikeModel}` : "—";
  }

  return (
    <section
      aria-labelledby="fleet-stats-heading"
      className={clsx("space-y-2", className)}
    >
      <h2 id="fleet-stats-heading" className="sr-only">
        Flotte {year}
      </h2>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label={`km ${year}`} value={formatNumber(totalKmThisYear)} accent="primary" />
        <StatCard label={`Kosten ${year}`} value={formatCurrency(totalMaintenanceCostThisYear)} />
        <StatCard label="km gesamt" value={formatNumber(totalKmOverall)} />
        <StatCard
          label="Mängel"
          value={totalActiveIssues.toString()}
          accent={totalActiveIssues > 0 ? "warning" : undefined}
        />
        <StatCard label="Veteranen" value={veteranCount.toString()} />
        <StatCard label="Fleissigstes" value={bikeLabel} variant="text" />
      </dl>
    </section>
  );
}

function StatCard({
  label,
  value,
  accent,
  variant = "number",
}: {
  label: string;
  value: string;
  accent?: "primary" | "warning";
  variant?: "number" | "text";
}) {
  const valueColor =
    accent === "primary"
      ? "text-primary dark:text-primary-light"
      : accent === "warning"
      ? "text-orange-600 dark:text-orange-400"
      : "text-foreground dark:text-white";

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 shadow-sm dark:border-navy-700 dark:bg-navy-800">
      <dt className="text-[10px] font-semibold uppercase tracking-wide leading-tight text-secondary/80 dark:text-navy-400">
        {label}
      </dt>
      <dd
        className={clsx(
          "mt-0.5 truncate font-bold leading-tight",
          variant === "number" ? "text-sm tabular-nums" : "text-xs",
          valueColor,
        )}
        title={variant === "text" ? value : undefined}
      >
        {value}
      </dd>
    </div>
  );
}
