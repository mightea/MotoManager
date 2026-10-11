import type { LocationType } from "~/types/db";
import type {
  CalendarDay,
  LatLon,
  MapLeg,
  MapLocation,
  MapMotorcycle,
  MapPayload,
  MapTour,
  MapYear,
} from "~/types/map";

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export interface MapFilter {
  /** `null` = all motorcycles. */
  motorcycleId: number | null;
  /** `null` = all years. */
  year: number | null;
}

export const ALL_FILTER: MapFilter = { motorcycleId: null, year: null };

/** Fuel-stop count and liters of a location under a filter. */
export function locationFuelUnderFilter(
  loc: MapLocation,
  filter: MapFilter,
): { fuelStops: number; liters: number } {
  const yearPart = filter.year === null ? null : loc.years[String(filter.year)] ?? { fuelStops: 0, liters: 0 };
  const bikePart =
    filter.motorcycleId === null
      ? null
      : loc.perMotorcycle.find((p) => p.motorcycleId === filter.motorcycleId) ?? {
          fuelStops: 0,
          liters: 0,
        };

  // The payload has no bike×year cross-tabulation. When both filters are set we
  // use the stricter of the two numbers, which is always an upper bound and is
  // exact whenever only one bike was ridden that year.
  if (yearPart && bikePart) {
    return {
      fuelStops: Math.min(yearPart.fuelStops, bikePart.fuelStops),
      liters: Math.min(yearPart.liters, bikePart.liters),
    };
  }
  if (yearPart) return yearPart;
  if (bikePart) return { fuelStops: bikePart.fuelStops, liters: bikePart.liters };
  return { fuelStops: loc.fuelStops, liters: loc.liters };
}

export function filterLegs(legs: MapLeg[], filter: MapFilter): MapLeg[] {
  return legs.filter(
    (leg) =>
      (filter.motorcycleId === null || leg.motorcycleId === filter.motorcycleId) &&
      (filter.year === null || leg.year === filter.year),
  );
}

export function filterTours(tours: MapTour[], filter: MapFilter): MapTour[] {
  return tours.filter(
    (tour) =>
      (filter.motorcycleId === null || tour.motorcycleId === filter.motorcycleId) &&
      (filter.year === null || tour.year === filter.year),
  );
}

/**
 * Locations that are relevant under the filter. Fuel stations are kept when they
 * had a stop in the filtered scope; every other type is always kept because
 * their aggregates are not broken down by year.
 */
export function filterLocations(locations: MapLocation[], filter: MapFilter): MapLocation[] {
  if (filter.motorcycleId === null && filter.year === null) return locations;
  return locations.filter((loc) => {
    if (loc.type !== "fuelStation") return true;
    return locationFuelUnderFilter(loc, filter).fuelStops > 0;
  });
}

/** Calendar days filtered by year (the calendar is not broken down by bike). */
export function filterCalendar(calendar: CalendarDay[], year: number | null): CalendarDay[] {
  if (year === null) return calendar;
  const prefix = `${year}-`;
  return calendar.filter((d) => d.date.startsWith(prefix));
}

/**
 * A year-level summary under the filter: the server's `years` entry for a single
 * bike is re-derived from `perMotorcycle` where the payload supports it. Fields
 * that only exist at fleet level (countries, riding days, farthest) are kept as
 * is and marked `fleetLevel` so the UI can label them.
 */
export interface YearSummary {
  year: number;
  distanceKm: number;
  liters: number;
  fuelCost: number | null;
  fuelStops: number;
  ridingDays: number;
  tours: number;
  dayTrips: number;
  countries: string[];
  kmByCountry: Record<string, number>;
  farthest: MapYear["farthest"];
  seasonStart: string | null;
  seasonEnd: string | null;
  fleetLevel: boolean;
}

export function summarizeYear(
  year: MapYear,
  tours: MapTour[],
  motorcycleId: number | null,
): YearSummary {
  if (motorcycleId === null) {
    return {
      ...year,
      fleetLevel: false,
    };
  }
  const bike = year.perMotorcycle.find((p) => p.motorcycleId === motorcycleId);
  const bikeTours = tours.filter((t) => t.year === year.year && t.motorcycleId === motorcycleId);
  const countries = Array.from(new Set(bikeTours.flatMap((t) => t.countries))).sort();
  return {
    year: year.year,
    distanceKm: bike?.distanceKm ?? 0,
    liters: bike?.liters ?? 0,
    fuelCost: null,
    fuelStops: bike?.fuelStops ?? 0,
    ridingDays: year.ridingDays,
    tours: bikeTours.length,
    dayTrips: year.dayTrips,
    countries: countries.length > 0 ? countries : year.countries,
    kmByCountry: year.kmByCountry,
    farthest: year.farthest,
    seasonStart: year.seasonStart,
    seasonEnd: year.seasonEnd,
    fleetLevel: true,
  };
}

