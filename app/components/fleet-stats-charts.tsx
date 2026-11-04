import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CostBreakdown, FleetMotorcycle, FleetYear, FuelPriceMonth } from "~/types/fleet-stats";
import {
  bikeName,
  COST_CATEGORIES,
  COST_CATEGORY_LABELS,
  MONTH_LABELS,
  type BikePeriodStats,
  type SeasonRow,
  type StatsPeriod,
  type TimelineRow,
} from "~/utils/fleet-stats";
import { SERIES_COLORS } from "~/utils/map-analysis";
import { formatCurrency, formatNumber } from "~/utils/numberUtils";

export type ChartMode = "light" | "dark";

/** Chart chrome per theme. Marks use `SERIES_COLORS`; text uses Tailwind ink. */
const CHROME = {
  light: { grid: "#e2e8f0", axis: "#64748b", surface: "#ffffff", cursor: "rgba(15,23,42,0.05)" },
  dark: { grid: "#262134", axis: "#9b96ad", surface: "#1b1627", cursor: "rgba(255,255,255,0.05)" },
} as const;

/** Two ordered steps of one blue ramp: capital (darker) and running cost. */
const TCO_COLORS = {
  light: { capital: "#1c5cab", running: "#86b6ef" },
  dark: { capital: "#5598e7", running: "#184f95" },
} as const;

export function costCategoryColor(index: number, mode: ChartMode): string {
  return SERIES_COLORS[index][mode];
}

/** Axis ticks: full numbers below 10'000, compact above. */
function formatAxis(value: number): string {
  if (Math.abs(value) >= 10000) return `${formatNumber(value / 1000)}K`;
  return formatNumber(value);
}

const CARD =
  "relative rounded-sm border border-base-300/70 bg-base-100 p-4 sm:p-5 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800";

const CAPTION = "font-mono text-[10px] font-semibold uppercase tracking-[0.14em]";

export function ChartCard({
  title,
  subtitle,
  icon: Icon,
  children,
  legend,
  className,
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  children: ReactNode;
  legend?: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx(CARD, "space-y-4", className)}>
      <header className="space-y-1">
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <h2 className="font-subdisplay text-sm text-base-content dark:text-white">{title}</h2>
        </div>
        {subtitle && <p className="text-xs text-base-content/60 dark:text-navy-300">{subtitle}</p>}
      </header>
      {legend}
      {children}
    </section>
  );
}

export function Legend({ items }: { items: { key: string | number; label: string; color: string; line?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-1.5 text-xs text-base-content/70 dark:text-navy-300">
          {item.line ? (
            <span className="h-0.5 w-3.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
          ) : (
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: item.color }} aria-hidden="true" />
          )}
          {item.label}
        </li>
      ))}
    </ul>
  );
}

interface TooltipEntry {
  name?: string | number;
  value?: number | string | Array<number | string>;
  color?: string;
  dataKey?: string | number | ((obj: unknown) => unknown);
  payload?: Record<string, unknown>;
}

/** Tooltip shell — workshop-tag look, rows with a colour key and text ink. */
function TooltipBox({ title, rows, footer }: { title: string; rows: { label: string; value: string; color?: string }[]; footer?: string }) {
  return (
    <div className="min-w-40 rounded-sm border border-base-300/70 bg-base-100 px-3 py-2 shadow-[0_8px_18px_-10px_rgba(15,23,42,0.5)] dark:border-navy-700 dark:bg-navy-900">
      <div className={clsx(CAPTION, "mb-1.5 text-base-content/60 dark:text-navy-300")}>{title}</div>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-base-content/75 dark:text-navy-200">
              {r.color && <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: r.color }} aria-hidden="true" />}
              {r.label}
            </span>
            <span className="font-numeric font-semibold tabular-nums text-base-content dark:text-white">{r.value}</span>
          </li>
        ))}
      </ul>
      {footer && (
        <div className="mt-1.5 flex justify-between gap-4 border-t border-base-200 pt-1.5 text-xs dark:border-navy-700">
          <span className="text-base-content/60 dark:text-navy-300">Total</span>
          <span className="font-numeric font-semibold tabular-nums text-base-content dark:text-white">{footer}</span>
        </div>
      )}
    </div>
  );
}

