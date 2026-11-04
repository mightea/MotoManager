import { data, useLoaderData, Link, useSearchParams } from "react-router";
import type { Route } from "./+types/fleet-stats";
import { requireUser } from "~/services/auth";
import { formatNumber, formatCurrency } from "~/utils/numberUtils";
import {
  BarChart3,
  CalendarRange,
  ChevronDown,
  Fuel,
  Gauge,
  PieChart,
  Route as RouteIcon,
  Sun,
  Table2,
  Wallet,
  Bike,
  Landmark,
} from "lucide-react";
import clsx from "clsx";
import { useMemo, useState, Fragment } from "react";
import { fetchFromBackend } from "~/utils/backend";
import { EmptyState } from "~/components/empty-state";
import { useTheme } from "~/components/theme-provider";
import { SERIES_COLORS } from "~/utils/map-analysis";
import type { FleetStatsPayload, FleetYear } from "~/types/fleet-stats";
import {
  activeYears,
  bikeName,
  consumptionRows,
  elapsedYears,
  fuelPricesInPeriod,
  isSamePeriod,
  isYearInPeriod,
  parsePeriod,
  percentChange,
  periodLabel as formatPeriodLabel,
  recentYearOptions,
  seasonRows,
  summarizePeriod,
  timelineRows,
  type StatsPeriod,
} from "~/utils/fleet-stats";
import {
  BikeComparison,
  ChartCard,
  ConsumptionChart,
  CostBreakdownList,
  CostByYearChart,
  DistanceByYearChart,
  FuelPriceChart,
  KpiTile,
  OwnershipCostChart,
  OwnershipCostTable,
  OwnershipTimeline,
  SeasonChart,
} from "~/components/fleet-stats-charts";

export function meta() {
  return [
    { title: "Statistiken - Moto Manager" },
    { name: "description", content: "Fahrleistung, Kosten, Verbrauch und Gesamtkosten deiner Motorrad-Flotte." },
  ];
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const { token } = await requireUser(request);
  const stats = await fetchFromBackend<FleetStatsPayload>("/stats/fleet", {}, token);
  return data({ stats });
}

const CAPTION = "font-mono text-[10px] font-semibold uppercase tracking-[0.14em]";

function PeriodPicker({
  years,
  period,
  onChange,
}: {
  years: FleetYear[];
  period: StatsPeriod;
  onChange: (p: StatsPeriod) => void;
}) {
  const ranges = recentYearOptions(years);
  const recent = years.slice(-3).reverse();
  const older = years.slice(0, -3).reverse();
  const olderSelected = typeof period === "number" && older.some((y) => y.year === period);
  const pill = (active: boolean) =>
    clsx(
      "rounded-sm px-3 py-1.5 font-numeric text-xs font-semibold tabular-nums transition-colors",
      active
        ? "bg-primary text-primary-content"
        : "text-base-content/70 hover:bg-base-200 dark:text-navy-300 dark:hover:bg-navy-700",
    );
  const option = (p: StatsPeriod, label: string, title?: string) => {
    const active = isSamePeriod(period, p);
    return (
      <button
        key={typeof p === "object" ? `last-${p.lastYears}` : String(p)}
        type="button"
        aria-pressed={active}
        title={title}
        className={pill(active)}
        onClick={() => onChange(p)}
      >
        {label}
      </button>
    );
  };
  return (
    <fieldset className="flex flex-wrap items-center gap-1.5">
      <legend className="sr-only">Zeitraum</legend>
      {option("all", "Gesamt")}
      {ranges
        .slice()
        .reverse()
        .map((n) => option({ lastYears: n }, `${n} J.`, `Letzte ${n} Jahre`))}
      <span aria-hidden="true" className="mx-1 h-4 w-px bg-base-300 dark:bg-navy-700" />
      {recent.map((y) => option(y.year, String(y.year)))}
      {older.length > 0 && (
        <select
          aria-label="Älteres Jahr"
          className={clsx(
            "rounded-sm border-0 bg-transparent py-1.5 pl-2 pr-7 font-numeric text-xs font-semibold tabular-nums focus:ring-2 focus:ring-primary",
            olderSelected ? "bg-primary text-primary-content" : "text-base-content/70 dark:text-navy-300",
          )}
          value={olderSelected ? String(period) : ""}
          onChange={(e) => e.target.value && onChange(Number(e.target.value))}
        >
          <option value="">Früher …</option>
          {older.map((y) => (
            <option key={y.year} value={y.year}>
              {y.year}
            </option>
          ))}
        </select>
      )}
    </fieldset>
  );
}

