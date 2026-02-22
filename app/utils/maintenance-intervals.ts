import { type MaintenanceRecord } from "~/db/schema";

export const MAINTENANCE_INTERVALS = {
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

export type MaintenanceInsight = {
  key: string;
  category: InsightCategory;
  label: string;
  status: "ok" | "due" | "overdue" | "unknown";
  lastDate?: string;
  nextDate?: string;
  yearsRemaining?: number;
  lastOdo?: number;
  kmsSinceLast?: number;
};

const addYears = (date: Date, years: number) => {
  const copy = new Date(date.getTime());
  copy.setFullYear(copy.getFullYear() + years);
  return copy;
};

const getStatus = (dueDate: Date): MaintenanceInsight["status"] => {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  
  if (dueStart < todayStart) return "overdue";
  
  // Consider "due" if within next 3 months (approx 90 days)
  const diffTime = dueStart.getTime() - todayStart.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 90) return "due";
  
  return "ok";
};

/**
 * Parses a 4-digit DOT code (WWYY) into an approximate Date object.
 * @param dotCode 4-digit string at the end of DOT code
 */
export function parseDotCode(dotCode: string | null | undefined): Date | null {
  if (!dotCode) return null;
  
  // Extract only the last 4 digits
  const cleaned = dotCode.replace(/\s/g, "");
  const match = cleaned.match(/(\d{2})(\d{2})$/);
  if (!match) return null;

  const week = parseInt(match[1], 10);
  const yearShort = parseInt(match[2], 10);
  
  if (isNaN(week) || isNaN(yearShort) || week < 1 || week > 53) return null;

  // DOT codes from 2000 onwards have 4 digits
  const year = 2000 + yearShort;
  
  const date = new Date(year, 0, 1);
  date.setDate(date.getDate() + (week - 1) * 7);
  
  return date;
}

export const getMaintenanceInsights = (
  history: MaintenanceRecord[],
  currentOdo: number
): MaintenanceInsight[] => {
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
  createInsight("tire-front", "Reifen", "Vorderreifen", latestFrontTire, MAINTENANCE_INTERVALS.tire, frontDotDate);

  const latestRearTire = findLatest(r => r.type === 'tire' && r.tirePosition === 'rear');
  const rearDotDate = latestRearTire ? parseDotCode(latestRearTire.dotCode) : null;
  createInsight("tire-rear", "Reifen", "Hinterreifen", latestRearTire, MAINTENANCE_INTERVALS.tire, rearDotDate);

  // 2. Battery
  const latestBattery = findLatest(r => r.type === 'battery');
  if (latestBattery) {
      const interval = latestBattery.batteryType === 'lithium-ion' 
        ? MAINTENANCE_INTERVALS.battery["lithium-ion"] 
        : MAINTENANCE_INTERVALS.battery.default;
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
      createInsight(`fluid-${fluid.type}`, "Flüssigkeiten", fluid.label, record, MAINTENANCE_INTERVALS.fluid[fluid.type]);
  });

  return insights;
};
