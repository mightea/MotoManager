import { formatCurrency, formatNumber } from "~/utils/numberUtils";
import type { DashboardStats as DashboardStatsType } from "~/utils/home-stats";
import clsx from "clsx";

interface DashboardStatsProps {
  stats: DashboardStatsType;
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const year = stats?.year ?? new Date().getFullYear();
  const totalKmThisYear = stats?.totalKmThisYear ?? (stats as any)?.total_km_this_year ?? 0;
  const totalKmOverall = stats?.totalKmOverall ?? (stats as any)?.total_km_overall ?? 0;
  const totalActiveIssues = stats?.totalActiveIssues ?? (stats as any)?.total_active_issues ?? 0;
  const totalMaintenanceCostThisYear = stats?.totalMaintenanceCostThisYear ?? (stats as any)?.total_maintenance_cost_this_year ?? 0;
  const veteranCount = stats?.veteranCount ?? (stats as any)?.veteran_count ?? 0;
  
  // Support both camelCase and snake_case for the busiest bike field
  const busiestBike = stats?.busiestBike ?? (stats as any)?.busiest_bike;

  // Handle case where busiestBike is just a string from the backend
  let bikeLabel = "—";
  let bikeDesc = "Keine Fahrten in diesem Jahr";
  
  if (typeof busiestBike === "string") {
    bikeLabel = busiestBike;
    bikeDesc = `${formatNumber(totalKmThisYear)} km insgesamt in ${year}`;
  } else if (busiestBike && typeof busiestBike === "object") {
    const bikeMake = busiestBike.make || (busiestBike as any).Make;
    const bikeModel = busiestBike.model || (busiestBike as any).Model;
    const bikeOdo = busiestBike.odometerThisYear ?? (busiestBike as any).odometer_this_year ?? (busiestBike as any).OdometerThisYear ?? 0;
    
    bikeLabel = bikeMake && bikeModel ? `${bikeMake} ${bikeModel}` : "—";
    bikeDesc = `${formatNumber(bikeOdo)} km in ${year}`;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground dark:text-white">
        Flotte {year}
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Kilometer dieses Jahr"
          value={`${formatNumber(totalKmThisYear)} km`}
          description={`Registrierte Fahrten ${year}`}
          accent="primary"
        />
        <StatCard
          label="Kilometer insgesamt"
          value={`${formatNumber(totalKmOverall)} km`}
          description="Gesamtkilometer aller Bikes"
        />
        <StatCard
          label="Offene Mängel"
          value={totalActiveIssues.toString()}
          description="Ausstehend über alle Motorräder"
          accent={totalActiveIssues > 0 ? "warning" : undefined}
        />
        <StatCard
          label={`Kosten ${year}`}
          value={formatCurrency(totalMaintenanceCostThisYear)}
          description="Erfasste Wartungskosten"
        />
        <StatCard
          label="Veteranen-Bikes"
          value={veteranCount.toString()}
          description="Motorräder mit Veteranen-Status"
        />
        <StatCard
          label="Fleissigstes Bike"
          value={bikeLabel}
          description={bikeDesc}
          accent={busiestBike ? "primary" : undefined}
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
