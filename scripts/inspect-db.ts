import { getDb } from "../app/db/index.ts";
import { sql } from "drizzle-orm";

async function inspect() {
    const db = await getDb();

    console.log("Checking motorcycles columns:");
    const motoCols = await db.run(sql`PRAGMA table_info(motorcycles)`);
    console.log(motoCols.rows.map((r: any) => r[1]).join(", "));

    console.log("\nChecking maintenance_records columns:");
    const maintCols = await db.run(sql`PRAGMA table_info(maintenance_records)`);
    console.log(maintCols.rows.map((r: any) => r[1]).join(", "));
}

inspect().catch(console.error);
