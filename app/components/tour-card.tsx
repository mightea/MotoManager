import { useId } from "react";
import { CalendarRange, Flag, Fuel, MapPinned, Route } from "lucide-react";
import { formatCurrency, formatNumber } from "~/utils/numberUtils";
import {
  countryFlag,
  countryName,
  drawableLegs,
  formatDate,
  round1,
  sketchProjection,
} from "~/utils/map-analysis";
import type { LatLon, MapLeg, MapLocation, MapMotorcycle, MapTour } from "~/types/map";

interface TourCardProps {
  tour: MapTour;
  legs: MapLeg[];
  locationsById: Map<number, MapLocation>;
  motorcycle: MapMotorcycle | undefined;
  color: string;
  home: LatLon | null;
}

const SKETCH_W = 220;
const SKETCH_H = 130;

/**
 * One tour as a logbook card: a static SVG sketch of the route (straight legs
 * between fuel stops, no tiles — cheap enough for dozens of cards) next to
 * the headline numbers.
 */
export function TourCard({ tour, legs, locationsById, motorcycle, color, home }: TourCardProps) {
  const titleId = useId();
  const drawable = drawableLegs(legs);
  const points: LatLon[] = [];
  for (const leg of drawable) {
    points.push(leg.from, leg.to);
  }
  const stops: MapLocation[] = Array.from(new Set(tour.locationIds))
    .map((id) => locationsById.get(id))
    .filter((l): l is MapLocation => l !== undefined);
  const stopPoints: LatLon[] = stops.map((l) => ({ latitude: l.latitude, longitude: l.longitude }));
  points.push(...stopPoints);
  if (home) points.push(home);
  const projection = sketchProjection(points, SKETCH_W, SKETCH_H, 12);
  const farthest = tour.farthestLocationId === null ? undefined : locationsById.get(tour.farthestLocationId);

  return (
    <article
      aria-labelledby={titleId}
      className="group relative flex flex-col overflow-hidden rounded-sm border border-base-300/70 bg-base-100 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800 sm:flex-row"
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
      <div className="paper flex shrink-0 items-center justify-center border-b border-base-200 dark:border-navy-700 sm:w-[220px] sm:border-b-0 sm:border-r">
        <svg
          viewBox={`0 0 ${SKETCH_W} ${SKETCH_H}`}
          width="100%"
          height={SKETCH_H}
          className="max-w-[260px]"
        >
          <title>{`Routenskizze ${formatDate(tour.startDate)} bis ${formatDate(tour.endDate)}`}</title>
          {home && (
            <HomeMark {...projection.project(home)} />
          )}
          {drawable.map((leg) => {
            const a = projection.project(leg.from);
            const b = projection.project(leg.to);
            return (
              <line
                key={leg.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                opacity={0.85}
              />
            );
          })}
          {stops.map((stop) => {
            const { x, y } = projection.project(stop);
            return (
              <circle
                key={stop.id}
                cx={x}
                cy={y}
                r={3.5}
                fill={color}
                stroke="#fff"
                strokeWidth={1.5}
              />
            );
          })}
          {drawable.length === 0 && stopPoints.length === 0 && (
            <text
              x={SKETCH_W / 2}
              y={SKETCH_H / 2}
              textAnchor="middle"
              fontSize="10"
              fill="currentColor"
              opacity={0.5}
            >
              Keine Koordinaten
            </text>
          )}
        </svg>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 pl-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 id={titleId} className="font-subdisplay text-sm text-base-content dark:text-white">
            {formatDate(tour.startDate)} – {formatDate(tour.endDate)}
          </h3>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/55 dark:text-navy-400">
            {motorcycle ? `${motorcycle.make} ${motorcycle.model}` : "Motorrad"}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          <Stat icon={Route} label="Distanz" value={`${formatNumber(tour.distanceKm)} km`} />
          <Stat icon={CalendarRange} label="Tage" value={`${tour.days}`} />
          <Stat icon={Fuel} label="Getankt" value={`${formatNumber(tour.liters, 1)} l`} />
          <Stat icon={MapPinned} label="Stopps" value={`${tour.stops}`} />
        </dl>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-base-content/70 dark:text-navy-300">
          {tour.cost > 0 && <span className="font-numeric tabular-nums">{formatCurrency(tour.cost)} Sprit</span>}
          {farthest && (
            <span className="inline-flex items-center gap-1">
              <Flag className="h-3 w-3 opacity-70" aria-hidden="true" />
              {farthest.name}
              <span className="font-numeric tabular-nums">
                ({formatNumber(round1(tour.maxDistanceFromHomeKm), 1)} km von Zuhause)
              </span>
            </span>
          )}
          {tour.countries.length > 0 && (
            <span className="inline-flex flex-wrap items-center gap-1.5" aria-label={`Länder: ${tour.countries.map(countryName).join(", ")}`}>
              {tour.countries.map((c) => (
                <span
                  key={c}
                  title={countryName(c)}
                  className="rounded-sm border border-base-300 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.1em] dark:border-navy-600"
                >
                  {countryFlag(c)} {c}
                </span>
              ))}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function HomeMark({ x, y }: { x: number; y: number }) {
  return (
    <rect
      x={x - 4}
      y={y - 4}
      width={8}
      height={8}
      fill="#1E5BFF"
      stroke="#fff"
      strokeWidth={1.5}
      transform={`rotate(45 ${x} ${y})`}
    />
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Route;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/55 dark:text-navy-400">
        <Icon className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
        {label}
      </dt>
      <dd className="font-numeric text-sm font-semibold tabular-nums text-base-content dark:text-gray-100">
        {value}
      </dd>
    </div>
  );
}
