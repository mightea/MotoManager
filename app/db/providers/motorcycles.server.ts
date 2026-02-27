import { and, eq, asc } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import {
  issues,
  locationRecords,
  locations,
  maintenanceRecords,
  motorcycles,
  previousOwners,
  torqueSpecs,
  documentMotorcycles,
  type EditorIssue,
  type EditorMotorcycle,
  type NewCurrentLocationRecord,
  type NewIssue,
  type NewLocation,
  type NewMaintenanceRecord,
  type NewMotorcycle,
  type NewTorqueSpecification,
  type NewPreviousOwner,
} from "~/db/schema";
import type * as schema from "~/db/schema";

type Database = LibSQLDatabase<typeof schema>;

export async function recalculateFuelConsumption(
  db: Database,
  motorcycleId: number,
) {
  const fuelRecords = await db.query.maintenanceRecords.findMany({
    where: and(
      eq(maintenanceRecords.motorcycleId, motorcycleId),
      eq(maintenanceRecords.type, "fuel"),
    ),
    orderBy: [asc(maintenanceRecords.date), asc(maintenanceRecords.odo)],
  });

  for (let i = 0; i < fuelRecords.length; i++) {
    const current = fuelRecords[i];
    const previous = i > 0 ? fuelRecords[i - 1] : null;

    let tripDistance = null;
    let fuelConsumption = null;

    if (previous) {
      tripDistance = current.odo - previous.odo;
      if (tripDistance > 0 && current.fuelAmount) {
        fuelConsumption = (current.fuelAmount / tripDistance) * 100;
      }
    }

    await db
      .update(maintenanceRecords)
      .set({
        tripDistance,
        fuelConsumption,
      })
      .where(eq(maintenanceRecords.id, current.id));
  }
}

export async function createMotorcycle(
  db: Database,
  values: NewMotorcycle,
) {
  return db.insert(motorcycles).values(values).returning();
}

export async function createIssue(db: Database, values: NewIssue) {
  await db.insert(issues).values(values);
}

export async function createMaintenanceRecord(
  db: Database,
  values: NewMaintenanceRecord,
) {
  const [record] = await db
    .insert(maintenanceRecords)
    .values(values)
    .returning();

  if (record?.type === "fuel") {
    await recalculateFuelConsumption(db, record.motorcycleId);
  }

  return record ?? null;
}

export async function createPreviousOwner(
  db: Database,
  values: NewPreviousOwner,
) {
  const [record] = await db.insert(previousOwners).values(values).returning();
  return record ?? null;
}

export async function updatePreviousOwner(
  db: Database,
  ownerId: number,
  motorcycleId: number,
  values: Partial<NewPreviousOwner>,
) {
  const [record] = await db
    .update(previousOwners)
    .set({ ...values, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(previousOwners.id, ownerId),
        eq(previousOwners.motorcycleId, motorcycleId),
      ),
    )
    .returning();
  return record ?? null;
}

export async function deletePreviousOwner(
  db: Database,
  ownerId: number,
  motorcycleId: number,
) {
  const deleted = await db
    .delete(previousOwners)
    .where(
      and(
        eq(previousOwners.id, ownerId),
        eq(previousOwners.motorcycleId, motorcycleId),
      ),
    )
    .returning();
  return deleted.length > 0;
}

export async function createLocationRecord(
  db: Database,
  values: NewCurrentLocationRecord,
) {
  const [record] = await db
    .insert(locationRecords)
    .values(values)
    .returning();
  return record ?? null;
}

export async function createLocation(db: Database, values: NewLocation) {
  const [record] = await db.insert(locations).values(values).returning();
  return record ?? null;
}

export async function createTorqueSpecification(
  db: Database,
  values: NewTorqueSpecification,
) {
  const [record] = await db.insert(torqueSpecs).values(values).returning();
  return record ?? null;
}

export async function updateMotorcycle(
  db: Database,
  motorcycleId: number,
  userId: number,
  values: EditorMotorcycle,
) {
  const [record] = await db
    .update(motorcycles)
    .set(values)
    .where(and(eq(motorcycles.id, motorcycleId), eq(motorcycles.userId, userId)))
    .returning();
  return record ?? null;
}

export async function updateIssue(
  db: Database,
  issueId: number,
  motorcycleId: number,
  values: EditorIssue,
) {
  const [record] = await db
    .update(issues)
    .set(values)
    .where(and(eq(issues.id, issueId), eq(issues.motorcycleId, motorcycleId)))
    .returning();
  return record ?? null;
}

export async function deleteIssue(
  db: Database,
  issueId: number,
  motorcycleId: number,
) {
  const deleted = await db
    .delete(issues)
    .where(and(eq(issues.id, issueId), eq(issues.motorcycleId, motorcycleId)))
    .returning();
  return deleted.length > 0;
}

export async function updateMaintenanceRecord(
  db: Database,
  maintenanceId: number,
  motorcycleId: number,
  values: Partial<NewMaintenanceRecord>,
) {
  const [record] = await db
    .update(maintenanceRecords)
    .set(values)
    .where(
      and(
        eq(maintenanceRecords.id, maintenanceId),
        eq(maintenanceRecords.motorcycleId, motorcycleId),
      ),
    )
    .returning();

  if (record?.type === "fuel" || values.type === "fuel") {
    await recalculateFuelConsumption(db, motorcycleId);
  }

  return record ?? null;
}

export async function deleteMaintenanceRecord(
  db: Database,
  maintenanceId: number,
  motorcycleId: number,
) {
  const [record] = await db
    .select({ type: maintenanceRecords.type })
    .from(maintenanceRecords)
    .where(eq(maintenanceRecords.id, maintenanceId));

  const deleted = await db
    .delete(maintenanceRecords)
    .where(
      and(
        eq(maintenanceRecords.id, maintenanceId),
        eq(maintenanceRecords.motorcycleId, motorcycleId),
      ),
    )
    .returning();

  if (record?.type === "fuel") {
    await recalculateFuelConsumption(db, motorcycleId);
  }

  return deleted.length > 0;
}

export async function updateTorqueSpecification(
  db: Database,
  torqueId: number,
  motorcycleId: number,
  values: Partial<NewTorqueSpecification>,
) {
  const [record] = await db
    .update(torqueSpecs)
    .set(values)
    .where(
      and(
        eq(torqueSpecs.id, torqueId),
        eq(torqueSpecs.motorcycleId, motorcycleId),
      ),
    )
    .returning();
  return record ?? null;
}

export async function deleteTorqueSpecification(
  db: Database,
  torqueId: number,
  motorcycleId: number,
) {
  const deleted = await db
    .delete(torqueSpecs)
    .where(
      and(
        eq(torqueSpecs.id, torqueId),
        eq(torqueSpecs.motorcycleId, motorcycleId),
      ),
    )
    .returning();
  return deleted.length > 0;
}

export async function deleteMotorcycleCascade(
  db: Database,
  motorcycleId: number,
) {
  await db
    .delete(maintenanceRecords)
    .where(eq(maintenanceRecords.motorcycleId, motorcycleId));
  await db.delete(issues).where(eq(issues.motorcycleId, motorcycleId));
  await db
    .delete(locationRecords)
    .where(eq(locationRecords.motorcycleId, motorcycleId));
  await db
    .delete(documentMotorcycles)
    .where(eq(documentMotorcycles.motorcycleId, motorcycleId));
  await db
    .delete(torqueSpecs)
    .where(eq(torqueSpecs.motorcycleId, motorcycleId));
  await db
    .delete(motorcycles)
    .where(eq(motorcycles.id, motorcycleId));
}
