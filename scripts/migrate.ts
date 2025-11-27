import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import "dotenv/config";
import Database from "better-sqlite3";

async function main() {
  const databaseFile =
    process.env.DB_FILE_NAME?.replace(/^file:/, "") ?? "db.sqlite";
  const sqlite = new Database(databaseFile);
  const db = drizzle(sqlite);

  console.log("Running migrations...");

  await migrate(db, { migrationsFolder: "app/db/migrations" });

  console.log("Migrations finished!");
  sqlite.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
