import { formatCurrency, formatNumber } from "~/utils/numberUtils";
import type { DashboardStats as DashboardStatsType } from "~/utils/home-stats";
import clsx from "clsx";

interface DashboardStatsProps {
  stats: DashboardStatsType;
  className?: string;
}

export function DashboardStats({ stats, className }: DashboardStatsProps) {
  const {
    year,
    totalKmThisYear,
    totalKmOverall,
    totalActiveIssues,
    totalMaintenanceCostThisYear,
    veteranCount,
    busiestBike,
  } = stats;

  let bikeLabel = "—";
  if (typeof busiestBike === "string") {
    bikeLabel = busiestBike;
  } else if (busiestBike && typeof busiestBike === "object") {
    bikeLabel = busiestBike.make && busiestBike.model ? `${busiestBike.make} ${busiestBike.model}` : "—";
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
        <StatCard
          label={`Fahrstrecke ${year}`}
          value={formatNumber(totalKmThisYear)}
          unit="km"
          accent="primary"
        />
        <StatCard
          label={`Wartungskosten ${year}`}
          value={formatCurrency(totalMaintenanceCostThisYear)}
        />
        <StatCard
          label="Gesamtkilometer"
          value={formatNumber(totalKmOverall)}
          unit="km"
        />
        <StatCard
          label="Offene Mängel"
          value={String(totalActiveIssues)}
          unit={totalActiveIssues === 1 ? "Mangel" : "Mängel"}
          accent={totalActiveIssues > 0 ? "warning" : undefined}
        />
        <StatCard
          label="Veteranen"
          value={String(veteranCount)}
          unit={veteranCount === 1 ? "Fahrzeug" : "Fahrzeuge"}
        />
        <StatCard label="Fleissigstes Motorrad" value={bikeLabel} variant="text" />
      </dl>
    </section>
  );
}

function StatCard({
  label,
  value,
  unit,
  accent,
  variant = "number",
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: "primary" | "warning";
  variant?: "number" | "text";
}) {
  const valueColor =
    accent === "primary"
      ? "text-primary"
      : accent === "warning"
      ? "text-warning"
      : "text-base-content";

  return (
    <div className="rounded-lg border border-base-300 bg-base-100 px-2.5 py-1.5 shadow-sm">
      <dt className="text-[10px] font-semibold uppercase tracking-wide leading-tight text-base-content/60">
        {label}
      </dt>
      <dd
        className={clsx(
          "mt-0.5 truncate leading-tight",
          variant === "number" ? "text-sm" : "text-xs",
        )}
        title={variant === "text" ? value : undefined}
      >
        <span className={clsx("font-bold", variant === "number" && "tabular-nums", valueColor)}>
          {value}
        </span>
        {unit && (
          <span className="ml-1 text-[10px] font-medium text-base-content/60">
            {unit}
          </span>
        )}
      </dd>
    </div>
  );
}
