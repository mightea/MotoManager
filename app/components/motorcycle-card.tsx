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

export function MotorcycleCard({ moto }: MotorcycleCardProps) {
  const [imageError, setImageError] = useState(false);
  const slug = createMotorcycleSlug(moto.make, moto.model);
  const currentYear = new Date().getFullYear();
  const imageUrl = getBackendAssetUrl(moto.image);
  const hasImage = Boolean(!imageError && imageUrl);

  const inspectionDateShort = moto.nextInspection?.dueDateISO
    ? new Intl.DateTimeFormat("de-CH", { month: "short", year: "numeric" }).format(
        new Date(moto.nextInspection.dueDateISO)
      )
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
      className="card card-bordered group overflow-hidden border-base-300 bg-base-100 shadow-sm motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out hover:border-primary/30 hover:shadow-xl motion-safe:hover:-translate-y-1 motion-safe:active:scale-[0.99] active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-base-200"
    >
      {/* Image banner */}
      <div className="relative h-36 w-full overflow-hidden bg-base-200">
        {/* Veteran badge — identity badge, not a warning */}
        {moto.isVeteran && (
          <span className="absolute left-2.5 top-2.5 z-[1] rounded-full bg-base-100/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-base-content shadow-sm ring-1 ring-base-content/10">
            Veteran
          </span>
        )}

        {hasImage ? (
          <img
            src={`${imageUrl}?width=800`}
            srcSet={`${imageUrl}?width=400 400w, ${imageUrl}?width=800 800w`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            alt=""
            className="h-full w-full object-cover motion-safe:transition-[transform,brightness] motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:scale-[1.04] motion-safe:group-hover:brightness-105"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            aria-hidden="true"
            className="grid h-full w-full place-items-center bg-gradient-to-br from-base-200 to-base-300 text-base-content/25"
          >
            <Bike className="h-14 w-14" strokeWidth={1.25} />
          </div>
        )}

        {/* Gradient — kept for title legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent motion-safe:transition-opacity motion-safe:duration-300 motion-safe:group-hover:opacity-95" />

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:group-hover:-translate-y-0.5">
          <h3 className="truncate text-base font-bold leading-tight text-white drop-shadow-sm">
            {moto.make} {moto.model}
          </h3>
          <p className="text-[11px] font-medium text-white/75 motion-safe:transition-opacity motion-safe:duration-300 group-hover:text-white/90">
            {moto.fabricationDate ?? "—"}
          </p>
        </div>
      </div>

      {/* 3-column stats */}
      <div className="grid grid-cols-3 divide-x divide-base-300">
        {/* Odometer */}
        <div className="flex flex-col items-center gap-0.5 px-2 py-3 text-center">
          <Gauge
            className="mb-0.5 h-3.5 w-3.5 text-base-content/40 motion-safe:transition-colors motion-safe:duration-300 group-hover:text-primary/60"
            aria-hidden="true"
          />
          <span className="text-sm font-bold tabular-nums leading-none text-base-content">
            {formatNumber(moto.odometer)}
          </span>
          <span className="text-[10px] font-medium text-base-content/60">km gesamt</span>
        </div>

        {/* This year */}
        <div className="flex flex-col items-center gap-0.5 px-2 py-3 text-center">
          <RouteIcon
            className="mb-0.5 h-3.5 w-3.5 text-base-content/40 motion-safe:transition-colors motion-safe:duration-300 group-hover:text-primary/60"
            aria-hidden="true"
          />
          <span
            className={clsx(
              "text-sm font-bold tabular-nums leading-none",
              moto.odometerThisYear > 0
                ? "text-base-content"
                : "text-base-content/30"
            )}
          >
            {moto.odometerThisYear > 0 ? formatNumber(moto.odometerThisYear) : "—"}
          </span>
          <span suppressHydrationWarning className="text-[10px] font-medium text-base-content/60">
            km {currentYear}
          </span>
        </div>

        {/* Next inspection */}
        <div className="flex flex-col items-center gap-0.5 px-2 py-3 text-center">
          <CalendarDays
            className={clsx(
              "mb-0.5 h-3.5 w-3.5 motion-safe:transition-colors motion-safe:duration-300",
              inspectionTier === "overdue"
                ? "text-error/80"
                : inspectionTier === "due-soon"
                  ? "text-warning"
                  : "text-base-content/40 group-hover:text-primary/60"
            )}
            aria-hidden="true"
          />
          {moto.nextInspection ? (
            <>
              <span
                className={clsx(
                  "text-xs font-bold leading-none",
                  inspectionTier === "overdue"
                    ? "text-error"
                    : inspectionTier === "due-soon"
                      ? "text-warning"
                      : "text-base-content"
                )}
              >
                <span className="sr-only">MFK Status: </span>
                {inspectionTier === "overdue" ? "Überfällig" : moto.nextInspection.relativeLabel}
              </span>
              <span
                className={clsx(
                  "text-[10px] font-medium",
                  inspectionTier === "overdue"
                    ? "text-error/70"
                    : inspectionTier === "due-soon"
                      ? "text-warning/80"
                      : "text-base-content/60"
                )}
              >
                {inspectionDateShort}
              </span>
            </>
          ) : (
            <>
              <span className="text-sm font-bold leading-none text-base-content/30">—</span>
              <span className="text-[10px] font-medium text-base-content/40">MFK</span>
            </>
          )}
        </div>
      </div>

      {/* Meta row: status + location, off the image so contrast is reliable */}
      {showMetaRow && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-base-300 px-3 py-2">
          {hasMaintenance && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-error">
              <Wrench className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Wartung fällig
            </span>
          )}
          {hasIssues && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {moto.numberOfIssues} offene{moto.numberOfIssues === 1 ? "r Mangel" : " Mängel"}
            </span>
          )}
          {hasLocation && (
            <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-base-content/60">
              <MapPin className="h-3 w-3 shrink-0 text-info/70" aria-hidden="true" />
              {moto.currentLocationName}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
