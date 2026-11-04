import type {
  CostBreakdown,
  CostCategory,
  FleetMotorcycle,
  FleetStatsPayload,
  FleetYear,
} from "~/types/fleet-stats";

/**
 * `"all"`, a calendar year, or the last N years — the running year plus the
 * N − 1 before it (e.g. 2024–2026 for 3).
 */
export type StatsPeriod = "all" | number | { lastYears: number };

/** Range lengths offered in the picker (only when there is more data). */
export const RECENT_YEAR_OPTIONS = [3, 5, 10] as const;

/** Inclusive year span of a period; null for "all". */
export function periodRange(period: StatsPeriod, currentYear: number): { from: number; to: number } | null {
  if (period === "all") return null;
  if (typeof period === "number") return { from: period, to: period };
  return { from: currentYear - period.lastYears + 1, to: currentYear };
}

export function isYearInPeriod(year: number, period: StatsPeriod, currentYear: number): boolean {
  const range = periodRange(period, currentYear);
  return range === null || (year >= range.from && year <= range.to);
}

export function isSamePeriod(a: StatsPeriod, b: StatsPeriod): boolean {
  if (typeof a === "object" && typeof b === "object") return a.lastYears === b.lastYears;
  return a === b;
}

export function periodLabel(period: StatsPeriod, currentYear: number): string {
  if (period === "all") return "Gesamt";
  if (typeof period === "number") return String(period);
  const range = periodRange(period, currentYear)!;
  return `${range.from}–${range.to}`;
}

/** True when a date string (`YYYY-…`) falls inside the period. */
function dateInPeriod(date: string, period: StatsPeriod, currentYear: number): boolean {
  return isYearInPeriod(Number(date.slice(0, 4)), period, currentYear);
}

/**
 * Years a period actually covers so far: the running year counts only with
 * the elapsed share, so per-year averages aren't dragged down by it.
 */
export function elapsedYears(period: StatsPeriod, payload: Pick<FleetStatsPayload, "today" | "currentYear">): number {
  const range = periodRange(period, payload.currentYear);
  if (range === null) return 0;
  const today = new Date(`${payload.today}T00:00:00Z`);
  const start = Date.UTC(payload.currentYear, 0, 1);
  const end = Date.UTC(payload.currentYear + 1, 0, 1);
  const runningShare = (today.getTime() - start) / (end - start);
  return range.to >= payload.currentYear ? range.to - range.from + runningShare : range.to - range.from + 1;
}

/** Stacking order of the cost categories — also their colour slot order. */
export const COST_CATEGORIES: CostCategory[] = ["fuel", "service", "repair", "tires", "parts", "fixed"];

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  fuel: "Treibstoff",
  service: "Wartung",
  repair: "Reparaturen",
  tires: "Reifen",
  parts: "Teile",
  fixed: "Fixkosten",
};

export const MONTH_LABELS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

export function emptyCosts(): CostBreakdown {
  return { fuel: 0, service: 0, repair: 0, tires: 0, parts: 0, fixed: 0 };
}

export function sumCosts(c: CostBreakdown): number {
  return COST_CATEGORIES.reduce((sum, k) => sum + c[k], 0);
}

/**
 * Parse the `?jahr=` / `?jahre=` search params; anything unknown falls back
 * to "all". A range is only valid when it is one of the offered lengths.
 */
export function parsePeriod(year: string | null, years: FleetYear[], lastYears: string | null = null): StatsPeriod {
  const n = Number(lastYears);
  if (lastYears && recentYearOptions(years).includes(n)) return { lastYears: n };
  const y = Number(year);
  if (year && Number.isInteger(y) && years.some((x) => x.year === y)) return y;
  return "all";
}

/** The range options worth offering: only lengths shorter than the data. */
export function recentYearOptions(years: FleetYear[]): number[] {
  return RECENT_YEAR_OPTIONS.filter((n) => years.length > n);
}

/** Years worth showing in charts: from the first with any distance or cost. */
export function activeYears(years: FleetYear[]): FleetYear[] {
  const first = years.findIndex((y) => y.distance > 0 || y.totalCost > 0);
  return first < 0 ? [] : years.slice(first);
}

/** One bike's numbers inside a period (lifetime for "all"). */
export interface BikePeriodStats {
  bike: FleetMotorcycle;
  distance: number;
  liters: number;
  costs: CostBreakdown;
  totalCost: number;
  costPerKm: number | null;
  avgConsumption: number | null;
}

export interface PeriodSummary {
  distance: number;
  totalCost: number;
  costs: CostBreakdown;
  costPerKm: number | null;
  liters: number;
  avgConsumption: number | null;
  motorcycleCount: number;
  bikes: BikePeriodStats[];
  /** Comparison base, when there is a meaningful one. */
  previous: { label: string; distance: number; totalCost: number } | null;
}

