import { Link } from "react-router";
import { useState } from "react";
import { Gauge, Route as RouteIcon, CalendarDays, MapPin, Wrench, AlertTriangle } from "lucide-react";
import clsx from "clsx";
import type { MotorcycleDashboardItem as DashboardCard } from "~/utils/home-stats";
import { createMotorcycleSlug } from "~/utils/motorcycle";
import { formatNumber } from "~/utils/numberUtils";
import { getBackendAssetUrl } from "~/utils/backend";

interface MotorcycleCardProps {
  moto: DashboardCard;
}

export function MotorcycleCard({ moto }: MotorcycleCardProps) {
  const [imageError, setImageError] = useState(false);
  const slug = createMotorcycleSlug(moto.make, moto.model);
  const currentYear = new Date().getFullYear();
  const imageUrl = getBackendAssetUrl(moto.image);

  const inspectionDateShort = moto.nextInspection?.dueDateISO
    ? new Intl.DateTimeFormat("de-CH", { month: "short", year: "numeric" }).format(
        new Date(moto.nextInspection.dueDateISO)
      )
    : null;

  const hasMaintenance = moto.hasOverdueMaintenance;
  const hasIssues = moto.numberOfIssues > 0;
  const hasLocation = Boolean(moto.currentLocationName);
  const showMetaRow = hasMaintenance || hasIssues || hasLocation;

  return (
    <Link
      to={`/motorcycle/${slug}/${moto.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out hover:border-primary/20 hover:shadow-xl motion-safe:hover:-translate-y-1 motion-safe:active:scale-[0.99] active:shadow-sm dark:border-navy-700 dark:bg-navy-800 dark:hover:border-primary/30"
    >
      {/* Image banner */}
      <div className="relative h-36 w-full overflow-hidden">
        {/* Veteran badge — top left (identity, kept) */}
        {moto.isVeteran && (
          <span className="absolute left-2.5 top-2.5 z-[1] rounded-full border border-white/30 bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
            Veteran
          </span>
        )}

        <img
          src={!imageError && imageUrl ? `${imageUrl}?width=800` : "/favicon.svg"}
          srcSet={
            !imageError && imageUrl
              ? `${imageUrl}?width=400 400w, ${imageUrl}?width=800 800w`
              : undefined
          }
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          alt={`${moto.make} ${moto.model}`}
          className={clsx(
            "h-full w-full object-cover motion-safe:transition-[transform,brightness] motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-[1.06] motion-safe:group-hover:brightness-105",
            (imageError || !imageUrl) && "p-8 object-scale-down opacity-40 grayscale dark:invert"
          )}
          loading="lazy"
          onError={() => setImageError(true)}
        />

        {/* Gradient — kept for title legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent motion-safe:transition-opacity motion-safe:duration-300 motion-safe:group-hover:opacity-90" />

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:group-hover:-translate-y-0.5">
          <h3 className="text-base font-bold leading-tight text-white underline-offset-2 group-hover:underline decoration-white/40">
            {moto.make} {moto.model}
          </h3>
          <p className="text-[11px] font-medium text-white/70 motion-safe:transition-opacity motion-safe:duration-300 group-hover:text-white/90">
            {moto.fabricationDate ?? "—"}
          </p>
        </div>
      </div>

      {/* 3-column stats */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-navy-700">
        {/* Odometer */}
        <div className="flex flex-col items-center gap-0.5 px-2 py-3 text-center">
          <Gauge className="mb-0.5 h-3.5 w-3.5 text-secondary/40 motion-safe:transition-colors motion-safe:duration-300 group-hover:text-primary/50 dark:text-navy-500 dark:group-hover:text-primary-light/60" />
          <span className="text-sm font-bold tabular-nums leading-none text-foreground dark:text-white">
            {formatNumber(moto.odometer)}
          </span>
          <span className="text-[10px] font-medium text-secondary dark:text-navy-400">km gesamt</span>
        </div>

        {/* This year */}
        <div className="flex flex-col items-center gap-0.5 px-2 py-3 text-center">
          <RouteIcon className="mb-0.5 h-3.5 w-3.5 text-secondary/40 motion-safe:transition-colors motion-safe:duration-300 group-hover:text-primary/50 dark:text-navy-500 dark:group-hover:text-primary-light/60" />
          <span
            className={clsx(
              "text-sm font-bold tabular-nums leading-none",
              moto.odometerThisYear > 0
                ? "text-foreground dark:text-white"
                : "text-secondary/30 dark:text-navy-600"
            )}
          >
            {moto.odometerThisYear > 0 ? `+${formatNumber(moto.odometerThisYear)}` : "—"}
          </span>
          <span suppressHydrationWarning className="text-[10px] font-medium text-secondary dark:text-navy-400">
            km {currentYear}
          </span>
        </div>

        {/* Next inspection */}
        <div className="flex flex-col items-center gap-0.5 px-2 py-3 text-center">
          <CalendarDays className={clsx(
            "mb-0.5 h-3.5 w-3.5 motion-safe:transition-colors motion-safe:duration-300",
            moto.nextInspection?.isOverdue
              ? "text-red-500/60"
              : "text-secondary/40 group-hover:text-primary/50 dark:text-navy-500 dark:group-hover:text-primary-light/60"
          )} />
          {moto.nextInspection ? (
            <>
              <span
                className={clsx(
                  "text-xs font-bold leading-none",
                  moto.nextInspection.isOverdue
                    ? "text-red-600 dark:text-red-400"
                    : "text-foreground dark:text-white"
                )}
              >
                {moto.nextInspection.isOverdue ? "Überfällig" : moto.nextInspection.relativeLabel}
              </span>
              <span
                className={clsx(
                  "text-[10px] font-medium",
                  moto.nextInspection.isOverdue
                    ? "text-red-500/70 dark:text-red-400/70"
                    : "text-secondary dark:text-navy-400"
                )}
              >
                {inspectionDateShort}
              </span>
            </>
          ) : (
            <>
              <span className="text-sm font-bold leading-none text-secondary/30 dark:text-navy-600">—</span>
              <span className="text-[10px] font-medium text-secondary/50 dark:text-navy-500">MFK</span>
            </>
          )}
        </div>
      </div>

      {/* Meta row: status + location, off the image so contrast is reliable */}
      {showMetaRow && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-gray-100 px-3 py-2 dark:border-navy-700">
          {hasMaintenance && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
              <Wrench className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Wartung fällig
            </span>
          )}
          {hasIssues && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {moto.numberOfIssues} offene{moto.numberOfIssues === 1 ? "r Mangel" : " Mängel"}
            </span>
          )}
          {hasLocation && (
            <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-secondary dark:text-navy-400">
              <MapPin className="h-3 w-3 shrink-0 text-blue-500/70" aria-hidden="true" />
              {moto.currentLocationName}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
