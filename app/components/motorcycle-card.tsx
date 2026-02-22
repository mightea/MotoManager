import { Link } from "react-router";
import { useState } from "react";
import { Gauge, Route as RouteIcon, Wrench, CalendarDays } from "lucide-react";
import clsx from "clsx";
import type { MotorcycleDashboardItem as DashboardCard } from "~/utils/home-stats";
import { StatisticEntry } from "./statistic-entry";
import { createMotorcycleSlug } from "~/utils/motorcycle";

import { formatNumber } from "~/utils/numberUtils";

interface MotorcycleCardProps {
  moto: DashboardCard;
}

export function MotorcycleCard({ moto }: MotorcycleCardProps) {
  const [imageError, setImageError] = useState(false);

  const slug = createMotorcycleSlug(moto.make, moto.model);

  return (
    <Link
      to={`/motorcycle/${slug}/${moto.id}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-navy-700 dark:bg-navy-800"
    >
      {/* Header with Background Image */}
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        {/* Background Image */}
        <img
          src={
            !imageError && moto.image
              ? `${moto.image}?width=800`
              : "/favicon.svg"
          }
          srcSet={
            !imageError && moto.image
              ? `${moto.image}?width=400 400w, ${moto.image}?width=800 800w`
              : undefined
          }
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          alt={`${moto.make} ${moto.model}`}
          className={clsx(
            "h-full w-full object-cover transition-transform duration-300 group-hover:scale-105",
            (imageError || !moto.image) &&
            "p-8 object-scale-down opacity-50 grayscale dark:invert"
          )}
          loading="lazy"
          onError={() => setImageError(true)}
        />

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10"></div>

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-white shadow-sm group-hover:underline decoration-white/50 underline-offset-4">
                {moto.make} {moto.model}
              </h3>
              <p className="text-sm font-medium text-gray-200 shadow-sm">
                {moto.modelYear || "Jahrgang unbekannt"}
              </p>
            </div>
            <div className="flex gap-2">
              {moto.hasOverdueMaintenance && (
                <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/20 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                  Wartung fällig
                </span>
              )}
              {moto.isVeteran && (
                <span className="inline-flex items-center rounded-full border border-white/30 bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                  Veteran
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card Stats Grid */}
      <div className="flex-1 p-4">
        <div className="space-y-3">

          <StatisticEntry
            icon={Gauge}
            label="Aktuell"
            value={`${formatNumber(moto.odometer)} km`}
          />

          <StatisticEntry
            icon={RouteIcon}
            label="Dieses Jahr"
            value={`${formatNumber(moto.odometerThisYear)} km`}
            valueClassName={
              moto.odometerThisYear > 0
                ? "text-foreground dark:text-gray-100"
                : "text-secondary/70 dark:text-navy-500"
            }
            checkValue={moto.odometerThisYear}
          />

          <StatisticEntry
            icon={Wrench}
            label="Offene Mängel"
            value={
              moto.numberOfIssues > 0
                ? `${moto.numberOfIssues} Ausstehend`
                : "Alles gut"
            }
            valueClassName={
              moto.numberOfIssues > 0
                ? "text-orange-600 dark:text-orange-400"
                : "text-green-600 dark:text-green-400"
            }
            checkValue={moto.numberOfIssues}
          />

          {moto.nextInspection?.relativeLabel && (
            <StatisticEntry
              icon={CalendarDays}
              label="Nächste MFK"
              value={moto.nextInspection.relativeLabel}
              valueClassName={
                moto.nextInspection.isOverdue
                  ? "text-red-600 dark:text-red-400"
                  : "text-foreground dark:text-gray-100"
              }
              checkValue={moto.nextInspection.relativeLabel}
            />
          )}

        </div>
      </div>
    </Link>
  );
}
