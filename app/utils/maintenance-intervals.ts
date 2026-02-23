import { type MaintenanceRecord, type UserSettings } from "~/db/schema";

export const DEFAULT_MAINTENANCE_INTERVALS = {
  tire: 8,
  battery: {
    "lithium-ion": 10,
    default: 6,
  },
  fluid: {
    engineoil: 2,
    gearboxoil: 2,
    finaldriveoil: 2,
  },
} as const;

export type InsightCategory = "Reifen" | "Batterie" | "Flüssigkeiten";
// ... (rest of the types and helpers remain the same)
export function parseDotCode(dotCode: string | null | undefined): Date | null {
// ...
}

export const getMaintenanceInsights = (
  history: MaintenanceRecord[],
  currentOdo: number,
  settings?: UserSettings | null
): MaintenanceInsight[] => {
  const intervals = settings ? {
    tire: settings.tireInterval,
    battery: {
      "lithium-ion": settings.batteryLithiumInterval,
      default: settings.batteryDefaultInterval,
    },
    fluid: {
      engineoil: settings.engineOilInterval,
      gearboxoil: settings.gearboxOilInterval,
      finaldriveoil: settings.finalDriveOilInterval,
    },
  } : DEFAULT_MAINTENANCE_INTERVALS;

  const insights: MaintenanceInsight[] = [];

  // Helper to find latest record of a specific type/criteria
  const findLatest = (predicate: (r: MaintenanceRecord) => boolean) => {
    return history
      .filter(predicate)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  };

  // Helper to create insight
  const createInsight = (
    key: string,
    category: InsightCategory,
    label: string,
    lastRecord?: MaintenanceRecord,
    intervalYears?: number,
    customBaseDate?: Date | null
  ) => {
    if (!lastRecord || !intervalYears) {
        return; 
    }

    const baseDate = customBaseDate || (lastRecord.date ? new Date(lastRecord.date) : null);
    if (!baseDate) return;

    const nextDate = addYears(baseDate, intervalYears);
    const today = new Date();
    
    // Calculate remaining years (can be negative)
    const yearsRemaining = (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 365);

    const kmsSinceLast = (currentOdo && lastRecord.odo) ? (currentOdo - lastRecord.odo) : undefined;

    insights.push({
      key,
      category,
      label,
      status: getStatus(nextDate),
      lastDate: baseDate.toISOString().split('T')[0],
      nextDate: nextDate.toISOString().split('T')[0],
      yearsRemaining: Number(yearsRemaining.toFixed(1)),
      lastOdo: lastRecord.odo,
      kmsSinceLast: kmsSinceLast !== undefined && kmsSinceLast > 0 ? kmsSinceLast : undefined,
    });
  };

  // 1. Tires
  const latestFrontTire = findLatest(r => r.type === 'tire' && r.tirePosition === 'front');
  const frontDotDate = latestFrontTire ? parseDotCode(latestFrontTire.dotCode) : null;
  createInsight("tire-front", "Reifen", "Vorderreifen", latestFrontTire, intervals.tire, frontDotDate);

  const latestRearTire = findLatest(r => r.type === 'tire' && r.tirePosition === 'rear');
  const rearDotDate = latestRearTire ? parseDotCode(latestRearTire.dotCode) : null;
  createInsight("tire-rear", "Reifen", "Hinterreifen", latestRearTire, intervals.tire, rearDotDate);

  // 2. Battery
  const latestBattery = findLatest(r => r.type === 'battery');
  if (latestBattery) {
      const interval = latestBattery.batteryType === 'lithium-ion' 
        ? intervals.battery["lithium-ion"] 
        : intervals.battery.default;
      createInsight("battery", "Batterie", "Batterie", latestBattery, interval);
  }

  // 3. Fluids
  const fluidsToCheck = [
      { type: 'engineoil', label: 'Motoröl' },
      { type: 'gearboxoil', label: 'Getriebeöl' },
      { type: 'finaldriveoil', label: 'Kardanöl' },
  ] as const;

  fluidsToCheck.forEach(fluid => {
      const record = findLatest(r => r.type === 'fluid' && r.fluidType === fluid.type);
      createInsight(`fluid-${fluid.type}`, "Flüssigkeiten", fluid.label, record, intervals.fluid[fluid.type]);
  });

  return insights;
};
