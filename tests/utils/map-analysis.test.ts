import { describe, it, expect } from "vitest";
import {
  ALL_FILTER,
  buildCalendarGrid,
  buildGeoJson,
  buildHeatPoints,
  computeBounds,
  countryFlag,
  drawableLegs,
  filterLegs,
  filterLocations,
  filterTours,
  geoJsonFileName,
  locationFuelUnderFilter,
  locationsNeedingCountry,
  motorcycleColorMap,
  normalizeCountryCode,
  SERIES_COLORS,
  sketchProjection,
  summarizeYear,
  visiblePoints,
} from "~/utils/map-analysis";
import type { MapLeg, MapLocation, MapPayload, MapTour, MapYear } from "~/types/map";

function location(overrides: Partial<MapLocation> = {}): MapLocation {
  return {
    id: 1,
    name: "Migrol Bern",
    type: "fuelStation",
    latitude: 46.95,
    longitude: 7.45,
    countryCode: "CH",
    fuelStops: 10,
    liters: 150,
    fuelCost: 250,
    maintenanceVisits: 0,
    maintenanceCost: 0,
    parkedVisits: 0,
    firstVisit: "2023-04-01",
    lastVisit: "2024-09-01",
    distanceFromHomeKm: 12,
    perMotorcycle: [
      { motorcycleId: 1, fuelStops: 7, liters: 100, maintenanceVisits: 0 },
      { motorcycleId: 2, fuelStops: 3, liters: 50, maintenanceVisits: 0 },
    ],
    years: {
      "2023": { fuelStops: 4, liters: 60 },
      "2024": { fuelStops: 6, liters: 90 },
    },
    ...overrides,
  };
}

function leg(overrides: Partial<MapLeg> = {}): MapLeg {
  return {
    id: "1-1-2",
    motorcycleId: 1,
    fromRecordId: 1,
    toRecordId: 2,
    fromLocationId: 1,
    toLocationId: 2,
    from: { latitude: 46.95, longitude: 7.45 },
    to: { latitude: 46.0, longitude: 8.95 },
    startDate: "2024-06-01",
    endDate: "2024-06-02",
    days: 1,
    distanceKm: 300,
    straightKm: 160.4,
    liters: 18,
    consumption: 6,
    cost: 30,
    year: 2024,
    tourId: "1-2024-06-01",
    ...overrides,
  };
}

function tour(overrides: Partial<MapTour> = {}): MapTour {
  return {
    id: "1-2024-06-01",
    motorcycleId: 1,
    startDate: "2024-06-01",
    endDate: "2024-06-03",
    days: 3,
    distanceKm: 900,
    liters: 50,
    cost: 90,
    stops: 4,
    maxDistanceFromHomeKm: 310,
    farthestLocationId: 2,
    countries: ["CH", "IT"],
    locationIds: [1, 2, 1],
    legIds: ["1-1-2", "1-2-3"],
    year: 2024,
    ...overrides,
  };
}

function year(overrides: Partial<MapYear> = {}): MapYear {
  return {
    year: 2024,
    distanceKm: 8000,
    liters: 400,
    fuelCost: 700,
    fuelStops: 30,
    ridingDays: 40,
    tours: 2,
    dayTrips: 5,
    countries: ["AT", "CH", "IT"],
    kmByCountry: { CH: 6000, IT: 1500, AT: 500 },
    farthest: { locationId: 2, distanceKm: 310 },
    seasonStart: "2024-03-10",
    seasonEnd: "2024-11-02",
    perMotorcycle: [
      { motorcycleId: 1, distanceKm: 5000, liters: 250, fuelStops: 20 },
      { motorcycleId: 2, distanceKm: 3000, liters: 150, fuelStops: 10 },
    ],
    ...overrides,
  };
}

