import { describe, expect, it } from "vitest";
import type { FleetMotorcycle, FleetStatsPayload, FleetYear } from "~/types/fleet-stats";
import {
  activeYears,
  consumptionRows,
  decimalYear,
  elapsedYears,
  emptyCosts,
  fuelPricesInPeriod,
  isYearInPeriod,
  parsePeriod,
  percentChange,
  periodLabel,
  periodRange,
  recentYearOptions,
  seasonRows,
  summarizePeriod,
  timelineRows,
} from "~/utils/fleet-stats";

function year(y: number, distance: number, totalCost: number, months?: number[]): FleetYear {
  return {
    year: y,
    distance,
    months: months ?? Array(12).fill(0),
    liters: 0,
    motorcycleCount: 1,
    costs: { ...emptyCosts(), service: totalCost },
    totalCost,
    bikes: distance > 0 || totalCost > 0
      ? [{ motorcycleId: 1, distance, liters: 0, costs: { ...emptyCosts(), service: totalCost }, totalCost, avgConsumption: null }]
      : [],
  };
}

function bike(overrides: Partial<FleetMotorcycle> = {}): FleetMotorcycle {
  return {
    id: 1,
    make: "BMW",
    model: "R 100",
    status: "active",
    ownedFrom: "2023-01-01",
    ownedUntil: null,
    yearsOwned: 2,
    distance: 3000,
    liters: 0,
    avgConsumption: null,
    costs: emptyCosts(),
    runningCost: 600,
    purchasePrice: 5000,
    salePrice: null,
    depreciation: null,
    netCost: 5600,
    runningCostPerKm: 0.2,
    netCostPerKm: 1.87,
    netCostPerYear: 2800,
    ...overrides,
  };
}

function payload(overrides: Partial<FleetStatsPayload> = {}): FleetStatsPayload {
  return {
    today: "2025-07-02",
    currentYear: 2025,
    years: [year(2022, 0, 0), year(2023, 1000, 200), year(2024, 1500, 300), year(2025, 500, 100)],
    motorcycles: [bike()],
    fuelPrices: [],
    consumption: [],
    previousYearToDate: { distance: 400, cost: 50 },
    totals: { distance: 3000, cost: 600 },
    ...overrides,
  };
}

