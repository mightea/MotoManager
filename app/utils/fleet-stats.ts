import type {
  CostBreakdown,
  CostCategory,
  FleetMotorcycle,
  FleetStatsPayload,
  FleetYear,
} from "~/types/fleet-stats";

/** `"all"` or a calendar year. */
export type StatsPeriod = "all" | number;

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

/** Parse the `?jahr=` search param; anything unknown falls back to "all". */
export function parsePeriod(value: string | null, years: FleetYear[]): StatsPeriod {
  const year = Number(value);
  if (value && Number.isInteger(year) && years.some((y) => y.year === year)) return year;
  return "all";
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

  const year = payload.years.find((y) => y.year === period);
  const costs = year ? { ...year.costs } : emptyCosts();
  const distance = year?.distance ?? 0;
  const totalCost = year?.totalCost ?? 0;
  const bikes: BikePeriodStats[] = (year?.bikes ?? [])
    .filter((b) => b.distance > 0 || b.totalCost > 0)
    .flatMap((b) => {
      const bike = bikesById.get(b.motorcycleId);
      if (!bike) return [];
      return [
        {
          bike,
          distance: b.distance,
          liters: b.liters,
          costs: b.costs,
          totalCost: b.totalCost,
          costPerKm: b.distance > 0 ? b.totalCost / b.distance : null,
          avgConsumption: b.avgConsumption,
        },
      ];
    });

  let previous: PeriodSummary["previous"] = null;
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

  return {
    distance,
    totalCost,
    costs,
    costPerKm: distance > 0 ? totalCost / distance : null,
    liters: year?.liters ?? 0,
    avgConsumption: mean(
      payload.consumption.filter((c) => c.date.startsWith(`${period}-`)).map((c) => c.value),
    ),
    motorcycleCount: year?.motorcycleCount ?? 0,
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
  /** km in the selected year (absent for "all"). */
  value: number | null;
  /** Average km of the reference years. */
  average: number | null;
}

/**
 * km per month for the selected year against the average of earlier years.
 * For "all", only the average over every completed year with riding.
 */
export function seasonRows(payload: FleetStatsPayload, period: StatsPeriod): { rows: SeasonRow[]; referenceYears: number[] } {
  const selected = period === "all" ? null : payload.years.find((y) => y.year === period) ?? null;
  const referenceYears = payload.years.filter(
    (y) =>
      y.distance > 0 &&
      y.year !== payload.currentYear &&
      (selected === null || y.year < selected.year),
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
 * Per-fill values are too noisy to read, so a single year is bucketed by
 * month and the whole history by year. Buckets without data stay absent, so
 * lines break across gaps instead of bridging years without riding.
 */
export function consumptionRows(
  payload: FleetStatsPayload,
  period: StatsPeriod,
): { rows: Array<Record<string, number | string>>; bikeIds: number[]; granularity: "month" | "year" } {
  const granularity = period === "all" ? "year" : "month";
  const groups = new Map<string, Map<number, number[]>>();
  for (const p of payload.consumption) {
    if (period !== "all" && !p.date.startsWith(`${period}-`)) continue;
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
      const first = Number(keys[0].slice(5, 7));
      const last = Number(keys[keys.length - 1].slice(5, 7));
      for (let m = first; m <= last; m++) allKeys.push(`${period}-${String(m).padStart(2, "0")}`);
    }
  }
  const rows = allKeys.map((key) => {
    const t = granularity === "year" ? Number(key) : Number(key.slice(5, 7));
    const row: Record<string, number | string> = { key, t };
    for (const [id, values] of groups.get(key) ?? []) {
      bikeIds.add(id);
      row[String(id)] = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
    }
    return row;
  });
  return { rows, bikeIds: [...bikeIds].sort((a, b) => a - b), granularity };
}

export function bikeName(m: Pick<FleetMotorcycle, "make" | "model">): string {
  return `${m.make} ${m.model}`;
}
