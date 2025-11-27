import { drizzle } from "drizzle-orm/libsql/node";
import { sql } from "drizzle-orm";
import "dotenv/config";

async function main() {
  const databaseUrl = process.env.DB_FILE_NAME ?? "file:db.sqlite";
  const db = drizzle(databaseUrl);

  const result = await db.run(sql`PRAGMA table_info(motorcycles)`);
  console.table(result.rows);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
