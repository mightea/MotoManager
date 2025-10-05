import { drizzle } from "drizzle-orm/libsql/node";
import { migrate } from "drizzle-orm/libsql/migrator";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "./schema";

const databaseUrl = process.env.DB_FILE_NAME ?? "file:db.sqlite";

const db = drizzle(databaseUrl, {
  schema,
});

const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "./migrations",
);

let migrationsPromise: Promise<void> | null = null;

export async function ensureMigrations() {
  if (migrationsPromise === null) {
    migrationsPromise = migrate(db, { migrationsFolder }).catch((error) => {
      migrationsPromise = null;
      throw error;
    });
  }

  await migrationsPromise;
}

export async function getDb() {
  // await ensureMigrations();
  return db;
}

export default db;