function YearTable({
  years,
  bikes,
  colors,
  highlight,
  onSelectYear,
}: {
  years: FleetYear[];
  bikes: FleetStatsPayload["motorcycles"];
  colors: Map<number, string>;
  highlight: (year: number) => boolean;
  onSelectYear: (y: number) => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const byId = new Map(bikes.map((b) => [b.id, b]));
  const th = clsx(CAPTION, "px-4 py-3 text-base-content/55 dark:text-navy-300");
  return (
    <div className="-mx-4 overflow-x-auto sm:-mx-5">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-base-200 dark:border-navy-700">
          <tr>
            <th className={clsx(th, "text-left")}>Jahr</th>
            <th className={clsx(th, "hidden text-right sm:table-cell")}>Motorräder</th>
            <th className={clsx(th, "text-right")}>Distanz</th>
            <th className={clsx(th, "text-right")}>Kosten</th>
            <th className={clsx(th, "hidden text-right sm:table-cell")}>Kosten/km</th>
            <th className={clsx(th, "hidden text-right md:table-cell")}>Liter</th>
            <th className="w-10 px-2 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-base-200 dark:divide-navy-700">
          {years
            .slice()
            .reverse()
            .map((y) => {
              const isExpanded = expanded === y.year;
              return (
                <Fragment key={y.year}>
                  <tr
                    className={clsx(
                      "cursor-pointer transition-colors hover:bg-base-200/50 dark:hover:bg-navy-700/40",
                      (isExpanded || highlight(y.year)) && "bg-base-200/40 dark:bg-navy-700/30",
                    )}
                    onClick={() => setExpanded(isExpanded ? null : y.year)}
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="font-numeric font-semibold tabular-nums text-primary hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectYear(y.year);
                        }}
                      >
                        {y.year}
                      </button>
                    </td>
                    <td className="hidden px-4 py-3 text-right font-numeric tabular-nums text-base-content/70 sm:table-cell dark:text-navy-300">
                      {y.motorcycleCount}
                    </td>
                    <td className="px-4 py-3 text-right font-numeric font-semibold tabular-nums text-base-content dark:text-white">
                      {formatNumber(y.distance)} km
                    </td>
                    <td className="px-4 py-3 text-right font-numeric font-semibold tabular-nums text-base-content dark:text-white">
                      {formatCurrency(y.totalCost)}
                    </td>
                    <td className="hidden px-4 py-3 text-right font-numeric tabular-nums text-base-content/65 sm:table-cell dark:text-navy-400">
                      {y.distance > 0 ? formatCurrency(y.totalCost / y.distance) : "–"}
                    </td>
                    <td className="hidden px-4 py-3 text-right font-numeric tabular-nums text-base-content/65 md:table-cell dark:text-navy-400">
                      {y.liters > 0 ? `${formatNumber(y.liters)} l` : "–"}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <ChevronDown
                        className={clsx("h-4 w-4 text-base-content/45 transition-transform", isExpanded && "rotate-180")}
                        aria-hidden="true"
                      />
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} className="bg-base-200/40 p-4 dark:bg-navy-900/30">
                        {y.bikes.length === 0 ? (
                          <p className="text-sm text-base-content/60 dark:text-navy-300">Keine Einträge.</p>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {y.bikes.map((b) => {
                              const bike = byId.get(b.motorcycleId);
                              return (
                                <div
                                  key={b.motorcycleId}
                                  className="rounded-sm border border-base-300/70 bg-base-100 p-3 dark:border-navy-700 dark:bg-navy-800"
                                >
                                  <div className="mb-2 flex items-center gap-2">
                                    <span
                                      className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                                      style={{ backgroundColor: colors.get(b.motorcycleId) }}
                                      aria-hidden="true"
                                    />
                                    <span className="truncate font-subdisplay text-sm text-base-content dark:text-white">
                                      {bike ? bikeName(bike) : `#${b.motorcycleId}`}
                                    </span>
                                  </div>
                                  <dl className="grid grid-cols-3 gap-2">
                                    {[
                                      ["Distanz", `${formatNumber(b.distance)} km`],
                                      ["Kosten", formatCurrency(b.totalCost)],
                                      ["Verbrauch", b.avgConsumption !== null ? `${formatNumber(b.avgConsumption, 1)} l` : "–"],
                                    ].map(([label, value]) => (
                                      <div key={label}>
                                        <dt className={clsx(CAPTION, "text-base-content/55 dark:text-navy-500")}>{label}</dt>
                                        <dd className="font-numeric text-sm font-semibold tabular-nums text-base-content dark:text-gray-100">
                                          {value}
                                        </dd>
                                      </div>
                                    ))}
                                  </dl>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

export default function FleetStatsPage() {
  const { stats } = useLoaderData<typeof clientLoader>();
  const { theme } = useTheme();
  const mode = theme === "dark" ? "dark" : "light";
  const [searchParams, setSearchParams] = useSearchParams();

  const years = useMemo(() => activeYears(stats.years), [stats.years]);
  const period = parsePeriod(searchParams.get("jahr"), years, searchParams.get("jahre"));
  const setPeriod = (p: StatsPeriod) => {
    const next = new URLSearchParams(searchParams);
    next.delete("jahr");
    next.delete("jahre");
    if (typeof p === "number") next.set("jahr", String(p));
    else if (typeof p === "object") next.set("jahre", String(p.lastYears));
    setSearchParams(next, { replace: true, preventScrollReset: true });
  };
  const toggleYear = (y: number) => setPeriod(period === y ? "all" : y);
  const highlight = (year: number) => isYearInPeriod(year, period, stats.currentYear);

  // Same colour per bike as on the map page: ascending id, never re-assigned.
  const colors = useMemo(() => {
    const map = new Map<number, string>();
    [...stats.motorcycles]
      .sort((a, b) => a.id - b.id)
      .forEach((m, i) => map.set(m.id, SERIES_COLORS[Math.min(i, SERIES_COLORS.length - 1)][mode]));
    return map;
  }, [stats.motorcycles, mode]);

  const summary = useMemo(() => summarizePeriod(stats, period), [stats, period]);
  const season = useMemo(() => seasonRows(stats, period), [stats, period]);
  const consumption = useMemo(() => consumptionRows(stats, period), [stats, period]);
  const timeline = useMemo(() => timelineRows(stats), [stats]);
  const fuelPrices = useMemo(() => fuelPricesInPeriod(stats, period), [stats, period]);

  if (years.length === 0) {
    return (
      <div className="container mx-auto px-4 pt-3 pb-24">
        <EmptyState
          icon={BarChart3}
          title="Noch keine Statistiken"
          description="Sobald Wartungs- oder Tank-Einträge vorhanden sind, erscheinen hier deine Flotten-Statistiken."
          action={
            <Link
              to="/"
              className="relative inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 font-subdisplay text-sm text-primary-content shadow-[0_12px_30px_-12px_rgba(30,91,255,0.7)] transition-all hover:shadow-[0_18px_42px_-14px_rgba(30,91,255,0.85)] hover:brightness-105 active:scale-[0.98]"
            >
              Zur Übersicht
              <span aria-hidden="true" className="motorsport-stripe absolute inset-x-4 -bottom-px h-[3px]" />
            </Link>
          }
        />
      </div>
    );
  }

  const prev = summary.previous;
  const prevCostPerKm = prev && prev.distance > 0 ? prev.totalCost / prev.distance : null;
  const periodLabel = formatPeriodLabel(period, stats.currentYear);
  const isRunningYear = period === stats.currentYear;
  const isRange = typeof period === "object";
  // Per-year averages for a range, with the running year counted pro rata.
  const rangeYears = isRange ? elapsedYears(period, stats) : 0;
  const perYear = (v: number) => (rangeYears > 0 ? v / rangeYears : 0);
  const lifetimeBikes = stats.motorcycles.filter((m) => m.ownedFrom !== null || m.runningCost > 0);

  return (
    <div className="container mx-auto space-y-6 px-4 pt-3 pb-24 animate-fade-in md:space-y-8 md:p-6">
      {/* Period filter — one row above everything it drives */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-subdisplay text-lg text-base-content dark:text-white">
          Statistiken <span className="text-base-content/50 dark:text-navy-400">· {periodLabel}</span>
        </h1>
        <PeriodPicker years={years} period={period} onChange={setPeriod} />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiTile
          label="Distanz"
          value={`${formatNumber(summary.distance)} km`}
          sub={isRunningYear ? "bis heute" : isRange ? `Ø ${formatNumber(perYear(summary.distance))} km pro Jahr` : undefined}
          change={prev ? percentChange(summary.distance, prev.distance) : null}
          changeLabel={prev?.label}
        />
        <KpiTile
          label="Kosten"
          value={formatCurrency(summary.totalCost)}
          sub={isRange ? `Ø ${formatCurrency(perYear(summary.totalCost))} pro Jahr` : undefined}
          change={prev ? percentChange(summary.totalCost, prev.totalCost) : null}
          upIsGood={false}
          changeLabel={prev?.label}
        />
        <KpiTile
          label="Kosten pro km"
          value={summary.costPerKm !== null ? formatCurrency(summary.costPerKm) : "–"}
          change={summary.costPerKm !== null && prevCostPerKm ? percentChange(summary.costPerKm, prevCostPerKm) : null}
          upIsGood={false}
          changeLabel={prev?.label}
        />
        <KpiTile
          label="Treibstoff"
          value={`${formatNumber(summary.liters)} l`}
          sub={summary.avgConsumption !== null ? `Ø ${formatNumber(summary.avgConsumption, 1)} l/100 km` : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Fahrleistung pro Jahr"
          subtitle="Kilometer je Motorrad. Auf ein Jahr tippen, um es auszuwählen."
          icon={RouteIcon}
        >
          <DistanceByYearChart
            years={years}
            bikes={stats.motorcycles}
            colors={colors}
            mode={mode}
            highlight={highlight}
            onSelectYear={toggleYear}
          />
        </ChartCard>

        <ChartCard
          title="Kosten pro Jahr"
          subtitle="Alle Ausgaben inkl. Treibstoff, Teile und Fixkosten."
          icon={Wallet}
        >
          <CostByYearChart years={years} mode={mode} highlight={highlight} onSelectYear={toggleYear} />
        </ChartCard>

        <ChartCard
          title="Fahrsaison"
          subtitle={
            period === "all"
              ? "Durchschnittliche Kilometer pro Monat über alle abgeschlossenen Jahre."
              : isRange
                ? "Durchschnittliche Kilometer pro Monat über die abgeschlossenen Jahre im Zeitraum."
                : "Kilometer pro Monat im Vergleich zu den Vorjahren (geschätzt aus Kilometerständen)."
          }
          icon={Sun}
        >
          <SeasonChart
            rows={season.rows}
            referenceYears={season.referenceYears}
            mode={mode}
            selectedYear={typeof period === "number" ? period : null}
          />
        </ChartCard>

        <ChartCard title={`Kostenverteilung · ${periodLabel}`} subtitle="Wohin das Geld geflossen ist." icon={PieChart}>
          <CostBreakdownList costs={summary.costs} total={summary.totalCost} mode={mode} />
        </ChartCard>

        <ChartCard
          title={`Motorräder im Vergleich · ${periodLabel}`}
          subtitle="Balken = gefahrene Kilometer, rechts die Kosten pro Kilometer."
          icon={Gauge}
        >
          <BikeComparison bikes={summary.bikes} colors={colors} />
        </ChartCard>

        <ChartCard title={`Verbrauch · ${periodLabel}`} subtitle={`${consumption.granularity === "year" ? "Jahresmittel" : "Monatsmittel"} in l/100 km, Ausreisser entfernt.`} icon={Fuel}>
          <ConsumptionChart
            rows={consumption.rows}
            bikeIds={consumption.bikeIds}
            granularity={consumption.granularity}
            bikes={stats.motorcycles}
            colors={colors}
            mode={mode}
          />
        </ChartCard>

        <ChartCard title={`Treibstoffpreis · ${periodLabel}`} subtitle="Durchschnittlich bezahlter Preis pro Liter." icon={Fuel}>
          <FuelPriceChart months={fuelPrices} mode={mode} />
        </ChartCard>

        <ChartCard title="Fuhrpark-Zeitachse" subtitle="Wann welches Motorrad in der Garage stand." icon={CalendarRange}>
          <OwnershipTimeline rows={timeline} colors={colors} mode={mode} />
        </ChartCard>
      </div>

      <ChartCard
        title="Gesamtkosten (Total Cost of Ownership)"
        subtitle="Kaufpreis minus Verkaufserlös plus alle Betriebskosten. Bei Motorrädern im Besitz ohne Restwert — also das bisher investierte Geld."
        icon={Landmark}
      >
        <OwnershipCostChart bikes={lifetimeBikes} mode={mode} />
        <OwnershipCostTable bikes={lifetimeBikes} colors={colors} />
      </ChartCard>

      <ChartCard title="Jahresübersicht" icon={Table2}>
        <YearTable
          years={years}
          bikes={stats.motorcycles}
          colors={colors}
          highlight={(y) => period !== "all" && highlight(y)}
          onSelectYear={setPeriod}
        />
      </ChartCard>

      <p className="flex items-center gap-2 text-xs text-base-content/50 dark:text-navy-400">
        <Bike className="h-3.5 w-3.5" aria-hidden="true" />
        Distanzen werden zwischen zwei Kilometerständen gleichmässig auf die Tage verteilt. Einträge von Vorbesitzern zählen nicht.
      </p>
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/components/route-error-boundary";