function axisProps(mode: ChartMode) {
  return {
    tick: { fill: CHROME[mode].axis, fontSize: 11 },
    tickLine: false,
    axisLine: { stroke: CHROME[mode].grid },
  } as const;
}

// MARK: - KPI tiles

export function KpiTile({
  label,
  value,
  sub,
  change,
  upIsGood = true,
  changeLabel,
}: {
  label: string;
  value: string;
  sub?: string;
  change?: number | null;
  upIsGood?: boolean;
  changeLabel?: string;
}) {
  const hasChange = change !== null && change !== undefined && Number.isFinite(change);
  const up = hasChange && change > 0;
  const good = hasChange && (up === upIsGood || Math.abs(change) < 0.5);
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <div className={clsx(CARD, "flex flex-col gap-1.5")}>
      <span className={clsx(CAPTION, "text-base-content/60 dark:text-navy-300")}>{label}</span>
      <span className="font-numeric text-2xl font-semibold leading-none tabular-nums text-base-content sm:text-[28px] dark:text-white">
        {value}
      </span>
      {sub && <span className="text-xs text-base-content/60 dark:text-navy-300">{sub}</span>}
      {hasChange && (
        <span className="flex items-center gap-1 text-xs">
          <span
            className={clsx(
              "inline-flex items-center gap-0.5 font-numeric font-semibold tabular-nums",
              good ? "text-success" : "text-error",
            )}
          >
            <Arrow className="h-3.5 w-3.5" aria-hidden="true" />
            {change > 0 ? "+" : ""}
            {formatNumber(change)}%
          </span>
          <span className="text-base-content/55 dark:text-navy-400">{changeLabel}</span>
        </span>
      )}
    </div>
  );
}

// MARK: - Distance per year, stacked by bike

