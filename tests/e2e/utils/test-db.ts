import { mkdir } from "node:fs/promises";
import path from "node:path";
import { drizzle } from "drizzle-orm/libsql/node";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "~/db/schema";
import { hashPassword } from "~/services/auth.server";

const migrationsFolder = path.resolve(process.cwd(), "app/db/migrations");
const defaultDbPath = path.resolve(
  process.cwd(),
  process.env.PLAYWRIGHT_DB_PATH ?? "tmp/playwright/test-db.sqlite",
);

const databaseUrl = process.env.DB_FILE_NAME ?? `file:${defaultDbPath}`;
process.env.DB_FILE_NAME = databaseUrl;
process.env.PLAYWRIGHT_DB_PATH = defaultDbPath;

const TABLES_IN_DELETE_ORDER = [
  schema.documentMotorcycles,
  schema.documents,
  schema.locationRecords,
  schema.maintenanceRecords,
  schema.issues,
  schema.torqueSpecs,
  schema.locations,
  schema.motorcycles,
  schema.currencySettings,
  schema.sessions,
  schema.users,
] as const;

const TEST_USER = {
  email: "playwright@example.com",
  username: "playwright",
  name: "Playwright User",
  password: "playwright-pass"
} as const;

let migrationsPromise: Promise<void> | null = null;
let cachedPasswordHash: string | null = null;

function resolveDatabaseFilePath() {
  if (!databaseUrl.startsWith("file:")) {
    throw new Error(
      "Playwright tests require DB_FILE_NAME to point to a file: URL",
    );
  }

  const rawPath = databaseUrl.slice("file:".length);
  return path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(process.cwd(), rawPath);
}

async function ensureDatabaseDirectory() {
  const dbFile = resolveDatabaseFilePath();
  await mkdir(path.dirname(dbFile), { recursive: true });
}

async function ensureMigrations() {
  if (!migrationsPromise) {
    migrationsPromise = (async () => {
      await ensureDatabaseDirectory();
      const db = drizzle(databaseUrl, { schema });
      console.log("Applying migrations to test database at", databaseUrl);
      await migrate(db, { migrationsFolder });
      console.log("Migrations applied to test database");
    })();
  }

  await migrationsPromise;
}

async function getSeedPasswordHash() {
  if (!cachedPasswordHash) {
    cachedPasswordHash = await hashPassword(TEST_USER.password);
  }
  return cachedPasswordHash;
}

async function seedDefaultUser() {
  const db = drizzle(databaseUrl, { schema });
  const passwordHash = await getSeedPasswordHash();
  await db.insert(schema.users).values({
    email: TEST_USER.email,
    username: TEST_USER.username,
    name: TEST_USER.name,
    passwordHash,
  });
}

async function truncateTables() {
  const db = drizzle(databaseUrl, { schema });
  for (const table of TABLES_IN_DELETE_ORDER) {
    await db.delete(table);
  }
}

export async function prepareTestDatabase() {
  await ensureMigrations();
  await resetTestDatabase();
}

export async function resetTestDatabase() {
  console.log("Resetting test database at", databaseUrl);
  await ensureMigrations();
  await truncateTables();
  await seedDefaultUser();
}

export const testUserCredentials = {
  identifier: TEST_USER.username,
  password: TEST_USER.password,
};
