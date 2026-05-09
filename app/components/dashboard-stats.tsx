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
  const totalMotorcycles = stats?.totalMotorcycles ?? (stats as any)?.total_motorcycles ?? 0;

  const busiestBike = stats?.busiestBike ?? (stats as any)?.busiest_bike;

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

  const costPerBike = totalMotorcycles > 0 ? totalMaintenanceCostThisYear / totalMotorcycles : 0;

  return (
    <section aria-labelledby="fleet-stats-heading" className="space-y-3">
      <h2 id="fleet-stats-heading" className="text-sm font-semibold text-foreground dark:text-white">
        Flotte {year}
      </h2>

      {/* Hero row: the two daily-relevant numbers */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <HeroStat
          label="Kilometer dieses Jahr"
          value={`${formatNumber(totalKmThisYear)} km`}
          description={`Registrierte Fahrten ${year}`}
          accent="primary"
        />
        <HeroStat
          label={`Kosten ${year}`}
          value={formatCurrency(totalMaintenanceCostThisYear)}
          description={
            totalMotorcycles > 0
              ? `Ø ${formatCurrency(costPerBike)} pro Bike`
              : "Erfasste Wartungskosten"
          }
        />
      </div>

      {/* Secondary row: smaller, denser */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat
          label="Kilometer insgesamt"
          value={`${formatNumber(totalKmOverall)} km`}
        />
        <MiniStat
          label="Offene Mängel"
          value={totalActiveIssues.toString()}
          accent={totalActiveIssues > 0 ? "warning" : undefined}
        />
        <MiniStat
          label="Veteranen-Bikes"
          value={veteranCount.toString()}
        />
        <MiniNameStat
          label="Fleissigstes Bike"
          name={bikeLabel}
          description={bikeDesc}
        />
      </div>
    </section>
  );
}

function HeroStat({
  label,
  value,
  description,
  accent,
}: {
  label: string;
  value: string;
  description: string;
  accent?: "primary";
}) {
  const valueColor =
    accent === "primary"
      ? "text-primary dark:text-primary-light"
      : "text-foreground dark:text-white";

  const accentBorder =
    accent === "primary"
      ? "border-t-primary dark:border-t-primary-light"
      : "border-t-transparent";

  return (
    <div
      className={clsx(
        "flex flex-col justify-between rounded-2xl border border-gray-200 border-t-2 bg-white p-4 shadow-sm motion-safe:transition-shadow hover:shadow-md dark:border-navy-700 dark:bg-navy-800",
        accentBorder,
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

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "warning";
}) {
  const valueColor =
    accent === "warning"
      ? "text-orange-600 dark:text-orange-400"
      : "text-foreground dark:text-white";

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm dark:border-navy-700 dark:bg-navy-800">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-secondary/80 dark:text-navy-400">
        {label}
      </dt>
      <dd className={clsx("mt-1 text-lg font-bold tabular-nums leading-tight", valueColor)}>
        {value}
      </dd>
    </div>
  );
}

function MiniNameStat({
  label,
  name,
  description,
}: {
  label: string;
  name: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm dark:border-navy-700 dark:bg-navy-800">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-secondary/80 dark:text-navy-400">
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm font-semibold leading-tight text-foreground dark:text-white" title={name}>
        {name}
      </dd>
      <p className="mt-0.5 truncate text-[11px] font-medium text-secondary/70 dark:text-navy-500" title={description}>
        {description}
      </p>
    </div>
  );
}
