import { formatCurrency, formatNumber } from "~/utils/numberUtils";
import type { DashboardStats as DashboardStatsType } from "~/utils/home-stats";
import clsx from "clsx";

interface DashboardStatsProps {
  stats: DashboardStatsType;
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const year = stats?.year ?? new Date().getFullYear();
  const totalKmThisYear = stats?.totalKmThisYear ?? 0;
  const totalKmOverall = stats?.totalKmOverall ?? 0;
  const totalActiveIssues = stats?.totalActiveIssues ?? 0;
  const totalMaintenanceCostThisYear = stats?.totalMaintenanceCostThisYear ?? 0;
  const veteranCount = stats?.veteranCount ?? 0;
  const busiestBike = stats?.busiestBike;

  // Defensive access for make/model which might be capitalized from Rust backend
  const bikeMake = busiestBike ? (busiestBike.make || (busiestBike as any).Make) : null;
  const bikeModel = busiestBike ? (busiestBike.model || (busiestBike as any).Model) : null;
  const bikeOdo = busiestBike ? (busiestBike.odometerThisYear || (busiestBike as any).odometer_this_year || (busiestBike as any).OdometerThisYear) : 0;

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
          value={bikeMake && bikeModel ? `${bikeMake} ${bikeModel}` : "—"}
          description={
            busiestBike
              ? `${formatNumber(bikeOdo)} km in ${year}`
              : "Keine Fahrten in diesem Jahr"
          }
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
