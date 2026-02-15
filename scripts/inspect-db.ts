import { getDb } from "../app/db/index.ts";
import { sql } from "drizzle-orm";

async function inspect() {
    const db = await getDb();

    console.log("Checking torque_specs columns:");
    const torqueCols = await db.run(sql`PRAGMA table_info(torque_specs)`);
    console.log(torqueCols.rows.map((r: any) => r[1]).join(", "));
}

inspect().catch(console.error);
