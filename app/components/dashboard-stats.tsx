import { formatCurrency, formatNumber } from "~/utils/numberUtils";
import type { DashboardStats as DashboardStatsType } from "~/utils/home-stats";
import clsx from "clsx";

interface DashboardStatsProps {
  stats: DashboardStatsType;
  /** This year's km of the busiest bike, derived from the fleet cards. */
  busiestBikeKm?: number | null;
  className?: string;
}

/**
 * Fleet telemetry strip — a row of gauge-styled stat cards. Each card
 * carries a leading vertical accent rail (toned by status), tabular
 * numerics in the mono face, and a small uppercase mono caption.
 */
export function DashboardStats({ stats, busiestBikeKm, className }: DashboardStatsProps) {
  const {
    year,
    totalMotorcycles,
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

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
        <Gauge
          code="01"
          label={`Fahrstrecke ${year}`}
          value={formatNumber(totalKmThisYear)}
          unit="km"
          tone="primary"
        />
        <Gauge
          code="02"
          label={`Wartungskosten ${year}`}
          value={formatCurrency(totalMaintenanceCostThisYear)}
          tone="violet"
        />
        <Gauge
          code="03"
          label="Gesamtkilometer"
          value={formatNumber(totalKmOverall)}
          unit="km"
          tone="neutral"
        />
        <Gauge
          code="04"
          label="Offene Mängel"
          value={String(totalActiveIssues)}
          unit={totalActiveIssues === 1 ? "Mangel" : "Mängel"}
          tone={totalActiveIssues > 0 ? "alert" : "neutral"}
        />
        <Gauge
          code="05"
          label="Veteranen"
          value={String(veteranCount)}
          unit={totalMotorcycles > 0 ? `von ${totalMotorcycles}` : undefined}
          tone="workshop"
        />
        <Gauge
          code="06"
          label="Fleissigste"
          value={bikeLabel}
          unit={bikeLabel !== "—" && busiestBikeKm ? `${formatNumber(busiestBikeKm)} km` : undefined}
          variant="text"
          tone="neutral"
        />
      </dl>
    </section>
  );
}

type GaugeTone = "primary" | "violet" | "alert" | "workshop" | "neutral";

function Gauge({
  code,
  label,
  value,
  unit,
  tone = "neutral",
  variant = "number",
}: {
  code: string;
  label: string;
  value: string;
  unit?: string;
  tone?: GaugeTone;
  variant?: "number" | "text";
}) {
  const railClass = {
    primary: "bg-primary",
    violet: "bg-secondary",
    alert: "bg-error",
    workshop: "bg-[var(--color-workshop)]",
    neutral: "bg-base-content/25",
  }[tone];

  const valueClass = {
    primary: "text-primary",
    violet: "text-secondary",
    alert: "text-error",
    workshop: "text-[var(--color-workshop-ink)] dark:text-[var(--color-workshop-soft)]",
    neutral: "text-base-content",
  }[tone];

  return (
    <div className="flex min-w-0 gap-2.5 rounded-sm border border-base-300/70 bg-base-100 px-3 py-2.5 dark:border-navy-700 dark:bg-navy-800">
      <div className={clsx("w-[3px] shrink-0 rounded-sm", railClass)} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70">
          <span className="text-base-content/40 tabular-nums">{code} — </span>
          {label}
        </dt>
        <dd
          className={clsx(
            "font-numeric font-bold leading-tight",
            variant === "number" ? "text-[22px]" : "line-clamp-2 text-lg leading-tight",
          )}
          title={variant === "text" ? value : undefined}
        >
          <span className={valueClass}>{value}</span>
          {unit && (
            <span className="ml-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70">
              {unit}
            </span>
          )}
        </dd>
      </div>
    </div>
  );
}
