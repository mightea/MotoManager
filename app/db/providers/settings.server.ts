import { and, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import {
  currencySettings,
  locations,
  type NewCurrencySetting,
  type NewLocation,
} from "~/db/schema";
import type * as schema from "~/db/schema";
import {
  AVAILABLE_CURRENCY_PRESETS,
  DEFAULT_CURRENCY_CODE,
} from "~/constants";

type Database = LibSQLDatabase<typeof schema>;

let currencyCache: typeof currencySettings.$inferSelect[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

const defaultCurrencyPreset = AVAILABLE_CURRENCY_PRESETS.find(
  (currency) => currency.code === DEFAULT_CURRENCY_CODE,
);

if (!defaultCurrencyPreset) {
  throw new Error(
    `Default currency preset "${DEFAULT_CURRENCY_CODE}" is not configured.`,
  );
}

let ensureDefaultCurrencyPromise: Promise<void> | null = null;

async function upsertDefaultCurrency(db: Database) {
  const [existing] = await db
    .select({ id: currencySettings.id })
    .from(currencySettings)
    .where(eq(currencySettings.code, DEFAULT_CURRENCY_CODE))
    .limit(1);

  if (existing) {
    return;
  }

  await db.insert(currencySettings).values({
    code: defaultCurrencyPreset!.code,
    symbol: defaultCurrencyPreset!.symbol,
    label: defaultCurrencyPreset!.label,
    conversionFactor: defaultCurrencyPreset!.conversionFactor,
  });
  currencyCache = null;
}

export async function ensureDefaultCurrency(db: Database) {
  if (!ensureDefaultCurrencyPromise) {
    ensureDefaultCurrencyPromise = upsertDefaultCurrency(db).catch((error) => {
      ensureDefaultCurrencyPromise = null;
      throw error;
    });
  }

  await ensureDefaultCurrencyPromise;
}

export async function getLocations(db: Database, userId: number) {
  return db
    .select()
    .from(locations)
    .where(eq(locations.userId, userId))
    .orderBy(locations.name);
}

export async function createLocation(db: Database, values: NewLocation) {
  const [record] = await db.insert(locations).values(values).returning();
  return record ?? null;
}

export async function getCurrencies(db: Database) {
  const now = Date.now();
  if (currencyCache && (now - lastCacheTime < CACHE_TTL)) {
    return currencyCache;
  }

  const results = await db.select().from(currencySettings).orderBy(currencySettings.code);
  currencyCache = results;
  lastCacheTime = now;
  return results;
}

export async function createCurrencySetting(
  db: Database,
  values: NewCurrencySetting,
) {
  const [record] = await db
    .insert(currencySettings)
    .values(values)
    .returning();
  currencyCache = null;
  return record ?? null;
}

export async function updateLocation(
  db: Database,
  locationId: number,
  userId: number,
  values: Partial<NewLocation>,
) {
  const [record] = await db
    .update(locations)
    .set(values)
    .where(and(eq(locations.id, locationId), eq(locations.userId, userId)))
    .returning();
  return record ?? null;
}

export async function deleteLocation(
  db: Database,
  locationId: number,
  userId: number,
) {
  const deleted = await db
    .delete(locations)
    .where(and(eq(locations.id, locationId), eq(locations.userId, userId)))
    .returning();
  return deleted.at(0) ?? null;
}

export async function updateCurrencyByCode(
  db: Database,
  code: string,
  conversionFactor: number,
) {
  const [record] = await db
    .update(currencySettings)
    .set({ conversionFactor })
    .where(eq(currencySettings.code, code))
    .returning();
  currencyCache = null;
  return record ?? null;
}

export async function updateCurrencySetting(
  db: Database,
  currencyId: number,
  values: Partial<NewCurrencySetting>,
) {
  const [record] = await db
    .update(currencySettings)
    .set(values)
    .where(eq(currencySettings.id, currencyId))
    .returning();
  currencyCache = null;
  return record ?? null;
}

export async function deleteCurrencySetting(
  db: Database,
  currencyId: number,
) {
  const deleted = await db
    .delete(currencySettings)
    .where(eq(currencySettings.id, currencyId))
    .returning();
  currencyCache = null;
  return deleted.at(0) ?? null;
}
