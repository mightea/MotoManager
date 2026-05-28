import { Link } from "react-router";
import { useState } from "react";
import {
  Gauge,
  Route as RouteIcon,
  CalendarDays,
  MapPin,
  Wrench,
  AlertTriangle,
  Bike,
} from "lucide-react";
import clsx from "clsx";
import type { MotorcycleDashboardItem as DashboardCard } from "~/utils/home-stats";
import { createMotorcycleSlug } from "~/utils/motorcycle";
import { formatNumber } from "~/utils/numberUtils";
import { getBackendAssetUrl } from "~/utils/backend";

const INSPECTION_WARNING_DAYS = 60;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

type InspectionTier = "overdue" | "due-soon" | "ok" | "none";

interface MotorcycleCardProps {
  moto: DashboardCard;
}

/**
 * Motorcycle ID card — modeled on a service-manual file divider.
 *
 *   ┌────────────────────────────────────┐
 *   │  [stripe]    [stamp: VETERAN]      │
 *   │                                    │
 *   │             [hero photo]           │
 *   │                                    │
 *   │  MAKE / MODEL · 1985               │
 *   ├──┬──────────┬──────────┬───────────┤
 *   │██│ 12'345km │ 1'200 km │ MFK Jun 26│
 *   │  │ TOTAL    │ THIS YR  │ INSPECT.  │
 *   └──┴──────────┴──────────┴───────────┘
 *
 * Hover lifts the card and elevates the photo slightly.
 */
