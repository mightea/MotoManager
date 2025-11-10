import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import {
  currencySettings,
  locations,
  type CurrencySetting,
  type Location,
} from "~/db/schema";
import type * as schema from "~/db/schema";

type Database = LibSQLDatabase<typeof schema>;

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const CACHE_TTL_MS = 1000 * 60; // 60 seconds

const locationCache = new Map<number, CacheEntry<Location[]>>();
const inFlightLocationPromises = new Map<number, Promise<Location[]>>();

let currencyCache: CacheEntry<CurrencySetting[]> | null = null;
let inFlightCurrencyPromise: Promise<CurrencySetting[]> | null = null;

export async function getCachedLocations(db: Database, userId: number) {
  const now = Date.now();
  const cached = locationCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  let promise = inFlightLocationPromises.get(userId);
  if (!promise) {
    promise = db.query.locations.findMany({
      where: eq(locations.userId, userId),
    });
    inFlightLocationPromises.set(userId, promise);
  }

  try {
    const result = await promise;
    locationCache.set(userId, {
      data: result,
      expiresAt: now + CACHE_TTL_MS,
    });
    return result;
  } finally {
    inFlightLocationPromises.delete(userId);
  }
}

export async function getCachedCurrencies(db: Database) {
  const now = Date.now();
  if (currencyCache && currencyCache.expiresAt > now) {
    return currencyCache.data;
  }

  if (!inFlightCurrencyPromise) {
    inFlightCurrencyPromise = db.query.currencySettings.findMany();
  }

  try {
    const result = await inFlightCurrencyPromise;
    currencyCache = {
      data: result,
      expiresAt: now + CACHE_TTL_MS,
    };
    return result;
  } finally {
    inFlightCurrencyPromise = null;
  }
}

export function invalidateLocationsCache(userId: number) {
  locationCache.delete(userId);
}

export function invalidateCurrenciesCache() {
  currencyCache = null;
}