describe("locationFuelUnderFilter", () => {
  const loc = location();

  it("returns the totals without a filter", () => {
    expect(locationFuelUnderFilter(loc, ALL_FILTER)).toEqual({ fuelStops: 10, liters: 150 });
  });

  it("uses the year bucket for a year filter", () => {
    expect(locationFuelUnderFilter(loc, { motorcycleId: null, year: 2023 })).toEqual({ fuelStops: 4, liters: 60 });
  });

  it("is zero for a year without stops", () => {
    expect(locationFuelUnderFilter(loc, { motorcycleId: null, year: 2019 })).toEqual({ fuelStops: 0, liters: 0 });
  });

  it("uses the per-motorcycle slice for a bike filter", () => {
    expect(locationFuelUnderFilter(loc, { motorcycleId: 2, year: null })).toEqual({ fuelStops: 3, liters: 50 });
  });

  it("takes the stricter of both when bike and year are set", () => {
    expect(locationFuelUnderFilter(loc, { motorcycleId: 2, year: 2024 })).toEqual({ fuelStops: 3, liters: 50 });
  });
});

describe("filters", () => {
  it("drops fuel stations without stops in the scope but keeps other types", () => {
    const station2019 = location({ id: 5, years: { "2019": { fuelStops: 1, liters: 10 } }, perMotorcycle: [] });
    const workshop = location({ id: 9, type: "maintenanceShop", fuelStops: 0, years: {}, perMotorcycle: [] });
    const result = filterLocations([location(), station2019, workshop], { motorcycleId: null, year: 2024 });
    expect(result.map((l) => l.id)).toEqual([1, 9]);
  });

  it("returns the full list without a filter", () => {
    const list = [location(), location({ id: 2 })];
    expect(filterLocations(list, ALL_FILTER)).toBe(list);
  });

  it("filters legs and tours by motorcycle and year", () => {
    const legs = [leg(), leg({ id: "2-5-6", motorcycleId: 2 }), leg({ id: "1-7-8", year: 2023 })];
    expect(filterLegs(legs, { motorcycleId: 1, year: 2024 }).map((l) => l.id)).toEqual(["1-1-2"]);
    expect(filterLegs(legs, { motorcycleId: null, year: 2023 }).map((l) => l.id)).toEqual(["1-7-8"]);

    const tours = [tour(), tour({ id: "2-2023-01-01", motorcycleId: 2, year: 2023 })];
    expect(filterTours(tours, { motorcycleId: 2, year: null }).map((t) => t.id)).toEqual(["2-2023-01-01"]);
  });
});

describe("summarizeYear", () => {
  it("passes fleet-level stats through without a bike filter", () => {
    const summary = summarizeYear(year(), [tour()], null);
    expect(summary.distanceKm).toBe(8000);
    expect(summary.fuelCost).toBe(700);
    expect(summary.fleetLevel).toBe(false);
  });

  it("re-derives bike-level numbers from perMotorcycle and tours", () => {
    const summary = summarizeYear(year(), [tour(), tour({ id: "2-x", motorcycleId: 2, countries: ["FR"] })], 1);
    expect(summary.distanceKm).toBe(5000);
    expect(summary.liters).toBe(250);
    expect(summary.fuelStops).toBe(20);
    expect(summary.fuelCost).toBeNull();
    expect(summary.tours).toBe(1);
    expect(summary.countries).toEqual(["CH", "IT"]);
    expect(summary.fleetLevel).toBe(true);
  });

  it("falls back to the fleet countries when the bike has no tours", () => {
    const summary = summarizeYear(year(), [], 2);
    expect(summary.countries).toEqual(["AT", "CH", "IT"]);
    expect(summary.tours).toBe(0);
  });
});

