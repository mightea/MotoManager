import { useMemo } from "react";
import { data, Link, useLoaderData } from "react-router";
import { ArrowLeft, Bike, CalendarDays, Flag, Fuel, Globe2, Route, Wallet } from "lucide-react";
import type { Route as RouteTypes } from "./+types/map.year";
import { requireUser } from "~/services/auth";
import { getMapData } from "~/services/map";
import { formatCurrency, formatNumber } from "~/utils/numberUtils";
import {
  buildHeatPoints,
  countryFlag,
  countryName,
  filterCalendar,
  filterLegs,
  filterLocations,
  filterTours,
  formatDateShort,
  locationFuelUnderFilter,
  motorcycleColorMap,
  round1,
  type MapFilter,
} from "~/utils/map-analysis";
import { FleetMap, type MapLayerVisibility } from "~/components/fleet-map";
import { TourCard } from "~/components/tour-card";
import { RidingCalendar } from "~/components/riding-calendar";
import { useTheme } from "~/components/theme-provider";
import type { MapLocation } from "~/types/map";

export function meta({ params }: RouteTypes.MetaArgs) {
  return [
    { title: `Jahresrückblick ${params.year} - Moto Manager` },
    { name: "description", content: `Kilometer, Länder, Touren und Fahrtage des Jahres ${params.year}.` },
  ];
}

export async function clientLoader({ request, params }: RouteTypes.ClientLoaderArgs) {
  const { token } = await requireUser(request);
  const year = Number(params.year);
  if (!Number.isInteger(year) || year < 1900 || year > 2200) {
    throw new Response("Ungültiges Jahr", { status: 404 });
  }
  const payload = await getMapData(token);
  const stats = payload.years.find((y) => y.year === year);
  if (!stats) {
    throw new Response(`Keine Daten für ${year}`, { status: 404 });
  }
  return data({ payload, year, stats });
}

const REVIEW_LAYERS: MapLayerVisibility = {
  workshops: false,
  inspections: false,
  storage: false,
  other: false,
  fuelHeat: true,
  legs: true,
};

