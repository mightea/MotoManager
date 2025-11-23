import { drizzle } from "drizzle-orm/libsql/node";
import { migrate } from "drizzle-orm/libsql/migrator";
import "dotenv/config";

async function main() {
  const databaseUrl = process.env.DB_FILE_NAME ?? "file:db.sqlite";
  const db = drizzle(databaseUrl);

  console.log("Running migrations...");

  await migrate(db, { migrationsFolder: "app/db/migrations" });

  console.log("Migrations finished!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
