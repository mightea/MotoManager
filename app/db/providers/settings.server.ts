import { and, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import {
  currencySettings,
  locations,
  type NewCurrencySetting,
  type NewLocation,
} from "~/db/schema";
import type * as schema from "~/db/schema";

type Database = LibSQLDatabase<typeof schema>;

export async function createLocation(db: Database, values: NewLocation) {
  const [record] = await db.insert(locations).values(values).returning();
  return record ?? null;
}

export async function createCurrencySetting(
  db: Database,
  values: NewCurrencySetting,
) {
  const [record] = await db
    .insert(currencySettings)
    .values(values)
    .returning();
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
  return deleted.at(0) ?? null;
}
