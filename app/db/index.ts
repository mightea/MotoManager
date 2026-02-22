import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql/node";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "./schema";
import journal from "./migrations/meta/_journal.json";

const databaseUrl = process.env.DB_FILE_NAME ?? "file:db.sqlite";

function resolveDatabaseFilePath(fileUrl: string) {
  if (!fileUrl.startsWith("file:")) {
    return null;
  }

  const rawPath = fileUrl.slice("file:".length);

  // Ignore special sqlite targets such as file::memory:
  if (rawPath.startsWith(":")) {
    return null;
  }

  return isAbsolute(rawPath) ? rawPath : resolve(process.cwd(), rawPath);
}

function ensureLocalDatabaseDirectory() {
  const databaseFilePath = resolveDatabaseFilePath(databaseUrl);
  if (!databaseFilePath) {
    return;
  }

  // Custom SQLite file targets (such as Playwright tmp paths) must exist before connecting.
  mkdirSync(dirname(databaseFilePath), { recursive: true });
}

ensureLocalDatabaseDirectory();

const db = drizzle(databaseUrl, {
  schema,
});

const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "./migrations",
);

let migrationsPromise: Promise<void> | null = null;

async function hasTable(tableName: string) {
  const result = await db.run(
    sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ${tableName} LIMIT 1`,
  );
  return result.rows.length > 0;
}

async function ensureMigrationHistoryForExistingDb() {
  const migrationTableExists = await hasTable("__drizzle_migrations");

  if (!migrationTableExists) {
    await db.run(
      sql`CREATE TABLE IF NOT EXISTS "__drizzle_migrations" ("id" integer PRIMARY KEY AUTOINCREMENT, "hash" text NOT NULL, "created_at" integer NOT NULL)`,
    );
  }

  const historyCountResult = await db.run(
    sql`SELECT COUNT(*) as count FROM "__drizzle_migrations"`,
  );
  const hasHistory =
    Number(historyCountResult.rows?.[0]?.count ?? 0) > 0;

  if (hasHistory) {
    return;
  }

  const existingTablesResult = await db.run(
    sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> '__drizzle_migrations' LIMIT 1`,
  );
  const hasExistingSchema = existingTablesResult.rows.length > 0;

  if (!hasExistingSchema) {
    return;
  }

  const entries = Array.isArray(journal.entries) ? journal.entries : [];

  for (const entry of entries) {
    if (!entry?.tag || typeof entry.when !== "number") {
      continue;
    }

    try {
      const filePath = resolve(migrationsFolder, `${entry.tag}.sql`);
      // oxlint-disable-next-line no-await-in-loop
      const fileBuffer = await readFile(filePath);
      const hash = createHash("sha256").update(fileBuffer).digest("hex");
      // oxlint-disable-next-line no-await-in-loop
      await db.run(
        sql`INSERT INTO "__drizzle_migrations" ("hash", "created_at") VALUES (${hash}, ${entry.when})`,
      );
    } catch {
      // ignore missing migration files for seeding
    }
  }
}

async function applySchemaPatches() {
  const result = await db.run(
    sql`PRAGMA table_info("maintenance_records")`,
  );
  const hasLocationIdColumn = result.rows.some(
    (row) => row.name === "location_id",
  );

  if (!hasLocationIdColumn) {
    await db.run(
      sql`ALTER TABLE "maintenance_records" ADD COLUMN "location_id" integer REFERENCES "locations"("id")`,
    );
  }

  const torqueSpecsInfo = await db.run(
    sql`PRAGMA table_info("torque_specs")`,
  );
  const hasToolSizeColumn = torqueSpecsInfo.rows.some(
    (row) => row.name === "tool_size",
  );

  if (!hasToolSizeColumn) {
    await db.run(
      sql`ALTER TABLE "torque_specs" ADD COLUMN "tool_size" text`,
    );
  }
}

export async function ensureMigrations() {
  if (migrationsPromise === null) {
    migrationsPromise = (async () => {
      await ensureMigrationHistoryForExistingDb();
      await migrate(db, { migrationsFolder });
      await applySchemaPatches();
    })().catch((error) => {
      migrationsPromise = null;
      throw error;
    });
  }

  await migrationsPromise;
}

type GetDbOptions = {
  skipMigrations?: boolean;
};

export async function getDb(options?: GetDbOptions) {
  if (!options?.skipMigrations) {
    await ensureMigrations();
  }
  return db;
}

export default db;
