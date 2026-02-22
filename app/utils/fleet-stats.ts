import type { Issue, MaintenanceRecord, Motorcycle, CurrentLocation } from "~/db/schema";

export type YearlyFleetStats = {
  year: number;
  distance: number;
  cost: number;
  motorcycleCount: number;
};

export type FleetStats = {
  yearly: YearlyFleetStats[];
  overall: {
    totalDistance: number;
    totalCost: number;
    maxYearlyDistance: number;
    maxYearlyCost: number;
  };
};

/**
 * Calculates fleet statistics over the years.
 */
export function calculateFleetStats(
  motorcycles: Motorcycle[],
  maintenance: MaintenanceRecord[],
  issues: Issue[],
  locationHistory: CurrentLocation[]
): FleetStats {
  const yearsMap = new Map<number, YearlyFleetStats>();
  const currentYear = new Date().getFullYear();
  
  // Find the earliest year to start from
  let startYear = currentYear;
  
  const allDates = [
    ...motorcycles.map(m => m.purchaseDate),
    ...maintenance.map(m => m.date),
    ...issues.map(i => i.date),
    ...locationHistory.map(l => l.date)
  ].filter((d): d is string => typeof d === "string" && d.length > 0);

  if (allDates.length > 0) {
    startYear = Math.min(...allDates.map(d => new Date(d).getFullYear()));
  }

  // Initialize years
  for (let y = startYear; y <= currentYear; y++) {
    yearsMap.set(y, { year: y, distance: 0, cost: 0, motorcycleCount: 0 });
  }

  // Calculate Costs per Year
  maintenance.forEach(record => {
    if (!record.date) return;
    const year = new Date(record.date).getFullYear();
    const stats = yearsMap.get(year);
    if (stats) {
      stats.cost += record.normalizedCost ?? record.cost ?? 0;
    }
  });

  // Calculate Distance per Year per Motorcycle
  motorcycles.forEach(moto => {
    const motoMaintenance = maintenance.filter(r => r.motorcycleId === moto.id);
    const motoIssues = issues.filter(r => r.motorcycleId === moto.id);
    const motoLocations = locationHistory.filter(r => r.motorcycleId === moto.id);

    const odoEntries: { date: string; odo: number }[] = [];
    
    if (moto.purchaseDate) {
      odoEntries.push({ date: moto.purchaseDate, odo: moto.initialOdo });
    }

    motoMaintenance.forEach(r => odoEntries.push({ date: r.date, odo: r.odo }));
    motoIssues.forEach(r => { if (r.date) odoEntries.push({ date: r.date, odo: r.odo }); });
    motoLocations.forEach(r => { if (r.date && r.odometer != null) odoEntries.push({ date: r.date, odo: r.odometer }); });

    if (odoEntries.length === 0) return;

    // Group max odo by year
    const odoByYear = new Map<number, number>();
    odoEntries.forEach(entry => {
      const year = new Date(entry.date).getFullYear();
      const currentMax = odoByYear.get(year) || 0;
      if (entry.odo > currentMax) {
        odoByYear.set(year, entry.odo);
      }
    });

    // Fill in gaps and calculate yearly distance
    let lastOdo = moto.initialOdo;
    for (let y = startYear; y <= currentYear; y++) {
      const stats = yearsMap.get(y);
      if (!stats) continue;

      const yearlyMax = odoByYear.get(y);
      
      // Determine if motorcycle was owned this year
      const purchaseYear = moto.purchaseDate ? new Date(moto.purchaseDate).getFullYear() : startYear;
      if (y >= purchaseYear) {
        stats.motorcycleCount++;
        
        if (yearlyMax !== undefined) {
          stats.distance += Math.max(0, yearlyMax - lastOdo);
          lastOdo = yearlyMax;
        }
      }
    }
  });

  const yearly = Array.from(yearsMap.values()).sort((a, b) => b.year - a.year);
  
  const overall = {
    totalDistance: yearly.reduce((sum, s) => sum + s.distance, 0),
    totalCost: yearly.reduce((sum, s) => sum + s.cost, 0),
    maxYearlyDistance: Math.max(...yearly.map(s => s.distance), 1),
    maxYearlyCost: Math.max(...yearly.map(s => s.cost), 1),
  };

  return { yearly, overall };
}
