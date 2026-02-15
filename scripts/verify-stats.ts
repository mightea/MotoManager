import { getDb } from "../app/db/index.ts";
import { buildDashboardData } from "../app/utils/home-stats.ts";
import { motorcycles, issues, maintenanceRecords, locationRecords, currencySettings } from "../app/db/schema.ts";

async function verify() {
    const db = await getDb();
    console.log("Verifying Dashboard Stats...");

    const allMotos = await db.query.motorcycles.findMany();
    const allIssues = await db.query.issues.findMany();
    const allMaintenance = await db.query.maintenanceRecords.findMany();
    const allLocations = await db.query.locationRecords.findMany();

    const { stats } = buildDashboardData({
        motorcycles: allMotos,
        issues: allIssues,
        maintenance: allMaintenance,
        locationHistory: allLocations,
        year: new Date().getFullYear(),
    });

    console.log("Total Maintenance Cost This Year (Normalized):", stats.totalMaintenanceCostThisYear);

    // Manual sum to verify
    const currentYear = new Date().getFullYear();
    let expectedSum = 0;
    for (const m of allMaintenance) {
        if (m.date && new Date(m.date).getFullYear() === currentYear) {
            expectedSum += m.normalizedCost ?? 0;
        }
    }
    console.log("Expected Sum (calculated manually):", expectedSum);

    if (Math.abs(stats.totalMaintenanceCostThisYear - expectedSum) < 0.01) {
        console.log("SUCCESS: Stats match expected sum.");
    } else {
        console.error("FAILURE: Stats do not match.");
    }
}

verify().catch(console.error);
