import { getDb } from "../app/db/index.ts";
import { sql } from "drizzle-orm";

async function fix() {
    const db = await getDb();
    console.log("Adding missing tool_size column to torque_specs...");
    try {
        await db.run(sql`ALTER TABLE torque_specs ADD COLUMN tool_size text`);
        console.log("Done.");
    } catch (e: any) {
        if (e.message.includes("duplicate column name")) {
            console.log("Column already exists.");
        } else {
            console.error(e);
        }
    }
}

fix().catch(console.error);