// ---------------------------------------------------------------------------
// Heat & bounds
// ---------------------------------------------------------------------------

export type HeatWeight = "stops" | "liters";

export type HeatPoint = [number, number, number];

/**
 * Heat points for fuel stations: `[lat, lon, weight]` with weights normalised to
 * `0..1` against the busiest station so `leaflet.heat`'s `max: 1` renders a
 * stable gradient regardless of how many stops the user has logged.
 */
export function buildHeatPoints(
  locations: MapLocation[],
  filter: MapFilter,
  weight: HeatWeight,
): HeatPoint[] {
  const raw: HeatPoint[] = [];
  for (const loc of locations) {
    if (loc.type !== "fuelStation") continue;
    const { fuelStops, liters } = locationFuelUnderFilter(loc, filter);
    const value = weight === "stops" ? fuelStops : liters;
    if (value <= 0) continue;
    raw.push([loc.latitude, loc.longitude, value]);
  }
  const max = raw.reduce((m, p) => Math.max(m, p[2]), 0);
  if (max <= 0) return [];
  return raw.map(([lat, lon, v]) => [lat, lon, v / max]);
}

export type Bounds = [[number, number], [number, number]];

/** South-west / north-east corners of every point, or `null` when there are none. */
export function computeBounds(points: LatLon[]): Bounds | null {
  if (points.length === 0) return null;
  let minLat = Infinity;
  let minLon = Infinity;
  let maxLat = -Infinity;
  let maxLon = -Infinity;
  for (const p of points) {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLon) minLon = p.longitude;
    if (p.longitude > maxLon) maxLon = p.longitude;
  }
  return [
    [minLat, minLon],
    [maxLat, maxLon],
  ];
}

/** Every coordinate that the current filter puts on the map. */
export function visiblePoints(
  locations: MapLocation[],
  legs: MapLeg[],
  home: LatLon | null,
): LatLon[] {
  const points: LatLon[] = locations.map((l) => ({ latitude: l.latitude, longitude: l.longitude }));
  for (const leg of legs) {
    if (leg.from) points.push(leg.from);
    if (leg.to) points.push(leg.to);
  }
  if (home) points.push(home);
  return points;
}

/** Legs that have coordinates on both ends and can be drawn. */
export function drawableLegs(legs: MapLeg[]): (MapLeg & { from: LatLon; to: LatLon })[] {
  return legs.filter((l): l is MapLeg & { from: LatLon; to: LatLon } => l.from !== null && l.to !== null);
}

// ---------------------------------------------------------------------------
// Colours (dataviz categorical palette, fixed order by motorcycle id)
// ---------------------------------------------------------------------------

/** Validated categorical palette (light / dark steps) — see the dataviz skill. */
export const SERIES_COLORS: { light: string; dark: string }[] = [
  { light: "#2a78d6", dark: "#3987e5" },
  { light: "#eb6834", dark: "#d95926" },
  { light: "#1baf7a", dark: "#199e70" },
  { light: "#eda100", dark: "#c98500" },
  { light: "#e87ba4", dark: "#d55181" },
  { light: "#008300", dark: "#008300" },
  { light: "#4a3aa7", dark: "#9085e9" },
  { light: "#e34948", dark: "#e66767" },
];

/**
 * Colour per motorcycle, assigned in ascending id order and never re-assigned
 * when a filter hides bikes. A 9th bike folds into the last slot.
 */
export function motorcycleColorMap(
  motorcycles: MapMotorcycle[],
  mode: "light" | "dark",
): Map<number, string> {
  const sorted = [...motorcycles].sort((a, b) => a.id - b.id);
  const map = new Map<number, string>();
  sorted.forEach((m, i) => {
    const slot = SERIES_COLORS[Math.min(i, SERIES_COLORS.length - 1)];
    map.set(m.id, slot[mode]);
  });
  return map;
}

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  storage: "Garage / Lager",
  maintenanceShop: "Werkstatt",
  fuelStation: "Tankstelle",
  inspection: "Prüfstelle",
  other: "Sonstige",
};

