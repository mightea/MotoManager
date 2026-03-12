import { Link } from "react-router";
import { useState } from "react";
import { Gauge, Route as RouteIcon, CalendarDays, MapPin, Wrench } from "lucide-react";
import clsx from "clsx";
import type { MotorcycleDashboardItem as DashboardCard } from "~/utils/home-stats";
import { createMotorcycleSlug } from "~/utils/motorcycle";
import { formatNumber } from "~/utils/numberUtils";

interface MotorcycleCardProps {
  moto: DashboardCard;
}

export function MotorcycleCard({ moto }: MotorcycleCardProps) {
  const [imageError, setImageError] = useState(false);
  const slug = createMotorcycleSlug(moto.make, moto.model);
  const currentYear = new Date().getFullYear();

  const inspectionDateShort = moto.nextInspection?.dueDateISO
    ? new Intl.DateTimeFormat("de-CH", { month: "short", year: "numeric" }).format(
        new Date(moto.nextInspection.dueDateISO)
      )
    : null;

  return (
    <Link
      to={`/motorcycle/${slug}/${moto.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/20 hover:shadow-xl active:scale-[0.99] active:shadow-sm dark:border-navy-700 dark:bg-navy-800 dark:hover:border-primary/30"
    >
      {/* Image banner */}
      <div className="relative h-36 w-full overflow-hidden">
        {/* Location badge */}
        {moto.currentLocationName && (
          <div className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1 rounded-full border border-white/20 bg-black/40 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
            <MapPin className="h-3 w-3 text-blue-300" />
            <span className="uppercase tracking-wide">{moto.currentLocationName}</span>
          </div>
        )}

        {/* Status badges */}
        <div className="absolute right-2.5 top-2.5 z-10 flex flex-col items-end gap-1">
          {moto.hasOverdueMaintenance && (
            <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white ring-1 ring-white/20">
              Wartung fällig
            </span>
          )}
          {moto.isVeteran && (
            <span className="rounded-full border border-white/30 bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
              Veteran
            </span>
          )}
        </div>

        <img
          src={!imageError && moto.image ? `${moto.image}?width=800` : "/favicon.svg"}
          srcSet={
            !imageError && moto.image
              ? `${moto.image}?width=400 400w, ${moto.image}?width=800 800w`
              : undefined
          }
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          alt={`${moto.make} ${moto.model}`}
          className={clsx(
            "h-full w-full object-cover transition-[transform,brightness] duration-700 ease-out group-hover:scale-[1.06] group-hover:brightness-105",
            (imageError || !moto.image) && "p-8 object-scale-down opacity-40 grayscale dark:invert"
          )}
          loading="lazy"
          onError={() => setImageError(true)}
        />

        {/* Gradient — deepens slightly on hover for name legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 group-hover:opacity-90" />

        {/* Name overlay — floats up on hover */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 transition-transform duration-300 ease-out group-hover:-translate-y-0.5">
          <h3 className="text-base font-bold leading-tight text-white underline-offset-2 group-hover:underline decoration-white/40">
            {moto.make} {moto.model}
          </h3>
          <p className="text-[11px] font-medium text-white/70 transition-opacity duration-300 group-hover:text-white/90">
            {moto.fabricationDate ?? "—"}
          </p>
        </div>
      </div>

      {/* 3-column stats */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-navy-700">
        {/* Odometer */}
        <div className="flex flex-col items-center gap-0.5 px-2 py-3 text-center">
          <Gauge className="mb-0.5 h-3.5 w-3.5 text-secondary/40 transition-colors duration-300 group-hover:text-primary/50 dark:text-navy-500 dark:group-hover:text-primary-light/60" />
          <span className="text-sm font-bold tabular-nums leading-none text-foreground dark:text-white">
            {formatNumber(moto.odometer)}
          </span>
          <span className="text-[10px] font-medium text-secondary dark:text-navy-400">km gesamt</span>
        </div>

        {/* This year */}
        <div className="flex flex-col items-center gap-0.5 px-2 py-3 text-center">
          <RouteIcon className="mb-0.5 h-3.5 w-3.5 text-secondary/40 transition-colors duration-300 group-hover:text-primary/50 dark:text-navy-500 dark:group-hover:text-primary-light/60" />
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
            "mb-0.5 h-3.5 w-3.5 transition-colors duration-300",
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

      {/* Open issues strip */}
      {moto.numberOfIssues > 0 && (
        <div className="flex items-center gap-1.5 border-t border-gray-100 px-3 py-2 dark:border-navy-700">
          <Wrench className="h-3.5 w-3.5 shrink-0 text-orange-500" />
          <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
            {moto.numberOfIssues} offene{moto.numberOfIssues === 1 ? "r Mangel" : " Mängel"}
          </span>
        </div>
      )}
    </Link>
  );
}
