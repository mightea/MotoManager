import { drizzle } from "drizzle-orm/libsql/node";
import { motorcycles } from "../app/db/schema";
import { sql } from "drizzle-orm";
import "dotenv/config";

async function main() {
  const databaseUrl = process.env.DB_FILE_NAME ?? "file:db.sqlite";
  const db = drizzle(databaseUrl);

  console.log("Updating image paths...");

  await db.update(motorcycles)
    .set({
      image: sql`REPLACE(image, '/uploads/', '/images/')`
    })
    .where(sql`image LIKE '/uploads/%'`);

  console.log("Finished updating image paths.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
