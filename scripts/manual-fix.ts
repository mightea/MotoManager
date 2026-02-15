import { getDb } from "../app/db/index";
import { sql } from "drizzle-orm";

async function fix() {
    const db = await getDb();
    console.log("Accidentally missing column, adding manually...");
    await db.run(sql`ALTER TABLE maintenance_records ADD normalized_cost real`);
    console.log("Done.");
}

fix().catch(console.error);