function mean(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;
}

export function summarizePeriod(payload: FleetStatsPayload, period: StatsPeriod): PeriodSummary {
  const bikesById = new Map(payload.motorcycles.map((m) => [m.id, m]));

  if (period === "all") {
    const costs = emptyCosts();
    let liters = 0;
    for (const y of payload.years) {
      for (const k of COST_CATEGORIES) costs[k] += y.costs[k];
      liters += y.liters;
    }
    const totalCost = sumCosts(costs);
    const distance = payload.totals.distance;
    const bikes = payload.motorcycles
      .filter((m) => m.distance > 0 || m.runningCost > 0)
      .map((m) => ({
        bike: m,
        distance: m.distance,
        liters: m.liters,
        costs: m.costs,
        totalCost: m.runningCost,
        costPerKm: m.runningCostPerKm,
        avgConsumption: m.avgConsumption,
      }));
    return {
      distance,
      totalCost,
      costs,
      costPerKm: distance > 0 ? totalCost / distance : null,
      liters,
      avgConsumption: mean(payload.consumption.map((c) => c.value)),
      motorcycleCount: payload.motorcycles.filter((m) => m.status !== "sold").length,
      bikes,
      previous: null,
    };
  }

  const range = periodRange(period, payload.currentYear)!;
  const inRange = payload.years.filter((y) => y.year >= range.from && y.year <= range.to);
  const costs = emptyCosts();
  let distance = 0;
  let liters = 0;
  const perBike = new Map<number, { distance: number; liters: number; costs: CostBreakdown }>();
  for (const y of inRange) {
    distance += y.distance;
    liters += y.liters;
    for (const k of COST_CATEGORIES) costs[k] += y.costs[k];
    for (const b of y.bikes) {
      const acc = perBike.get(b.motorcycleId) ?? { distance: 0, liters: 0, costs: emptyCosts() };
      acc.distance += b.distance;
      acc.liters += b.liters;
      for (const k of COST_CATEGORIES) acc.costs[k] += b.costs[k];
      perBike.set(b.motorcycleId, acc);
    }
  }
  const totalCost = sumCosts(costs);
  const consumptionInRange = payload.consumption.filter((c) => dateInPeriod(c.date, period, payload.currentYear));

  const bikes: BikePeriodStats[] = [...perBike.entries()].flatMap(([id, acc]) => {
    const bike = bikesById.get(id);
    const bikeTotal = sumCosts(acc.costs);
    if (!bike || (acc.distance <= 0 && bikeTotal <= 0)) return [];
    return [
      {
        bike,
        distance: acc.distance,
        liters: acc.liters,
        costs: acc.costs,
        totalCost: bikeTotal,
        costPerKm: acc.distance > 0 ? bikeTotal / acc.distance : null,
        avgConsumption: mean(consumptionInRange.filter((c) => c.motorcycleId === id).map((c) => c.value)),
      },
    ];
  });

  // A year-over-year comparison only makes sense for a single year; a range
  // that ends in the running year has no fair counterpart.
  let previous: PeriodSummary["previous"] = null;
  if (typeof period === "number") {
    if (period === payload.currentYear) {
      previous = {
        label: "Vorjahr bis heute",
        distance: payload.previousYearToDate.distance,
        totalCost: payload.previousYearToDate.cost,
      };
    } else {
      const prev = payload.years.find((y) => y.year === period - 1);
      if (prev && (prev.distance > 0 || prev.totalCost > 0)) {
        previous = { label: `vs. ${prev.year}`, distance: prev.distance, totalCost: prev.totalCost };
      }
    }
  }

  return {
    distance,
    totalCost,
    costs,
    costPerKm: distance > 0 ? totalCost / distance : null,
    liters,
    avgConsumption: mean(consumptionInRange.map((c) => c.value)),
    motorcycleCount: inRange[inRange.length - 1]?.motorcycleCount ?? 0,
    bikes,
    previous,
  };
}

/** Relative change in percent; null when there is no base to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export interface SeasonRow {
  month: string;
  /** km in the selected year (only for a single year). */
  value: number | null;
  /** Average km of the reference years. */
  average: number | null;
}

/**
 * km per month. For a single year: that year against the average of earlier
 * completed years. For "all" or a range: only the average over the completed
 * years with riding in it — the running year would skew the average.
 */
