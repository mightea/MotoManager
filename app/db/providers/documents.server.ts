import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import {
  documentMotorcycles,
  documents,
  type NewDocument,
  type NewDocumentMotorcycle,
} from "~/db/schema";
import type * as schema from "~/db/schema";

type Database = LibSQLDatabase<typeof schema>;

export async function createDocument(db: Database, values: NewDocument) {
  const [record] = await db.insert(documents).values(values).returning();
  return record ?? null;
}

export async function attachDocumentToMotorcycles(
  db: Database,
  values: NewDocumentMotorcycle[],
) {
  if (values.length === 0) {
    return;
  }

  await db.insert(documentMotorcycles).values(values);
}

export async function updateDocument(
  db: Database,
  documentId: number,
  values: Partial<NewDocument>,
) {
  const [record] = await db
    .update(documents)
    .set(values)
    .where(eq(documents.id, documentId))
    .returning();
  return record ?? null;
}

export async function detachDocumentMotorcycles(
  db: Database,
  documentId: number,
) {
  await db
    .delete(documentMotorcycles)
    .where(eq(documentMotorcycles.documentId, documentId));
}

export async function deleteDocument(db: Database, documentId: number) {
  await db.delete(documents).where(eq(documents.id, documentId));
}
