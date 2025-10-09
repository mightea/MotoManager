import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import "dotenv/config";

async function main() {
  const sqlite = new Database(process.env.DB_FILE_NAME!);
  const db = drizzle(sqlite);

  console.log("Running migrations...");

  migrate(db, { migrationsFolder: "app/db/migrations" });

  console.log("Migrations finished!");

  sqlite.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