describe("buildHeatPoints", () => {
  it("normalises weights against the busiest station", () => {
    const points = buildHeatPoints(
      [location({ id: 1, fuelStops: 10, liters: 100 }), location({ id: 2, fuelStops: 5, liters: 400 })],
      ALL_FILTER,
      "stops",
    );
    expect(points).toEqual([
      [46.95, 7.45, 1],
      [46.95, 7.45, 0.5],
    ]);
  });

  it("weights by liters when asked", () => {
    const points = buildHeatPoints(
      [location({ id: 1, fuelStops: 10, liters: 100 }), location({ id: 2, fuelStops: 5, liters: 400 })],
      ALL_FILTER,
      "liters",
    );
    expect(points.map((p) => p[2])).toEqual([0.25, 1]);
  });

  it("ignores non-fuel locations and stations outside the filter", () => {
    const points = buildHeatPoints(
      [location({ type: "maintenanceShop" }), location({ id: 2, years: {} })],
      { motorcycleId: null, year: 2024 },
      "stops",
    );
    expect(points).toEqual([]);
  });
});

describe("bounds & points", () => {
  it("computes south-west / north-east corners", () => {
    expect(
      computeBounds([
        { latitude: 46, longitude: 7 },
        { latitude: 48, longitude: 9 },
        { latitude: 47, longitude: 6 },
      ]),
    ).toEqual([
      [46, 6],
      [48, 9],
    ]);
  });

  it("returns null for no points", () => {
    expect(computeBounds([])).toBeNull();
  });

  it("collects location, leg and home points", () => {
    const points = visiblePoints([location()], [leg({ from: null })], { latitude: 1, longitude: 2 });
    expect(points).toHaveLength(3);
    expect(points[2]).toEqual({ latitude: 1, longitude: 2 });
  });

  it("keeps only legs with coordinates on both ends", () => {
    expect(drawableLegs([leg(), leg({ id: "x", to: null })]).map((l) => l.id)).toEqual(["1-1-2"]);
  });
});

describe("motorcycleColorMap", () => {
  it("assigns palette slots by ascending id regardless of input order", () => {
    const map = motorcycleColorMap(
      [
        { id: 9, make: "BMW", model: "GS", status: "active" },
        { id: 3, make: "BMW", model: "RT", status: "sold" },
      ],
      "light",
    );
    expect(map.get(3)).toBe(SERIES_COLORS[0].light);
    expect(map.get(9)).toBe(SERIES_COLORS[1].light);
  });

  it("folds a 9th bike into the last slot", () => {
    const bikes = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, make: "x", model: "y", status: "active" }));
    const map = motorcycleColorMap(bikes, "dark");
    expect(map.get(10)).toBe(SERIES_COLORS[SERIES_COLORS.length - 1].dark);
  });
});

describe("buildCalendarGrid", () => {
  it("lays out a non-leap year in Monday-first columns", () => {
    const grid = buildCalendarGrid(2025, []);
    expect(grid.cells).toHaveLength(365);
    // 2025-01-01 is a Wednesday → weekday index 2, first week column.
    expect(grid.cells[0]).toMatchObject({ date: "2025-01-01", weekday: 2, week: 0, level: 0 });
    expect(grid.cells[grid.cells.length - 1].date).toBe("2025-12-31");
    expect(grid.monthLabels[0]).toEqual([0, "Jan"]);
    expect(grid.monthLabels).toHaveLength(12);
    expect(grid.weeks).toBe(53);
  });

  it("buckets intensity against the busiest day and counts riding days", () => {
    const grid = buildCalendarGrid(2024, [
      { date: "2024-06-01", km: 400, liters: 20, stops: 2 },
      { date: "2024-06-02", km: 100, liters: 8, stops: 1 },
      { date: "2024-06-03", km: 0, liters: 5, stops: 1 },
      { date: "2023-12-31", km: 999, liters: 1, stops: 1 },
    ]);
    const byDate = new Map(grid.cells.map((c) => [c.date, c]));
    expect(byDate.get("2024-06-01")?.level).toBe(4);
    expect(byDate.get("2024-06-02")?.level).toBe(1);
    expect(byDate.get("2024-06-03")?.level).toBe(1);
    expect(byDate.get("2024-06-04")?.level).toBe(0);
    expect(grid.ridingDays).toBe(3);
    expect(grid.totalKm).toBe(500);
    expect(grid.maxKm).toBe(400);
    expect(grid.cells).toHaveLength(366);
  });
});