export default function YearReviewPage() {
  const { payload, year, stats } = useLoaderData<typeof clientLoader>();
  const { theme } = useTheme();
  const mode = theme === "dark" ? "dark" : "light";
  const filter: MapFilter = useMemo(() => ({ motorcycleId: null, year }), [year]);

  const colors = useMemo(() => motorcycleColorMap(payload.motorcycles, mode), [payload.motorcycles, mode]);
  const locationsById = useMemo(() => new Map(payload.locations.map((l) => [l.id, l])), [payload.locations]);
  const legsById = useMemo(() => new Map(payload.legs.map((l) => [l.id, l])), [payload.legs]);
  const motorcyclesById = useMemo(() => new Map(payload.motorcycles.map((m) => [m.id, m])), [payload.motorcycles]);
  const locations = useMemo(() => filterLocations(payload.locations, filter), [payload.locations, filter]);
  const legs = useMemo(() => filterLegs(payload.legs, filter), [payload.legs, filter]);
  const tours = useMemo(
    () => filterTours(payload.tours, filter).sort((a, b) => (a.startDate < b.startDate ? -1 : 1)),
    [payload.tours, filter],
  );
  const heatPoints = useMemo(() => buildHeatPoints(payload.locations, filter, "stops"), [payload.locations, filter]);
  const fuelOf = useMemo(() => (loc: MapLocation) => locationFuelUnderFilter(loc, filter), [filter]);
  const homePoint = payload.home ? { latitude: payload.home.latitude, longitude: payload.home.longitude } : null;
  const farthest = stats.farthest ? locationsById.get(stats.farthest.locationId) : undefined;

  const ridingBikes = payload.motorcycles.filter((m) =>
    stats.perMotorcycle.some((p) => p.motorcycleId === m.id && (p.distanceKm > 0 || p.fuelStops > 0)),
  );

  const kmByCountry = Object.entries(stats.kmByCountry)
    .filter(([, km]) => km > 0)
    .sort((a, b) => b[1] - a[1]);
  const kmByCountryMax = kmByCountry.reduce((m, [, km]) => Math.max(m, km), 0);

  return (
    <div className="container mx-auto space-y-8 px-4 pt-3 pb-24 animate-fade-in md:p-6">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link
          to="/map"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 hover:text-primary dark:text-navy-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Karte
        </Link>
        <YearNav years={payload.years.map((y) => y.year)} current={year} />
      </div>

      {/* Headline */}
      <header className="relative overflow-hidden rounded-sm border border-base-300/70 bg-base-100 p-6 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800 sm:p-8">
        <span aria-hidden="true" className="motorsport-stripe absolute inset-x-0 top-0 h-[4px]" />
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/55 dark:text-navy-400">
          Jahresrückblick
        </p>
        <h1 className="font-display text-6xl leading-none text-base-content dark:text-white sm:text-8xl">{year}</h1>
        <p className="mt-3 max-w-prose text-sm text-base-content/70 dark:text-navy-300">
          {stats.distanceKm > 0
            ? `${formatNumber(stats.distanceKm)} Kilometer an ${stats.ridingDays} Fahrtagen${
                stats.countries.length > 0 ? ` durch ${stats.countries.length} ${stats.countries.length === 1 ? "Land" : "Länder"}` : ""
              }${stats.seasonStart && stats.seasonEnd ? `, vom ${formatDateShort(stats.seasonStart)} bis ${formatDateShort(stats.seasonEnd)}` : ""}.`
            : "In diesem Jahr wurden keine Etappen erfasst."}
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
          <Headline icon={Route} label="Distanz" value={formatNumber(stats.distanceKm)} unit="km" />
          <Headline icon={CalendarDays} label="Fahrtage" value={String(stats.ridingDays)} />
          <Headline icon={Bike} label="Touren" value={String(stats.tours)} unit={stats.dayTrips > 0 ? `+${stats.dayTrips} Tagesausflüge` : undefined} />
          <Headline icon={Fuel} label="Getankt" value={formatNumber(stats.liters)} unit="Liter" />
          <Headline icon={Wallet} label="Sprit" value={formatCurrency(stats.fuelCost)} />
          <Headline
            icon={Flag}
            label="Weitester Punkt"
            value={farthest ? `${formatNumber(round1(stats.farthest?.distanceKm ?? 0))} km` : "–"}
            unit={farthest?.name}
          />
        </dl>
      </header>

      {/* Map */}
      {locations.length > 0 && (
        <FleetMap
          locations={locations}
          legs={legs}
          heatPoints={heatPoints}
          home={payload.home}
          motorcycles={ridingBikes}
          motorcycleColors={colors}
          layers={REVIEW_LAYERS}
          fuelOf={fuelOf}
          fitKey={`year-${year}`}
          className="h-[380px] overflow-hidden rounded-sm border border-base-300/70 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 sm:h-[520px]"
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Calendar */}
        <section className="space-y-3">
          <SectionTitle icon={CalendarDays} title="Fahrkalender" />
          <div className="rounded-sm border border-base-300/70 bg-base-100 p-4 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800 sm:p-6">
            <RidingCalendar
              year={year}
              days={filterCalendar(payload.calendar, year)}
              seasonStart={stats.seasonStart}
              seasonEnd={stats.seasonEnd}
              hideCaption
            />
          </div>
        </section>

        {/* Countries */}
        <section className="space-y-3">
          <SectionTitle icon={Globe2} title="Kilometer nach Land" />
          <div className="rounded-sm border border-base-300/70 bg-base-100 p-4 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800 sm:p-6">
            {kmByCountry.length === 0 ? (
              <p className="text-sm text-base-content/60 dark:text-navy-400">
                Noch keine Länder bekannt. Auf der Karte lassen sich Länder aus den Koordinaten ermitteln.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {kmByCountry.map(([code, km]) => (
                  <li key={code} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 truncate text-xs text-base-content/70 dark:text-navy-300" title={countryName(code)}>
                      {countryFlag(code)} {countryName(code)}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-sm bg-base-200 dark:bg-navy-700/50">
                      <div
                        className="h-full rounded-sm bg-primary"
                        style={{ width: `${kmByCountryMax > 0 ? Math.max((km / kmByCountryMax) * 100, 2) : 0}%` }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-right font-numeric text-[11px] font-semibold tabular-nums text-base-content/70 dark:text-navy-300">
                      {formatNumber(km)} km
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {ridingBikes.length > 0 && (
            <div className="rounded-sm border border-base-300/70 bg-base-100 p-4 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800 sm:p-6">
              <ul className="space-y-2">
                {stats.perMotorcycle
                  .filter((p) => p.distanceKm > 0 || p.fuelStops > 0)
                  .sort((a, b) => b.distanceKm - a.distanceKm)
                  .map((p) => {
                    const m = motorcyclesById.get(p.motorcycleId);
                    return (
                      <li key={p.motorcycleId} className="flex items-center gap-3 text-sm">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors.get(p.motorcycleId) }} aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate text-base-content dark:text-white">
                          {m ? `${m.make} ${m.model}` : `Motorrad ${p.motorcycleId}`}
                        </span>
                        <span className="font-numeric text-xs tabular-nums text-base-content/70 dark:text-navy-300">
                          {formatNumber(p.distanceKm)} km · {formatNumber(p.liters, 1)} l
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* Tours */}
      <section className="space-y-3">
        <SectionTitle icon={Bike} title={`Touren ${year}`} />
        {tours.length === 0 ? (
          <p className="text-sm text-base-content/60 dark:text-navy-400">Keine mehrtägigen Touren in diesem Jahr.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {tours.map((tour) => (
              <TourCard
                key={tour.id}
                tour={tour}
                legs={tour.legIds.map((id) => legsById.get(id)).filter((l) => l !== undefined)}
                locationsById={locationsById}
                motorcycle={motorcyclesById.get(tour.motorcycleId)}
                color={colors.get(tour.motorcycleId) ?? "#2a78d6"}
                home={homePoint}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Headline({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: typeof Route;
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/55 dark:text-navy-400">
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 font-numeric text-2xl font-semibold leading-none tabular-nums text-base-content dark:text-white">
        {value}
      </dd>
      {unit && <dd className="mt-1 truncate text-xs text-base-content/60 dark:text-navy-400">{unit}</dd>}
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof Bike; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <h2 className="font-subdisplay text-sm text-base-content dark:text-white">{title}</h2>
    </div>
  );
}

function YearNav({ years, current }: { years: number[]; current: number }) {
  const sorted = years.slice().sort((a, b) => a - b);
  const idx = sorted.indexOf(current);
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const next = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;
  const cls = "font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-primary hover:underline";
  return (
    <nav aria-label="Jahr wechseln" className="flex items-center gap-4">
      {prev !== null && <Link to={`/map/${prev}`} className={cls}>← {prev}</Link>}
      {next !== null && <Link to={`/map/${next}`} className={cls}>{next} →</Link>}
    </nav>
  );
}
