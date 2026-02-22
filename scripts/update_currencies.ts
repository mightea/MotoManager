import { drizzle } from "drizzle-orm/libsql/node";
import { eq } from "drizzle-orm";
import "dotenv/config";
import * as schema from "../app/db/schema";

// We need to redefine these here to avoid import alias issues with ts-node
// if we don't have tsconfig-paths set up perfectly in the cron environment.
// Ideally, we would fix the environment, but duplication is safer for this specific task.

const DEFAULT_CURRENCY_CODE = "CHF";

async function main() {
  console.log("Starting currency update...");
  
  const databaseUrl = process.env.DB_FILE_NAME ?? "file:db.sqlite";
  console.log(`Using database: ${databaseUrl}`);
  
  const db = drizzle(databaseUrl, { schema });

  // 1. Get all existing currencies
  const currencies = await db.select().from(schema.currencySettings);
  
  if (currencies.length === 0) {
    console.log("No currencies found to update.");
    return;
  }

  // 2. Fetch rates from Frankfurter
  console.log(`Fetching rates from Frankfurter (base: ${DEFAULT_CURRENCY_CODE})...`);
  try {
    const response = await fetch(`https://api.frankfurter.app/latest?from=${DEFAULT_CURRENCY_CODE}`);
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }
    
    const data = await response.json() as { rates: Record<string, number> };
    const rates = data.rates;
    
    console.log("Rates fetched successfully.");

    // 3. Update currencies
    console.log("Updating currencies...");
    
    const updatePromises = currencies.map(async (currency) => {
      // Skip if it's the base currency
      if (currency.code === DEFAULT_CURRENCY_CODE) return false;

      const rate = rates[currency.code];
      if (rate) {
        // We invert the rate because we store (Currency -> CHF) factor, 
        // but API returns (CHF -> Currency) rate.
        const conversionFactor = 1 / rate;
        
        await db
          .update(schema.currencySettings)
          .set({ conversionFactor })
          .where(eq(schema.currencySettings.id, currency.id));
          
        console.log(`Updated ${currency.code}: rate ${rate} -> factor ${conversionFactor.toFixed(4)}`);
        return true;
      } else {
        console.warn(`No rate found for currency: ${currency.code}`);
        return false;
      }
    });

    const results = await Promise.all(updatePromises);
    const updatedCount = results.filter(Boolean).length;

    console.log(`Finished. Updated ${updatedCount} currencies.`);

  } catch (error) {
    console.error("Error fetching or updating currencies:", error);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Unhandled error:", e);
  process.exit(1);
});