export function seasonRows(payload: FleetStatsPayload, period: StatsPeriod): { rows: SeasonRow[]; referenceYears: number[] } {
  const selected = typeof period === "number" ? payload.years.find((y) => y.year === period) ?? null : null;
  const range = periodRange(period, payload.currentYear);
  const referenceYears = payload.years.filter(
    (y) =>
      y.distance > 0 &&
      y.year !== payload.currentYear &&
      (selected !== null ? y.year < selected.year : range === null || (y.year >= range.from && y.year <= range.to)),
  );
  const rows = MONTH_LABELS.map((month, i) => {
    const avg =
      referenceYears.length > 0
        ? referenceYears.reduce((sum, y) => sum + (y.months[i] ?? 0), 0) / referenceYears.length
        : null;
    return {
      month,
      value: selected ? selected.months[i] ?? 0 : null,
      average: avg === null ? null : Math.round(avg),
    };
  });
  return { rows, referenceYears: referenceYears.map((y) => y.year) };
}

/** Decimal year (2024.5 = early July) — the timeline's x scale. */
export function decimalYear(date: string): number {
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const end = Date.UTC(d.getUTCFullYear() + 1, 0, 1);
  return d.getUTCFullYear() + (d.getTime() - start) / (end - start);
}

export interface TimelineRow {
  id: number;
  name: string;
  range: [number, number];
  from: string;
  until: string | null;
}

/** Ownership spans, oldest purchase first. Bikes without any date are skipped. */
export function timelineRows(payload: FleetStatsPayload): TimelineRow[] {
  const today = decimalYear(payload.today);
  return payload.motorcycles
    .filter((m): m is FleetMotorcycle & { ownedFrom: string } => m.ownedFrom !== null)
    .map((m) => ({
      id: m.id,
      name: `${m.make} ${m.model}`,
      range: [decimalYear(m.ownedFrom), m.ownedUntil ? decimalYear(m.ownedUntil) : today] as [number, number],
      from: m.ownedFrom,
      until: m.ownedUntil,
    }))
    .sort((a, b) => a.range[0] - b.range[0]);
}

/**
 * Mean consumption per bike as rows for a line chart: `{ key, t, [bikeId]: value }`.
 * Per-fill values are too noisy to read, so short periods (up to 3 years) are
 * bucketed by month and longer ones by year. Buckets without data stay
 * absent, so lines break across gaps instead of bridging idle stretches.
 * `t` is a decimal year (month buckets sit mid-month).
 */
export function consumptionRows(
  payload: FleetStatsPayload,
  period: StatsPeriod,
): { rows: Array<Record<string, number | string>>; bikeIds: number[]; granularity: "month" | "year" } {
  const range = periodRange(period, payload.currentYear);
  const granularity = range !== null && range.to - range.from < 3 ? "month" : "year";
  const groups = new Map<string, Map<number, number[]>>();
  for (const p of payload.consumption) {
    if (!dateInPeriod(p.date, period, payload.currentYear)) continue;
    const key = granularity === "year" ? p.date.slice(0, 4) : p.date.slice(0, 7);
    const byBike = groups.get(key) ?? new Map<number, number[]>();
    const list = byBike.get(p.motorcycleId) ?? [];
    list.push(p.value);
    byBike.set(p.motorcycleId, list);
    groups.set(key, byBike);
  }
  const bikeIds = new Set<number>();
  const keys = [...groups.keys()].sort();
  // Fill every bucket between first and last so gaps show as gaps.
  const allKeys: string[] = [];
  if (keys.length > 0) {
    if (granularity === "year") {
      for (let y = Number(keys[0]); y <= Number(keys[keys.length - 1]); y++) allKeys.push(String(y));
    } else {
      let y = Number(keys[0].slice(0, 4));
      let m = Number(keys[0].slice(5, 7));
      const last = keys[keys.length - 1];
      for (;;) {
        const key = `${y}-${String(m).padStart(2, "0")}`;
        allKeys.push(key);
        if (key >= last) break;
        m += 1;
        if (m > 12) {
          m = 1;
          y += 1;
        }
      }
    }
  }
  const rows = allKeys.map((key) => {
    const t = granularity === "year" ? Number(key) : Number(key.slice(0, 4)) + (Number(key.slice(5, 7)) - 0.5) / 12;
    const row: Record<string, number | string> = { key, t };
    for (const [id, values] of groups.get(key) ?? []) {
      bikeIds.add(id);
      row[String(id)] = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
    }
    return row;
  });
  return { rows, bikeIds: [...bikeIds].sort((a, b) => a - b), granularity };
}

/** Fuel prices of the months inside the period. */
export function fuelPricesInPeriod(payload: FleetStatsPayload, period: StatsPeriod) {
  return payload.fuelPrices.filter((m) => dateInPeriod(m.month, period, payload.currentYear));
}

export function bikeName(m: Pick<FleetMotorcycle, "make" | "model">): string {
  return `${m.make} ${m.model}`;
}