// ---------------------------------------------------------------------------
// Calendar grid
// ---------------------------------------------------------------------------

export interface CalendarCell {
  date: string;
  /** 0 = Monday … 6 = Sunday. */
  weekday: number;
  /** ISO-ish week column index within the year grid. */
  week: number;
  km: number;
  liters: number;
  stops: number;
  /** 0 = no riding, 1..4 = quartile-ish intensity bucket by km. */
  level: 0 | 1 | 2 | 3 | 4;
}

export interface CalendarGrid {
  year: number;
  cells: CalendarCell[];
  weeks: number;
  /** `[weekIndex, label]` pairs for month captions. */
  monthLabels: [number, string][];
  maxKm: number;
  ridingDays: number;
  totalKm: number;
}

const MONTHS_DE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function isoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Monday-based weekday (0..6) of a UTC date. */
function mondayWeekday(d: Date): number {
  return (d.getUTCDay() + 6) % 7;
}

/**
 * Builds the GitHub-style grid: one cell per day of the year, laid out in
 * Monday-first columns. Intensity levels are thresholds against the year's
 * busiest day so a 600 km day and a 60 km day read differently.
 */
export function buildCalendarGrid(year: number, days: CalendarDay[]): CalendarGrid {
  const byDate = new Map<string, CalendarDay>();
  for (const d of days) {
    if (d.date.startsWith(`${year}-`)) byDate.set(d.date, d);
  }
  const maxKm = Array.from(byDate.values()).reduce((m, d) => Math.max(m, d.km), 0);

  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31));
  const startOffset = mondayWeekday(start);

  const cells: CalendarCell[] = [];
  const monthLabels: [number, string][] = [];
  let lastMonth = -1;
  let ridingDays = 0;
  let totalKm = 0;

  for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
    const d = new Date(t);
    const dayIndex = Math.round((t - start.getTime()) / 86_400_000);
    const week = Math.floor((dayIndex + startOffset) / 7);
    const month = d.getUTCMonth();
    if (month !== lastMonth) {
      monthLabels.push([week, MONTHS_DE[month]]);
      lastMonth = month;
    }
    const date = isoDate(d);
    const entry = byDate.get(date);
    const km = entry?.km ?? 0;
    const liters = entry?.liters ?? 0;
    const stops = entry?.stops ?? 0;
    if (entry) {
      ridingDays += 1;
      totalKm += km;
    }
    cells.push({
      date,
      weekday: mondayWeekday(d),
      week,
      km,
      liters,
      stops,
      level: calendarLevel(entry, maxKm),
    });
  }

  const weeks = cells.length > 0 ? cells[cells.length - 1].week + 1 : 0;
  return { year, cells, weeks, monthLabels, maxKm, ridingDays, totalKm };
}

function calendarLevel(entry: CalendarDay | undefined, maxKm: number): CalendarCell["level"] {
  if (!entry) return 0;
  if (maxKm <= 0 || entry.km <= 0) return 1;
  const ratio = entry.km / maxKm;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

// ---------------------------------------------------------------------------
// GeoJSON export
// ---------------------------------------------------------------------------

export interface GeoJsonFeature {
  type: "Feature";
  geometry:
    | { type: "Point"; coordinates: [number, number] }
    | { type: "LineString"; coordinates: [number, number][] };
  properties: Record<string, unknown>;
}

export interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

export function buildGeoJson(payload: MapPayload, filter: MapFilter): GeoJsonFeatureCollection {
  const features: GeoJsonFeature[] = [];
  const bikeName = new Map(payload.motorcycles.map((m) => [m.id, `${m.make} ${m.model}`]));

  for (const loc of filterLocations(payload.locations, filter)) {
    const fuel = locationFuelUnderFilter(loc, filter);
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [loc.longitude, loc.latitude] },
      properties: {
        kind: "location",
        id: loc.id,
        name: loc.name,
        locationType: loc.type,
        countryCode: loc.countryCode,
        fuelStops: fuel.fuelStops,
        liters: round1(fuel.liters),
        fuelCost: round2(loc.fuelCost),
        maintenanceVisits: loc.maintenanceVisits,
        maintenanceCost: round2(loc.maintenanceCost),
        parkedVisits: loc.parkedVisits,
        firstVisit: loc.firstVisit,
        lastVisit: loc.lastVisit,
        distanceFromHomeKm: loc.distanceFromHomeKm === null ? null : round1(loc.distanceFromHomeKm),
        isHome: payload.home?.locationId === loc.id,
      },
    });
  }

  for (const leg of drawableLegs(filterLegs(payload.legs, filter))) {
    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [leg.from.longitude, leg.from.latitude],
          [leg.to.longitude, leg.to.latitude],
        ],
      },
      properties: {
        kind: "leg",
        id: leg.id,
        motorcycleId: leg.motorcycleId,
        motorcycle: bikeName.get(leg.motorcycleId) ?? null,
        startDate: leg.startDate,
        endDate: leg.endDate,
        days: leg.days,
        distanceKm: leg.distanceKm,
        straightKm: leg.straightKm === null ? null : round1(leg.straightKm),
        liters: leg.liters,
        consumption: leg.consumption,
        cost: leg.cost,
        tourId: leg.tourId,
      },
    });
  }

  return { type: "FeatureCollection", features };
}

