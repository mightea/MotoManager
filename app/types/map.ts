import type { LocationType } from "./db";

/**
 * Payload of `GET /api/map` — the server-side trip analysis over the user's
 * locations, fuel stops and bike-position markers. Everything is unfiltered;
 * the client narrows by motorcycle / year (see `~/utils/map-analysis`).
 */
export interface MapPayload {
  motorcycles: MapMotorcycle[];
  home: MapHome | null;
  locations: MapLocation[];
  ungeocoded: UngeocodedLocation[];
  /** Fuel records without any location at all — invisible on the map. */
  unlocatedFuelCount: number;
  legs: MapLeg[];
  tours: MapTour[];
  /** Ascending by year. */
  years: MapYear[];
  /** One entry per distinct fuel date. */
  calendar: CalendarDay[];
}

export interface MapMotorcycle {
  id: number;
  make: string;
  model: string;
  status: string;
}

export type HomeSource = "locationRecord" | "storage" | "mostVisited";

export interface MapHome {
  locationId: number;
  latitude: number;
  longitude: number;
  source: HomeSource;
}

export interface LatLon {
  latitude: number;
  longitude: number;
}

export interface MapLocationPerMotorcycle {
  motorcycleId: number;
  fuelStops: number;
  liters: number;
  maintenanceVisits: number;
}

export interface MapLocationYear {
  fuelStops: number;
  liters: number;
}

export interface MapLocation {
  id: number;
  name: string;
  type: LocationType;
  latitude: number;
  longitude: number;
  countryCode: string | null;
  fuelStops: number;
  liters: number;
  fuelCost: number;
  maintenanceVisits: number;
  maintenanceCost: number;
  parkedVisits: number;
  firstVisit: string | null;
  lastVisit: string | null;
  distanceFromHomeKm: number | null;
  perMotorcycle: MapLocationPerMotorcycle[];
  years: Record<string, MapLocationYear>;
}

export interface UngeocodedLocation {
  id: number;
  name: string;
  type: LocationType;
  visits: number;
}

export interface MapLeg {
  /** `<motorcycleId>-<fromRecordId>-<toRecordId>` */
  id: string;
  motorcycleId: number;
  fromRecordId: number;
  toRecordId: number;
  fromLocationId: number | null;
  toLocationId: number | null;
  from: LatLon | null;
  to: LatLon | null;
  startDate: string;
  endDate: string;
  days: number;
  /** Odometer delta; always > 0. */
  distanceKm: number;
  straightKm: number | null;
  liters: number | null;
  consumption: number | null;
  cost: number | null;
  year: number;
  tourId: string | null;
}

export interface MapTour {
  /** `<motorcycleId>-<startDate>` */
  id: string;
  motorcycleId: number;
  startDate: string;
  endDate: string;
  /** Inclusive calendar days. */
  days: number;
  distanceKm: number;
  liters: number;
  cost: number;
  stops: number;
  maxDistanceFromHomeKm: number;
  farthestLocationId: number | null;
  countries: string[];
  locationIds: number[];
  legIds: string[];
  year: number;
}

export interface MapYearPerMotorcycle {
  motorcycleId: number;
  distanceKm: number;
  liters: number;
  fuelStops: number;
}

export interface MapYear {
  year: number;
  distanceKm: number;
  liters: number;
  fuelCost: number;
  fuelStops: number;
  ridingDays: number;
  tours: number;
  dayTrips: number;
  countries: string[];
  /** Leg km attributed to the destination's country; unknown country = "??". */
  kmByCountry: Record<string, number>;
  farthest: { locationId: number; distanceKm: number } | null;
  seasonStart: string | null;
  seasonEnd: string | null;
  perMotorcycle: MapYearPerMotorcycle[];
}

export interface CalendarDay {
  date: string;
  km: number;
  liters: number;
  stops: number;
}
