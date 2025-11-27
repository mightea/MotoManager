import { drizzle } from "drizzle-orm/libsql/node";
import { motorcycles } from "../app/db/schema";
import { sql } from "drizzle-orm";
import "dotenv/config";

async function main() {
  const databaseUrl = process.env.DB_FILE_NAME ?? "file:db.sqlite";
  const db = drizzle(databaseUrl);

  console.log("Updating image paths in database: /images/ to /data/images/...");

  await db.update(motorcycles)
    .set({
      image: sql`REPLACE(image, '/images/', '/data/images/')`
    })
    .where(sql`image LIKE '/images/%'`);

  console.log("Finished updating image paths in database.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
