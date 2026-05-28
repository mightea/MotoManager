import { formatCurrency, formatNumber } from "~/utils/numberUtils";
import type { DashboardStats as DashboardStatsType } from "~/utils/home-stats";
import clsx from "clsx";

interface DashboardStatsProps {
  stats: DashboardStatsType;
  className?: string;
}

/**
 * Fleet telemetry strip — a row of gauge-styled stat cards. Each card
 * carries a leading vertical accent rail (toned by status), tabular
 * numerics in the mono face, and a small uppercase mono caption.
 */
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
          unit={veteranCount === 1 ? "Fahrzeug" : "Fahrzeuge"}
          tone="workshop"
        />
        <Gauge
          code="06"
          label="Fleissigstes Motorrad"
          value={bikeLabel}
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
    <div className="group relative flex gap-2.5 rounded-sm border border-base-300/70 bg-base-100 px-2.5 py-2 shadow-[0_1px_0_0_rgba(0,0,0,0.02)] transition-colors hover:border-base-content/20 dark:bg-navy-800">
      <div className={clsx("w-[3px] shrink-0 rounded-full", railClass)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <dt className="flex items-center gap-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-base-content/55">
          <span className="text-base-content/30 tabular-nums">{code}</span>
          <span className="h-px w-1.5 bg-base-content/30" aria-hidden="true" />
          <span className="truncate">{label}</span>
        </dt>
        <dd
          className={clsx(
            "mt-0.5 leading-tight truncate",
            variant === "number" ? "text-[15px]" : "text-xs",
          )}
          title={variant === "text" ? value : undefined}
        >
          <span
            className={clsx(
              "font-semibold",
              variant === "number" ? "font-numeric" : "font-display uppercase tracking-wide",
              valueClass,
            )}
          >
            {value}
          </span>
          {unit && (
            <span className="ml-1 font-mono text-[10px] font-medium tracking-wider uppercase text-base-content/50">
              {unit}
            </span>
          )}
        </dd>
      </div>
    </div>
  );
}
