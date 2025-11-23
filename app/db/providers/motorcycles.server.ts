import { and, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import {
  issues,
  locationRecords,
  locations,
  maintenanceRecords,
  motorcycles,
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
} from "~/db/schema";
import type * as schema from "~/db/schema";

type Database = LibSQLDatabase<typeof schema>;

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
  return record ?? null;
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
  return record ?? null;
}

export async function deleteMaintenanceRecord(
  db: Database,
  maintenanceId: number,
  motorcycleId: number,
) {
  const deleted = await db
    .delete(maintenanceRecords)
    .where(
      and(
        eq(maintenanceRecords.id, maintenanceId),
        eq(maintenanceRecords.motorcycleId, motorcycleId),
      ),
    )
    .returning();
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