export function DistanceByYearChart({
  years,
  bikes,
  colors,
  mode,
  period,
  onSelectYear,
}: {
  years: FleetYear[];
  bikes: FleetMotorcycle[];
  colors: Map<number, string>;
  mode: ChartMode;
  period: StatsPeriod;
  onSelectYear: (year: number) => void;
}) {
  const shownBikes = bikes.filter((b) => years.some((y) => y.bikes.some((yb) => yb.motorcycleId === b.id && yb.distance > 0)));
  const rows = years.map((y) => {
    const row: Record<string, number> = { year: y.year };
    for (const b of y.bikes) row[String(b.motorcycleId)] = b.distance;
    return row;
  });
  const last = shownBikes[shownBikes.length - 1];

  return (
    <>
      <Legend items={shownBikes.map((b) => ({ key: b.id, label: bikeName(b), color: colors.get(b.id) ?? "#999" }))} />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
            <CartesianGrid vertical={false} stroke={CHROME[mode].grid} />
            <XAxis dataKey="year" {...axisProps(mode)} interval="preserveStartEnd" minTickGap={12} />
            <YAxis {...axisProps(mode)} axisLine={false} tickFormatter={formatAxis} width={48} />
            <Tooltip
              cursor={{ fill: CHROME[mode].cursor }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const entries = (payload as readonly TooltipEntry[]).filter((p) => Number(p.value) > 0);
                const total = entries.reduce((s, p) => s + Number(p.value), 0);
                return (
                  <TooltipBox
                    title={String(label)}
                    rows={entries
                      .slice()
                      .reverse()
                      .map((p) => {
                        const bike = shownBikes.find((b) => String(b.id) === String(p.dataKey));
                        return { label: bike ? bikeName(bike) : String(p.name), value: `${formatNumber(Number(p.value))} km`, color: p.color };
                      })}
                    footer={entries.length > 1 ? `${formatNumber(total)} km` : undefined}
                  />
                );
              }}
            />
            {shownBikes.map((b) => (
              <Bar
                key={b.id}
                dataKey={String(b.id)}
                name={bikeName(b)}
                stackId="km"
                fill={colors.get(b.id)}
                stroke={CHROME[mode].surface}
                strokeWidth={1}
                maxBarSize={24}
                radius={b === last ? [4, 4, 0, 0] : 0}
                cursor="pointer"
                onClick={(entry: { payload?: { year?: number } }) => {
                  if (entry.payload?.year) onSelectYear(entry.payload.year);
                }}
              >
                {rows.map((r) => (
                  <Cell key={r.year} fillOpacity={period === "all" || period === r.year ? 1 : 0.3} />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

// MARK: - Riding season (km per month)

export function SeasonChart({
  rows,
  referenceYears,
  mode,
  period,
}: {
  rows: SeasonRow[];
  referenceYears: number[];
  mode: ChartMode;
  period: StatsPeriod;
}) {
  const barColor = SERIES_COLORS[0][mode];
  const lineColor = mode === "light" ? "#52514e" : "#c3c2b7";
  const refLabel =
    referenceYears.length === 0
      ? null
      : referenceYears.length === 1
        ? `${referenceYears[0]}`
        : `Ø ${referenceYears[0]}–${referenceYears[referenceYears.length - 1]}`;
  const showBars = period !== "all";

  const legend = [
    ...(showBars ? [{ key: "y", label: String(period), color: barColor }] : []),
    ...(refLabel ? [{ key: "avg", label: refLabel, color: showBars ? lineColor : barColor, line: showBars }] : []),
  ];

  return (
    <>
      {legend.length > 1 && <Legend items={legend} />}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
            <CartesianGrid vertical={false} stroke={CHROME[mode].grid} />
            <XAxis dataKey="month" {...axisProps(mode)} interval={0} minTickGap={0} tickMargin={4} />
            <YAxis {...axisProps(mode)} axisLine={false} tickFormatter={formatAxis} width={48} />
            <Tooltip
              cursor={{ fill: CHROME[mode].cursor }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const row = (payload[0] as TooltipEntry).payload as unknown as SeasonRow;
                const items = [];
                if (showBars && row.value !== null) items.push({ label: String(period), value: `${formatNumber(row.value)} km`, color: barColor });
                if (refLabel && row.average !== null) items.push({ label: refLabel, value: `${formatNumber(row.average)} km`, color: showBars ? lineColor : barColor });
                return <TooltipBox title={String(label)} rows={items} />;
              }}
            />
            {showBars ? (
              <>
                <Bar dataKey="value" fill={barColor} maxBarSize={24} radius={[4, 4, 0, 0]} />
                {refLabel && (
                  <Line
                    dataKey="average"
                    stroke={lineColor}
                    strokeWidth={2}
                    strokeLinecap="round"
                    dot={false}
                    activeDot={{ r: 4, stroke: CHROME[mode].surface, strokeWidth: 2 }}
                    type="monotone"
                  />
                )}
              </>
            ) : (
              <Bar dataKey="average" fill={barColor} maxBarSize={24} radius={[4, 4, 0, 0]} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

// MARK: - Costs per year, stacked by category

export function CostByYearChart({
  years,
  mode,
  period,
  onSelectYear,
}: {
  years: FleetYear[];
  mode: ChartMode;
  period: StatsPeriod;
  onSelectYear: (year: number) => void;
}) {
  const used = COST_CATEGORIES.filter((k) => years.some((y) => y.costs[k] > 0));
  const rows = years.map((y) => ({ year: y.year, ...y.costs }));
  const last = used[used.length - 1];

  return (
    <>
      <Legend
        items={used.map((k) => ({
          key: k,
          label: COST_CATEGORY_LABELS[k],
          color: costCategoryColor(COST_CATEGORIES.indexOf(k), mode),
        }))}
      />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
            <CartesianGrid vertical={false} stroke={CHROME[mode].grid} />
            <XAxis dataKey="year" {...axisProps(mode)} interval="preserveStartEnd" minTickGap={12} />
            <YAxis {...axisProps(mode)} axisLine={false} tickFormatter={formatAxis} width={48} />
            <Tooltip
              cursor={{ fill: CHROME[mode].cursor }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const entries = (payload as readonly TooltipEntry[]).filter((p) => Number(p.value) > 0);
                const total = entries.reduce((s, p) => s + Number(p.value), 0);
                return (
                  <TooltipBox
                    title={String(label)}
                    rows={entries
                      .slice()
                      .reverse()
                      .map((p) => ({ label: String(p.name), value: formatCurrency(Number(p.value)), color: p.color }))}
                    footer={entries.length > 1 ? formatCurrency(total) : undefined}
                  />
                );
              }}
            />
            {used.map((k) => (
              <Bar
                key={k}
                dataKey={k}
                name={COST_CATEGORY_LABELS[k]}
                stackId="cost"
                fill={costCategoryColor(COST_CATEGORIES.indexOf(k), mode)}
                stroke={CHROME[mode].surface}
                strokeWidth={1}
                maxBarSize={24}
                radius={k === last ? [4, 4, 0, 0] : 0}
                cursor="pointer"
                onClick={(entry: { payload?: { year?: number } }) => {
                  if (entry.payload?.year) onSelectYear(entry.payload.year);
                }}
              >
                {rows.map((r) => (
                  <Cell key={r.year} fillOpacity={period === "all" || period === r.year ? 1 : 0.3} />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

// MARK: - Cost breakdown for the period (segmented bar + list)

export function CostBreakdownList({ costs, total, mode }: { costs: CostBreakdown; total: number; mode: ChartMode }) {
  const items = COST_CATEGORIES.map((k, i) => ({ key: k, value: costs[k], color: costCategoryColor(i, mode) })).filter(
    (i) => i.value > 0,
  );
  if (total <= 0) {
    return <p className="text-sm text-base-content/60 dark:text-navy-300">Keine Kosten in diesem Zeitraum.</p>;
  }
  return (
    <div className="space-y-4">
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-[4px]" aria-hidden="true">
        {items.map((i) => (
          <div key={i.key} style={{ width: `${(i.value / total) * 100}%`, backgroundColor: i.color }} title={COST_CATEGORY_LABELS[i.key]} />
        ))}
      </div>
      <ul className="divide-y divide-base-200 dark:divide-navy-700">
        {items
          .slice()
          .sort((a, b) => b.value - a.value)
          .map((i) => (
            <li key={i.key} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="flex items-center gap-2 text-base-content/80 dark:text-navy-200">
                <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: i.color }} aria-hidden="true" />
                {COST_CATEGORY_LABELS[i.key]}
              </span>
              <span className="flex items-baseline gap-3">
                <span className="font-numeric text-xs tabular-nums text-base-content/55 dark:text-navy-400">
                  {formatNumber((i.value / total) * 100)}%
                </span>
                <span className="w-28 text-right font-numeric font-semibold tabular-nums text-base-content dark:text-white">
                  {formatCurrency(i.value)}
                </span>
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}

// MARK: - Per-bike comparison for the period

export function BikeComparison({ bikes, colors }: { bikes: BikePeriodStats[]; colors: Map<number, string> }) {
  const sorted = bikes.slice().sort((a, b) => b.distance - a.distance);
  const maxKm = Math.max(1, ...sorted.map((b) => b.distance));
  if (sorted.length === 0) {
    return <p className="text-sm text-base-content/60 dark:text-navy-300">Keine Daten in diesem Zeitraum.</p>;
  }
  return (
    <ul className="space-y-3.5">
      {sorted.map((b) => (
        <li key={b.bike.id} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate font-subdisplay text-sm text-base-content dark:text-white">{bikeName(b.bike)}</span>
            <span className="shrink-0 font-numeric text-xs font-semibold tabular-nums text-base-content/70 dark:text-navy-300">
              {b.costPerKm !== null ? `${formatCurrency(b.costPerKm)} / km` : "–"}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-[4px] bg-base-200 dark:bg-navy-700/60">
            <div
              className="h-full rounded-[4px]"
              style={{ width: `${Math.max((b.distance / maxKm) * 100, b.distance > 0 ? 1.5 : 0)}%`, backgroundColor: colors.get(b.bike.id) }}
            />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 font-numeric text-xs tabular-nums text-base-content/60 dark:text-navy-400">
            <span>{formatNumber(b.distance)} km</span>
            <span>{formatCurrency(b.totalCost)}</span>
            {b.avgConsumption !== null && <span>{formatNumber(b.avgConsumption, 1)} l/100 km</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

// MARK: - Total cost of ownership

export function OwnershipCostChart({ bikes, mode }: { bikes: FleetMotorcycle[]; mode: ChartMode }) {
  const rows = bikes
    .filter((b) => b.netCost !== null)
    .map((b) => {
      const capital = (b.purchasePrice ?? 0) - (b.salePrice ?? 0);
      return {
        id: b.id,
        name: bikeName(b),
        // A sale above the purchase price is a gain; the bar shows only cost.
        capital: Math.max(capital, 0),
        running: b.runningCost,
        net: b.netCost ?? 0,
        sold: b.ownedUntil !== null,
      };
    })
    .sort((a, b) => b.net - a.net);
  const c = TCO_COLORS[mode];
  if (rows.length === 0) {
    return <p className="text-sm text-base-content/60 dark:text-navy-300">Für keine Maschine ist ein Kaufpreis erfasst.</p>;
  }
  return (
    <>
      <Legend
        items={[
          { key: "capital", label: "Kaufpreis − Verkaufserlös", color: c.capital },
          { key: "running", label: "Betriebskosten", color: c.running },
        ]}
      />
      <div style={{ height: Math.max(120, rows.length * 40 + 30) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barCategoryGap={10}>
            <CartesianGrid horizontal={false} stroke={CHROME[mode].grid} />
            <XAxis type="number" {...axisProps(mode)} tickFormatter={formatAxis} />
            <YAxis type="category" dataKey="name" {...axisProps(mode)} axisLine={false} width={120} tick={{ fill: CHROME[mode].axis, fontSize: 11 }} />
            <Tooltip
              cursor={{ fill: CHROME[mode].cursor }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = (payload[0] as TooltipEntry).payload as unknown as (typeof rows)[number];
                return (
                  <TooltipBox
                    title={row.name}
                    rows={[
                      { label: row.sold ? "Wertverlust" : "Kaufpreis", value: formatCurrency(row.capital), color: c.capital },
                      { label: "Betriebskosten", value: formatCurrency(row.running), color: c.running },
                    ]}
                    footer={formatCurrency(row.net)}
                  />
                );
              }}
            />
            <Bar dataKey="capital" stackId="tco" fill={c.capital} stroke={CHROME[mode].surface} strokeWidth={1} maxBarSize={24} />
            <Bar dataKey="running" stackId="tco" fill={c.running} stroke={CHROME[mode].surface} strokeWidth={1} maxBarSize={24} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

export function OwnershipCostTable({ bikes, colors }: { bikes: FleetMotorcycle[]; colors: Map<number, string> }) {
  const rows = bikes
    .filter((b) => b.ownedFrom !== null || b.runningCost > 0)
    .slice()
    .sort((a, b) => (b.netCost ?? -Infinity) - (a.netCost ?? -Infinity));
  const th = clsx(CAPTION, "px-3 py-2.5 text-base-content/55 dark:text-navy-300");
  const td = "px-3 py-2.5 text-right font-numeric tabular-nums";
  const money = (v: number | null) => (v === null ? "–" : formatCurrency(v));
  return (
    <div className="-mx-4 overflow-x-auto sm:-mx-5">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b border-base-200 dark:border-navy-700">
          <tr>
            <th className={clsx(th, "pl-4 text-left sm:pl-5")}>Motorrad</th>
            <th className={clsx(th, "text-right")}>Besitz</th>
            <th className={clsx(th, "text-right")}>Distanz</th>
            <th className={clsx(th, "text-right")}>Kauf</th>
            <th className={clsx(th, "text-right")}>Verkauf</th>
            <th className={clsx(th, "text-right")}>Betrieb</th>
            <th className={clsx(th, "text-right")}>Netto</th>
            <th className={clsx(th, "text-right")}>pro km</th>
            <th className={clsx(th, "pr-4 text-right sm:pr-5")}>pro Jahr</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-base-200 dark:divide-navy-700">
          {rows.map((b) => (
            <tr key={b.id}>
              <td className="py-2.5 pl-4 pr-3 sm:pl-5">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: colors.get(b.id) }} aria-hidden="true" />
                  <span className="truncate text-base-content dark:text-white">{bikeName(b)}</span>
                  {b.ownedUntil && (
                    <span className={clsx(CAPTION, "rounded-sm bg-base-200 px-1.5 py-0.5 text-base-content/60 dark:bg-navy-700 dark:text-navy-300")}>
                      verkauft
                    </span>
                  )}
                </span>
              </td>
              <td className={clsx(td, "text-base-content/70 dark:text-navy-300")}>
                {b.yearsOwned > 0 ? `${formatNumber(b.yearsOwned, 1)} J.` : "–"}
              </td>
              <td className={clsx(td, "text-base-content/70 dark:text-navy-300")}>{formatNumber(b.distance)} km</td>
              <td className={clsx(td, "text-base-content/70 dark:text-navy-300")}>{money(b.purchasePrice)}</td>
              <td className={clsx(td, "text-base-content/70 dark:text-navy-300")}>{money(b.salePrice)}</td>
              <td className={clsx(td, "text-base-content/70 dark:text-navy-300")}>{money(b.runningCost)}</td>
              <td className={clsx(td, "font-semibold text-base-content dark:text-white")}>{money(b.netCost)}</td>
              <td className={clsx(td, "text-base-content/70 dark:text-navy-300")}>{money(b.netCostPerKm)}</td>
              <td className={clsx(td, "pr-4 text-base-content/70 sm:pr-5 dark:text-navy-300")}>{money(b.netCostPerYear)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// MARK: - Fuel

export function ConsumptionChart({
  rows,
  bikeIds,
  granularity,
  bikes,
  colors,
  mode,
}: {
  rows: Array<Record<string, number | string>>;
  bikeIds: number[];
  granularity: "month" | "year";
  bikes: FleetMotorcycle[];
  colors: Map<number, string>;
  mode: ChartMode;
}) {
  const byId = new Map(bikes.map((b) => [b.id, b]));
  if (rows.length === 0) {
    return <p className="text-sm text-base-content/60 dark:text-navy-300">Keine Verbrauchswerte in diesem Zeitraum.</p>;
  }
  const fmtTick = (t: number) => (granularity === "year" ? String(t) : MONTH_LABELS[t - 1] ?? "");
  const fmtTitle = (key: string) => (granularity === "year" ? key : `${MONTH_LABELS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`);
  const sparse = rows.length <= 24;
  return (
    <>
      <Legend
        items={bikeIds.map((id) => ({ key: id, label: byId.get(id) ? bikeName(byId.get(id)!) : `#${id}`, color: colors.get(id) ?? "#999", line: true }))}
      />
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid vertical={false} stroke={CHROME[mode].grid} />
            <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} {...axisProps(mode)} tickFormatter={fmtTick} allowDecimals={false} minTickGap={16} />
            <YAxis {...axisProps(mode)} axisLine={false} width={40} domain={["auto", "auto"]} tickFormatter={(v: number) => formatNumber(v, 1)} />
            <Tooltip
              cursor={{ stroke: CHROME[mode].axis, strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = (payload[0] as TooltipEntry).payload as Record<string, number | string>;
                return (
                  <TooltipBox
                    title={fmtTitle(String(row.key))}
                    rows={(payload as readonly TooltipEntry[]).map((p) => ({
                      label: byId.get(Number(p.dataKey)) ? bikeName(byId.get(Number(p.dataKey))!) : String(p.name),
                      value: `${formatNumber(Number(p.value), 1)} l/100 km`,
                      color: p.color,
                    }))}
                  />
                );
              }}
            />
            {bikeIds.map((id) => (
              <Line
                key={id}
                dataKey={String(id)}
                stroke={colors.get(id)}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={sparse ? { r: 3, fill: colors.get(id), stroke: CHROME[mode].surface, strokeWidth: 1.5 } : false}
                activeDot={{ r: 4, stroke: CHROME[mode].surface, strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

export function FuelPriceChart({ months, mode }: { months: FuelPriceMonth[]; mode: ChartMode }) {
  if (months.length === 0) {
    return <p className="text-sm text-base-content/60 dark:text-navy-300">Keine Tankbelege mit Preis in diesem Zeitraum.</p>;
  }
  const color = SERIES_COLORS[1][mode];
  const rows = months.map((m) => ({ ...m, label: `${m.month.slice(5)}.${m.month.slice(2, 4)}` }));
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid vertical={false} stroke={CHROME[mode].grid} />
          <XAxis dataKey="label" {...axisProps(mode)} minTickGap={24} />
          <YAxis {...axisProps(mode)} axisLine={false} width={48} domain={["auto", "auto"]} tickFormatter={(v: number) => formatNumber(v, 2)} />
          <Tooltip
            cursor={{ stroke: CHROME[mode].axis, strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = (payload[0] as TooltipEntry).payload as unknown as FuelPriceMonth & { label: string };
              return (
                <TooltipBox
                  title={row.label}
                  rows={[
                    { label: "Preis", value: `${formatCurrency(row.avgPricePerLiter)} / l`, color },
                    { label: "Getankt", value: `${formatNumber(row.liters, 1)} l` },
                  ]}
                />
              );
            }}
          />
          <Area
            dataKey="avgPricePerLiter"
            stroke={color}
            strokeWidth={2}
            fill={color}
            fillOpacity={0.1}
            type="linear"
            dot={false}
            activeDot={{ r: 4, stroke: CHROME[mode].surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// MARK: - Ownership timeline

export function OwnershipTimeline({ rows, colors, mode }: { rows: TimelineRow[]; colors: Map<number, string>; mode: ChartMode }) {
  if (rows.length === 0) {
    return <p className="text-sm text-base-content/60 dark:text-navy-300">Keine Kaufdaten erfasst.</p>;
  }
  const min = Math.floor(Math.min(...rows.map((r) => r.range[0])));
  const max = Math.ceil(Math.max(...rows.map((r) => r.range[1])));
  const fmtDate = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;
  return (
    <div style={{ height: Math.max(120, rows.length * 34 + 30) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barCategoryGap={8}>
          <CartesianGrid horizontal={false} stroke={CHROME[mode].grid} />
          <XAxis type="number" domain={[min, max]} {...axisProps(mode)} tickFormatter={(v: number) => String(Math.round(v))} allowDecimals={false} tickCount={Math.min(12, max - min + 1)} />
          <YAxis type="category" dataKey="name" {...axisProps(mode)} axisLine={false} width={120} />
          <Tooltip
            cursor={{ fill: CHROME[mode].cursor }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = (payload[0] as TooltipEntry).payload as unknown as TimelineRow;
              const years = row.range[1] - row.range[0];
              return (
                <TooltipBox
                  title={row.name}
                  rows={[
                    { label: "Gekauft", value: fmtDate(row.from), color: colors.get(row.id) },
                    { label: row.until ? "Verkauft" : "Im Besitz", value: row.until ? fmtDate(row.until) : "heute" },
                    { label: "Dauer", value: `${formatNumber(years, 1)} Jahre` },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="range" maxBarSize={16} radius={4} isAnimationActive={false}>
            {rows.map((r) => (
              <Cell key={r.id} fill={colors.get(r.id)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