describe("GeoJSON export", () => {
  const payload: MapPayload = {
    motorcycles: [{ id: 1, make: "BMW", model: "R1150GS", status: "active" }],
    home: { locationId: 1, latitude: 46.95, longitude: 7.45, source: "storage" },
    locations: [location(), location({ id: 2, name: "Agip Como", countryCode: "IT", years: { "2023": { fuelStops: 1, liters: 10 } }, perMotorcycle: [] })],
    ungeocoded: [],
    unlocatedFuelCount: 0,
    legs: [leg(), leg({ id: "1-3-4", to: null, year: 2023 })],
    tours: [tour()],
    years: [year()],
    calendar: [],
  };

  it("emits point features for locations and line features for drawable legs", () => {
    const fc = buildGeoJson(payload, ALL_FILTER);
    expect(fc.type).toBe("FeatureCollection");
    const kinds = fc.features.map((f) => f.properties.kind);
    expect(kinds).toEqual(["location", "location", "leg"]);
    const home = fc.features[0];
    expect(home.geometry).toEqual({ type: "Point", coordinates: [7.45, 46.95] });
    expect(home.properties.isHome).toBe(true);
    expect(home.properties.fuelStops).toBe(10);
    const line = fc.features[2];
    expect(line.geometry).toEqual({
      type: "LineString",
      coordinates: [
        [7.45, 46.95],
        [8.95, 46.0],
      ],
    });
    expect(line.properties.motorcycle).toBe("BMW R1150GS");
  });

  it("honours the active filter", () => {
    const fc = buildGeoJson(payload, { motorcycleId: null, year: 2024 });
    expect(fc.features.map((f) => f.properties.id)).toEqual([1, "1-1-2"]);
    expect(fc.features[0].properties.fuelStops).toBe(6);
  });

  it("names the file after the year filter", () => {
    expect(geoJsonFileName(ALL_FILTER)).toBe("motomanager-map.geojson");
    expect(geoJsonFileName({ motorcycleId: 1, year: 2022 })).toBe("motomanager-map-2022.geojson");
  });
});

describe("country helpers", () => {
  it("selects geocoded locations without a country", () => {
    const list = [location(), location({ id: 2, countryCode: null })];
    expect(locationsNeedingCountry(list).map((l) => l.id)).toEqual([2]);
  });

  it("normalises Nominatim codes", () => {
    expect(normalizeCountryCode("ch")).toBe("CH");
    expect(normalizeCountryCode(" it ")).toBe("IT");
    expect(normalizeCountryCode("")).toBeNull();
    expect(normalizeCountryCode("CHE")).toBeNull();
    expect(normalizeCountryCode(undefined)).toBeNull();
  });

  it("renders regional-indicator flags", () => {
    expect(countryFlag("CH")).toBe("🇨🇭");
    expect(countryFlag("xx")).toBe("");
  });
});

describe("sketchProjection", () => {
  it("fits points into the box with padding and keeps north up", () => {
    const projection = sketchProjection(
      [
        { latitude: 46, longitude: 7 },
        { latitude: 47, longitude: 8 },
      ],
      200,
      100,
      10,
    );
    const south = projection.project({ latitude: 46, longitude: 7 });
    const north = projection.project({ latitude: 47, longitude: 8 });
    expect(north.y).toBeLessThan(south.y);
    expect(north.x).toBeGreaterThan(south.x);
    expect(south.y).toBeCloseTo(90, 5);
    expect(north.y).toBeCloseTo(10, 5);
    expect(south.x).toBeGreaterThanOrEqual(10);
    expect(north.x).toBeLessThanOrEqual(190);
  });

  it("centres a single point", () => {
    const projection = sketchProjection([{ latitude: 46, longitude: 7 }], 200, 100);
    expect(projection.project({ latitude: 46, longitude: 7 })).toEqual({ x: 100, y: 50 });
  });

  it("handles no points", () => {
    const projection = sketchProjection([], 200, 100);
    expect(projection.project({ latitude: 1, longitude: 1 })).toEqual({ x: 100, y: 50 });
  });
});
