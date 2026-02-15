import { getDb } from "../app/db/index";
import { maintenanceRecords, motorcycles } from "../app/db/schema";
import { eq } from "drizzle-orm";

async function backfill() {
    console.log("Starting backfill...");
    const db = await getDb();

    // 1. Fetch currency settings
    const currencies = await db.query.currencySettings.findMany();
    const currencyMap = new Map(currencies.map(c => [c.code, c.conversionFactor]));

    // Default to 1 if currency not found or CHF
    const getFactor = (code: string | null | undefined) => {
        if (!code) return 1;
        return currencyMap.get(code) || 1;
    };

    // 2. Backfill Motorcycles
    const motos = await db.query.motorcycles.findMany();
    console.log(`Found ${motos.length} motorcycles.`);

    for (const moto of motos) {
        if (moto.purchasePrice) {
            const factor = getFactor(moto.currencyCode);
            const normalizedPrice = moto.purchasePrice * factor;

            await db.update(motorcycles)
                .set({ normalizedPurchasePrice: normalizedPrice })
                .where(eq(motorcycles.id, moto.id));

            console.log(`Updated Moto ID ${moto.id}: ${moto.purchasePrice} ${moto.currencyCode} -> ${normalizedPrice} CHF`);
        }
    }

    // 3. Backfill Maintenance Records
    const records = await db.query.maintenanceRecords.findMany();
    console.log(`Found ${records.length} maintenance records.`);

    for (const record of records) {
        if (record.cost) {
            const factor = getFactor(record.currency);
            const normalizedCost = record.cost * factor;

            await db.update(maintenanceRecords)
                .set({ normalizedCost: normalizedCost })
                .where(eq(maintenanceRecords.id, record.id));

            console.log(`Updated Record ID ${record.id}: ${record.cost} ${record.currency} -> ${normalizedCost} CHF`);
        }
    }

    console.log("Backfill complete.");
}

backfill().catch(console.error);