export function geoJsonFileName(filter: MapFilter): string {
  return filter.year === null ? "motomanager-map.geojson" : `motomanager-map-${filter.year}.geojson`;
}

// ---------------------------------------------------------------------------
// Country backfill
// ---------------------------------------------------------------------------

/** Geocoded locations whose country is still unknown — the backfill queue. */
export function locationsNeedingCountry(locations: MapLocation[]): MapLocation[] {
  return locations.filter((l) => l.countryCode === null);
}

/** Normalises a Nominatim `country_code` to the stored ISO alpha-2 form. */
export function normalizeCountryCode(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

// ---------------------------------------------------------------------------
// Mini-map sketch (tour cards) — equirectangular projection into a viewBox
// ---------------------------------------------------------------------------

export interface SketchPoint {
  x: number;
  y: number;
}

export interface SketchProjection {
  width: number;
  height: number;
  project: (p: LatLon) => SketchPoint;
}

/**
 * Fits a set of coordinates into a `width × height` box with padding, keeping
 * the aspect ratio honest at the latitude of the bounding box's centre.
 */
export function sketchProjection(points: LatLon[], width: number, height: number, padding = 10): SketchProjection {
  const bounds = computeBounds(points);
  const identity = (): SketchPoint => ({ x: width / 2, y: height / 2 });
  if (!bounds) return { width, height, project: identity };

  let [[minLat, minLon], [maxLat, maxLon]] = bounds;
  // A degenerate span (single point, or all stops on one meridian/parallel)
  // gets a symmetric margin so the content still lands in the centre.
  if (maxLat - minLat < 1e-9) {
    minLat -= 0.005;
    maxLat += 0.005;
  }
  if (maxLon - minLon < 1e-9) {
    minLon -= 0.005;
    maxLon += 0.005;
  }
  const midLat = (minLat + maxLat) / 2;
  const cosLat = Math.max(Math.cos((midLat * Math.PI) / 180), 0.05);
  const spanX = (maxLon - minLon) * cosLat;
  const spanY = maxLat - minLat;
  const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY);
  const drawW = spanX * scale;
  const drawH = spanY * scale;
  const offX = (width - drawW) / 2;
  const offY = (height - drawH) / 2;

  return {
    width,
    height,
    project: (p) => ({
      x: offX + (p.longitude - minLon) * cosLat * scale,
      y: offY + (maxLat - p.latitude) * scale,
    }),
  };
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const DATE_FMT = new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
const DATE_FMT_SHORT = new Intl.DateTimeFormat("de-CH", { day: "numeric", month: "short" });

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "–";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return DATE_FMT.format(d);
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "–";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return DATE_FMT_SHORT.format(d);
}

/** "CH, IT" with a regional-indicator flag per country where the platform renders them. */
export function countryFlag(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...Array.from(code).map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

const COUNTRY_NAMES = typeof Intl !== "undefined" && "DisplayNames" in Intl
  ? new Intl.DisplayNames(["de"], { type: "region" })
  : null;

export function countryName(code: string): string {
  if (code === "??") return "Unbekannt";
  try {
    return COUNTRY_NAMES?.of(code) ?? code;
  } catch {
    return code;
  }
}