describe("fleet stats helpers", () => {
  it("drops leading empty years", () => {
    expect(activeYears(payload().years).map((y) => y.year)).toEqual([2023, 2024, 2025]);
  });

  it("parses the period param and falls back to all", () => {
    const years = payload().years;
    expect(parsePeriod("2024", years)).toBe(2024);
    expect(parsePeriod("1999", years)).toBe("all");
    expect(parsePeriod("abc", years)).toBe("all");
    expect(parsePeriod(null, years)).toBe("all");
  });

  it("compares the running year against last year to date", () => {
    const s = summarizePeriod(payload(), 2025);
    expect(s.distance).toBe(500);
    expect(s.previous).toEqual({ label: "Vorjahr bis heute", distance: 400, totalCost: 50 });
    expect(s.costPerKm).toBeCloseTo(0.2);
  });

  it("compares a past year against the full year before", () => {
    const s = summarizePeriod(payload(), 2024);
    expect(s.previous).toEqual({ label: "vs. 2023", distance: 1000, totalCost: 200 });
    expect(s.bikes).toHaveLength(1);
    expect(s.bikes[0].costPerKm).toBeCloseTo(0.2);
  });

  it("summarizes all time from the lifetime numbers", () => {
    const s = summarizePeriod(payload(), "all");
    expect(s.distance).toBe(3000);
    expect(s.totalCost).toBe(600);
    expect(s.previous).toBeNull();
  });

  it("computes percent change only with a base", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(10, 0)).toBeNull();
  });

  it("averages earlier completed years for the season chart", () => {
    const months = (v: number) => Array(12).fill(0).map((_, i) => (i === 5 ? v : 0));
    const p = payload({
      years: [year(2023, 100, 0, months(100)), year(2024, 300, 0, months(300)), year(2025, 50, 0, months(50))],
    });
    const forYear = seasonRows(p, 2025);
    expect(forYear.referenceYears).toEqual([2023, 2024]);
    expect(forYear.rows[5]).toEqual({ month: "Jun", value: 50, average: 200 });

    const all = seasonRows(p, "all");
    // The running year is never a reference — it isn't complete.
    expect(all.referenceYears).toEqual([2023, 2024]);
    expect(all.rows[5].value).toBeNull();

    expect(seasonRows(p, 2023).referenceYears).toEqual([]);
  });

  it("builds ownership spans, open-ended up to today", () => {
    const p = payload({
      motorcycles: [
        bike({ id: 2, ownedFrom: "2024-01-01", ownedUntil: null }),
        bike({ id: 1, ownedFrom: "2020-01-01", ownedUntil: "2022-01-01" }),
        bike({ id: 3, ownedFrom: null }),
      ],
    });
    const rows = timelineRows(p);
    expect(rows.map((r) => r.id)).toEqual([1, 2]);
    expect(rows[0].range).toEqual([2020, 2022]);
    expect(rows[1].range[1]).toBeCloseTo(decimalYear("2025-07-02"));
  });

  it("averages consumption per bike and month", () => {
    const p = payload({
      consumption: [
        { motorcycleId: 1, date: "2025-05-01", value: 5 },
        { motorcycleId: 1, date: "2025-05-20", value: 6 },
        { motorcycleId: 2, date: "2025-06-01", value: 7 },
        { motorcycleId: 1, date: "2024-06-01", value: 9 },
      ],
    });
    const r = consumptionRows(p, 2025);
    expect(r.bikeIds).toEqual([1, 2]);
    expect(r.granularity).toBe("month");
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toMatchObject({ key: "2025-05", "1": 5.5 });
    expect(r.rows[0].t).toBeCloseTo(2025 + 4.5 / 12);
    const all = consumptionRows(p, "all");
    expect(all.granularity).toBe("year");
    expect(all.rows.map((row) => row.key)).toEqual(["2024", "2025"]);
  });

  it("keeps empty buckets so lines break across gaps", () => {
    const p = payload({
      consumption: [
        { motorcycleId: 1, date: "2020-05-01", value: 5 },
        { motorcycleId: 1, date: "2023-05-01", value: 6 },
      ],
    });
    const all = consumptionRows(p, "all");
    expect(all.rows.map((row) => row.key)).toEqual(["2020", "2021", "2022", "2023"]);
    expect(all.rows[1]["1"]).toBeUndefined();
  });

  describe("last N years", () => {
    // 12 years of data, 2014–2025, running year 2025.
    const many = () =>
      payload({
        years: Array.from({ length: 12 }, (_, i) => year(2014 + i, 1000, 100)),
      });

    it("spans the running year and the years before it", () => {
      expect(periodRange({ lastYears: 3 }, 2025)).toEqual({ from: 2023, to: 2025 });
      expect(periodLabel({ lastYears: 3 }, 2025)).toBe("2023–2025");
      expect(isYearInPeriod(2022, { lastYears: 3 }, 2025)).toBe(false);
      expect(isYearInPeriod(2023, { lastYears: 3 }, 2025)).toBe(true);
    });

    it("only offers ranges shorter than the data", () => {
      expect(recentYearOptions(many().years)).toEqual([3, 5, 10]);
      expect(recentYearOptions(payload().years)).toEqual([3]);
      expect(parsePeriod(null, payload().years, "5")).toBe("all");
      expect(parsePeriod(null, many().years, "5")).toEqual({ lastYears: 5 });
      expect(parsePeriod("2024", many().years, "7")).toBe(2024);
    });

    it("sums the years in the range and has no year-over-year comparison", () => {
      const s = summarizePeriod(many(), { lastYears: 3 });
      expect(s.distance).toBe(3000);
      expect(s.totalCost).toBe(300);
      expect(s.previous).toBeNull();
      expect(s.bikes).toHaveLength(1);
      expect(s.bikes[0].distance).toBe(3000);
      expect(s.bikes[0].costPerKm).toBeCloseTo(0.1);
    });

    it("counts the running year pro rata for per-year averages", () => {
      // 2 full years + 2025 up to 2 July (half the year).
      expect(elapsedYears({ lastYears: 3 }, { today: "2025-07-02", currentYear: 2025 })).toBeCloseTo(2.5, 1);
      expect(elapsedYears(2020, { today: "2025-07-02", currentYear: 2025 })).toBe(1);
    });

    it("averages the season over the completed years in the range", () => {
      const months = (v: number) => Array(12).fill(0).map((_, i) => (i === 5 ? v : 0));
      const p = payload({
        years: [year(2022, 900, 0, months(900)), year(2023, 100, 0, months(100)), year(2024, 300, 0, months(300)), year(2025, 50, 0, months(50))],
      });
      const r = seasonRows(p, { lastYears: 3 });
      expect(r.referenceYears).toEqual([2023, 2024]);
      expect(r.rows[5]).toEqual({ month: "Jun", value: null, average: 200 });
    });

    it("buckets consumption by month across years, filling gaps", () => {
      const p = payload({
        consumption: [
          { motorcycleId: 1, date: "2024-11-01", value: 5 },
          { motorcycleId: 1, date: "2025-02-01", value: 6 },
          { motorcycleId: 1, date: "2021-02-01", value: 9 },
        ],
      });
      const r = consumptionRows(p, { lastYears: 3 });
      expect(r.granularity).toBe("month");
      expect(r.rows.map((row) => row.key)).toEqual(["2024-11", "2024-12", "2025-01", "2025-02"]);
      expect(consumptionRows(p, { lastYears: 5 }).granularity).toBe("year");
    });

    it("filters fuel prices to the range", () => {
      const p = payload({
        fuelPrices: [
          { month: "2022-12", avgPricePerLiter: 2, liters: 10 },
          { month: "2023-01", avgPricePerLiter: 2.1, liters: 10 },
        ],
      });
      expect(fuelPricesInPeriod(p, { lastYears: 3 }).map((m) => m.month)).toEqual(["2023-01"]);
    });
  });
});