export function MotorcycleCard({ moto }: MotorcycleCardProps) {
  const [imageError, setImageError] = useState(false);
  const slug = createMotorcycleSlug(moto.make, moto.model);
  const currentYear = new Date().getFullYear();
  const imageUrl = getBackendAssetUrl(moto.image);
  const hasImage = Boolean(!imageError && imageUrl);

  const inspectionShort = moto.nextInspection?.dueDateISO
    ? new Intl.DateTimeFormat("de-CH", { month: "short", year: "2-digit" })
        .format(new Date(moto.nextInspection.dueDateISO))
        .replace(".", "")
    : null;

  const inspectionTier: InspectionTier = (() => {
    if (!moto.nextInspection) return "none";
    if (moto.nextInspection.isOverdue) return "overdue";
    const daysUntil = Math.round(
      (new Date(moto.nextInspection.dueDateISO).getTime() - Date.now()) / MS_PER_DAY
    );
    return daysUntil <= INSPECTION_WARNING_DAYS ? "due-soon" : "ok";
  })();

  const hasMaintenance = moto.hasOverdueMaintenance;
  const hasIssues = moto.numberOfIssues > 0;
  const hasLocation = Boolean(moto.currentLocationName);
  const showMetaRow = hasMaintenance || hasIssues || hasLocation;

  const aria = moto.fabricationDate
    ? `${moto.make} ${moto.model} (${moto.fabricationDate})`
    : `${moto.make} ${moto.model}`;

  return (
    <Link
      to={`/motorcycle/${slug}/${moto.id}`}
      aria-label={aria}
      className="group relative flex flex-col overflow-hidden rounded-sm border border-base-300 bg-base-100 shadow-[0_1px_0_0_rgba(15,23,42,0.04)] motion-safe:transition-[transform,box-shadow,border-color] motion-safe:duration-300 motion-safe:ease-out hover:border-base-content/25 hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.25)] motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-base-200 dark:bg-navy-800"
    >
      {/* Top file-tab — Dakar flag + ID code, optional Veteran stamp on the
          trailing edge. min-h is fixed so the header reads the same height
          whether or not a stamp is present. */}
      <div className="relative flex min-h-9 items-center justify-between gap-2 border-b border-base-200 px-3 dark:border-navy-700">
        <div className="flex items-center gap-2">
          <span className="motorsport-stripe block h-2 w-7" aria-hidden="true" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/50 tabular-nums">
            ID · {String(moto.id).padStart(4, "0")}
          </span>
        </div>
        {moto.isVeteran && <span className="stamp">Veteran</span>}
      </div>

      {/* Hero photo */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-base-200 dark:bg-navy-900">
        {hasImage ? (
          <img
            src={`${imageUrl}?width=800`}
            srcSet={`${imageUrl}?width=400 400w, ${imageUrl}?width=800 800w`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            alt=""
            className="h-full w-full object-cover motion-safe:transition-[transform,filter] motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-[1.06]"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            aria-hidden="true"
            className="grid h-full w-full place-items-center bg-gradient-to-br from-base-200 to-base-300 text-base-content/25 dark:from-navy-800 dark:to-navy-900"
          >
            <Bike className="h-14 w-14" strokeWidth={1.25} />
          </div>
        )}

        {/* Bottom gradient + headline */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-2 pt-8">
          <h3 className="font-display text-[1.35rem] uppercase leading-none tracking-wide text-white drop-shadow-sm line-clamp-1">
            {moto.make} <span className="text-white/85">{moto.model}</span>
          </h3>
          <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-white/65">
            {moto.fabricationDate ?? "Fabrikation —"}
          </p>
        </div>
      </div>

      {/* Telemetry row — three slots separated by hairline dividers, each
          with a tiny icon, a tabular-numeric value, and a mono caption. */}
      <div className="grid grid-cols-[8px_1fr_1fr_1fr] items-stretch">
        {/* Leading accent column tied to inspection tier */}
        <div
          aria-hidden="true"
          className={clsx(
            "h-full",
            inspectionTier === "overdue"
              ? "bg-error/80"
              : inspectionTier === "due-soon"
                ? "bg-[var(--color-workshop)]"
                : "bg-primary/60"
          )}
        />

        <TelemetrySlot
          icon={Gauge}
          value={formatNumber(moto.odometer)}
          caption="km · ODO"
          tone="default"
        />
        <TelemetrySlot
          icon={RouteIcon}
          value={moto.odometerThisYear > 0 ? formatNumber(moto.odometerThisYear) : "—"}
          caption={`km · ${currentYear}`}
          tone={moto.odometerThisYear > 0 ? "default" : "muted"}
        />
        <TelemetrySlot
          icon={CalendarDays}
          value={
            moto.nextInspection
              ? inspectionTier === "overdue"
                ? "Überfällig"
                : inspectionShort ?? "—"
              : "—"
          }
          caption="MFK"
          tone={
            inspectionTier === "overdue"
              ? "alert"
              : inspectionTier === "due-soon"
                ? "warn"
                : moto.nextInspection
                  ? "default"
                  : "muted"
          }
        />
      </div>

      {/* Meta row — status pills + location */}
      {showMetaRow && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-base-200 px-3 py-2 dark:border-navy-700">
          {hasMaintenance && (
            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-error">
              <Wrench className="h-3 w-3 shrink-0" aria-hidden="true" />
              Wartung fällig
            </span>
          )}
          {hasIssues && (
            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-workshop-ink)] dark:text-[var(--color-workshop-soft)]">
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
              {moto.numberOfIssues} {moto.numberOfIssues === 1 ? "Mangel" : "Mängel"}
            </span>
          )}
          {hasLocation && (
            <span className="ml-auto inline-flex min-w-0 max-w-full items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-base-content/55">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{moto.currentLocationName}</span>
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

function TelemetrySlot({
  icon: Icon,
  value,
  caption,
  tone = "default",
}: {
  icon: typeof Gauge;
  value: string;
  caption: string;
  tone?: "default" | "muted" | "warn" | "alert";
}) {
  const valueColor = {
    default: "text-base-content",
    muted: "text-base-content/30",
    warn: "text-[var(--color-workshop)]",
    alert: "text-error",
  }[tone];

  const iconColor = {
    default: "text-base-content/35",
    muted: "text-base-content/20",
    warn: "text-[var(--color-workshop)]",
    alert: "text-error/80",
  }[tone];

  return (
    <div className="flex flex-col justify-center gap-0.5 border-l border-base-200 px-2.5 py-2.5 first:border-l-0 dark:border-navy-700">
      <div className="flex items-center gap-1.5">
        <Icon className={clsx("h-3 w-3 shrink-0", iconColor)} aria-hidden="true" />
        <span className={clsx("font-numeric text-[13px] font-semibold leading-none truncate", valueColor)}>
          {value}
        </span>
      </div>
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/50">
        {caption}
      </span>
    </div>
  );
}
