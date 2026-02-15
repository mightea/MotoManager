import { getDb } from "../app/db/index";
import { sql } from "drizzle-orm";

async function fix() {
    const db = await getDb();
    console.log("Accidentally missing column, adding manually...");
    try {
        await db.run(sql`ALTER TABLE maintenance_records ADD normalized_cost real`);
        console.log("Done.");
    } catch (error) {
        if (
            error instanceof Error &&
            (error.message.includes("duplicate column name") ||
                error.message.includes("already exists"))
        ) {
            console.log(
                "Column 'normalized_cost' already exists on 'maintenance_records'; no changes made.",
            );
            return;
        }
        throw error;
    }
}

fix().catch(console.error);
