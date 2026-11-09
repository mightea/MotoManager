import { data, useLoaderData, Link, useSearchParams } from "react-router";
import { PageHeader } from "~/components/page-header";
import type { Route } from "./+types/fleet-stats";
import { requireUser } from "~/services/auth";
import { formatNumber, formatCurrency } from "~/utils/numberUtils";
import { BarChart3, ChevronDown } from "lucide-react";
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
  periodRange,
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
  CostCategoryLegend,
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

const CAPTION = "font-mono text-[11px] font-semibold uppercase tracking-[0.08em]";

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
  const yearSelected = typeof period === "number";
  const segment = (p: StatsPeriod, label: string, title?: string) => {
    const active = isSamePeriod(period, p);
    return (
      <button
        key={typeof p === "object" ? `last-${p.lastYears}` : String(p)}
        type="button"
        aria-pressed={active}
        title={title}
        onClick={() => onChange(p)}
        className={clsx(
          "h-[38px] border-l border-base-300 px-3.5 font-mono text-xs font-semibold uppercase tracking-[0.08em] tabular-nums transition-colors first:border-l-0 dark:border-navy-700",
          active
            ? "bg-primary/10 font-bold text-primary shadow-[inset_0_-2px_0_var(--color-primary)] dark:bg-primary/20 dark:text-primary-light"
            : "bg-base-100 text-base-content/70 hover:bg-base-200 dark:bg-navy-800 dark:text-navy-300 dark:hover:bg-navy-700",
        )}
      >
        {label}
      </button>
    );
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <fieldset className="flex overflow-hidden rounded-sm border border-base-300 dark:border-navy-700">
        <legend className="sr-only">Zeitraum</legend>
        {segment("all", "Gesamt")}
        {ranges
          .slice()
          .reverse()
          .map((n) => segment({ lastYears: n }, `${n} J.`, `Letzte ${n} Jahre`))}
      </fieldset>
      <label
        className={clsx(
          "flex h-10 items-center gap-2 rounded-sm border px-2.5 font-mono text-xs font-semibold uppercase tracking-[0.08em]",
          yearSelected
            ? "border-primary bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light"
            : "border-base-300 bg-base-100 text-base-content/70 dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300",
        )}
      >
        Jahr
        <select
          value={yearSelected ? String(period) : ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "all")}
          className="border-none bg-transparent py-0 pl-0 pr-7 font-mono text-[13px] font-bold tabular-nums text-base-content focus:ring-0 dark:text-white"
        >
          <option value="">—</option>
          {years
            .slice()
            .reverse()
            .map((y) => (
              <option key={y.year} value={y.year}>
                {y.year}
              </option>
            ))}
        </select>
      </label>
    </div>
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
    <div className="overflow-x-auto">
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
  const soldCount = stats.motorcycles.filter((m) => m.ownedUntil !== null).length;
  const range =
    period === "all"
      ? { from: years[0].year, to: years[years.length - 1].year }
      : periodRange(period, stats.currentYear);
  const rangeLabel = range && range.from !== range.to ? `${range.from}–${range.to}` : String(range?.from ?? "");
  const headerLine = [
    `${stats.motorcycles.length} ${stats.motorcycles.length === 1 ? "Motorrad" : "Motorräder"}${soldCount > 0 ? ` (${soldCount} verkauft)` : ""}`,
    `Zeitraum: ${periodLabel}${period === "all" ? ` (${rangeLabel})` : ""}`,
  ].join(" · ");
  // Bikes that appear in any chart — the shared colour key.
  const legendBikes = [...stats.motorcycles]
    .filter((m) => m.distance > 0 || m.runningCost > 0 || m.ownedFrom !== null)
    .sort((a, b) => a.id - b.id);

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 pt-4 pb-24 animate-fade-in md:space-y-8 md:p-6">
      {/* Period filter — in the header, above everything it drives */}
      <PageHeader
        eyebrow="Flotte"
        title="Statistiken"
        description={headerLine}
        actions={<PeriodPicker years={years} period={period} onChange={setPeriod} />}
      />

      {/* KPI row */}
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          code="01"
          label="Distanz"
          value={`${formatNumber(summary.distance)} km`}
          sub={
            isRunningYear
              ? "bis heute"
              : isRange
                ? `Ø ${formatNumber(perYear(summary.distance))} km pro Jahr`
                : period === "all"
                  ? "alle Motorräder, seit Kauf"
                  : undefined
          }
          change={prev ? percentChange(summary.distance, prev.distance) : null}
          changeLabel={prev?.label}
          railClassName="bg-primary"
        />
        <KpiTile
          code="02"
          label="Kosten"
          value={formatCurrency(summary.totalCost)}
          sub={isRange ? `Ø ${formatCurrency(perYear(summary.totalCost))} pro Jahr` : "inkl. Treibstoff und Fixkosten"}
          change={prev ? percentChange(summary.totalCost, prev.totalCost) : null}
          upIsGood={false}
          changeLabel={prev?.label}
          railClassName="bg-secondary"
        />
        <KpiTile
          code="03"
          label="Kosten pro km"
          value={summary.costPerKm !== null ? formatCurrency(summary.costPerKm) : "–"}
          sub="Kosten ÷ Distanz"
          change={summary.costPerKm !== null && prevCostPerKm ? percentChange(summary.costPerKm, prevCostPerKm) : null}
          upIsGood={false}
          changeLabel={prev?.label}
          railClassName="bg-base-content/40"
        />
        <KpiTile
          code="04"
          label="Treibstoff"
          value={`${formatNumber(summary.liters)} l`}
          sub={summary.avgConsumption !== null ? `Ø ${formatNumber(summary.avgConsumption, 1)} l/100 km` : undefined}
          railClassName="bg-[var(--color-workshop)]"
        />
      </dl>

      {/* One colour key for every chart below */}
      {legendBikes.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-sm border border-base-300/70 bg-base-100 px-3.5 py-2.5 dark:border-navy-700 dark:bg-navy-800">
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-base-content/70 dark:text-navy-300">
            Farben je Motorrad — in allen Diagrammen gleich
          </span>
          <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
            {legendBikes.map((m) => (
              <li key={m.id} className="flex items-center gap-2 text-sm font-semibold text-base-content dark:text-white">
                <span aria-hidden="true" className="h-3 w-3 shrink-0" style={{ backgroundColor: colors.get(m.id) }} />
                {bikeName(m)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Fahrleistung pro Jahr"
          subtitle="Kilometer je Motorrad, gestapelt. Auf ein Jahr tippen, um es auszuwählen."
        >
          <DistanceByYearChart
            years={years}
            bikes={stats.motorcycles}
            colors={colors}
            mode={mode}
            highlight={highlight}
            onSelectYear={toggleYear}
            showLegend={false}
          />
        </ChartCard>

        <ChartCard
          title="Kosten pro Jahr"
          subtitle="Alle Ausgaben inkl. Treibstoff, Teile und Fixkosten."
          legend={<CostCategoryLegend years={years} mode={mode} />}
        >
          <CostByYearChart years={years} mode={mode} highlight={highlight} onSelectYear={toggleYear} showLegend={false} />
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
        >
          <SeasonChart
            rows={season.rows}
            referenceYears={season.referenceYears}
            mode={mode}
            selectedYear={typeof period === "number" ? period : null}
          />
        </ChartCard>

        <ChartCard title={`Kostenverteilung · ${periodLabel}`} subtitle="Wohin das Geld geflossen ist.">
          <CostBreakdownList costs={summary.costs} total={summary.totalCost} mode={mode} />
        </ChartCard>

        <ChartCard
          title={`Motorräder im Vergleich · ${periodLabel}`}
          subtitle="Balken = gefahrene Kilometer, rechts die Kosten pro Kilometer."
        >
          <BikeComparison bikes={summary.bikes} colors={colors} />
        </ChartCard>

        <ChartCard title={`Verbrauch · ${periodLabel}`} subtitle={`${consumption.granularity === "year" ? "Jahresmittel" : "Monatsmittel"} in l/100 km, Ausreisser entfernt.`}>
          <ConsumptionChart
            rows={consumption.rows}
            bikeIds={consumption.bikeIds}
            granularity={consumption.granularity}
            bikes={stats.motorcycles}
            colors={colors}
            mode={mode}
            showLegend={false}
          />
        </ChartCard>

        <ChartCard title={`Treibstoffpreis · ${periodLabel}`} subtitle="Durchschnittlich bezahlter Preis pro Liter.">
          <FuelPriceChart months={fuelPrices} mode={mode} />
        </ChartCard>

        <ChartCard title="Fuhrpark-Zeitachse" subtitle="Wann welches Motorrad in der Garage stand.">
          <OwnershipTimeline rows={timeline} colors={colors} mode={mode} />
        </ChartCard>
      </div>

      <ChartCard
        title="Gesamtkosten (Total Cost of Ownership)"
        subtitle="Kaufpreis minus Verkaufserlös plus alle Betriebskosten. Bei Motorrädern im Besitz ohne Restwert — also das bisher investierte Geld."
      >
        <OwnershipCostChart bikes={lifetimeBikes} mode={mode} />
        <OwnershipCostTable bikes={lifetimeBikes} colors={colors} />
      </ChartCard>

      <ChartCard title="Jahresübersicht" bodyClassName="p-0">
        <YearTable
          years={years}
          bikes={stats.motorcycles}
          colors={colors}
          highlight={(y) => period !== "all" && highlight(y)}
          onSelectYear={setPeriod}
        />
        <p className="border-t border-base-200 px-4 py-3 text-[13px] text-base-content/70 dark:border-navy-700 dark:text-navy-400">
          Distanzen werden zwischen zwei Kilometerständen gleichmässig auf die Tage verteilt. Einträge von Vorbesitzern zählen nicht.
        </p>
      </ChartCard>
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/components/route-error-boundary";
