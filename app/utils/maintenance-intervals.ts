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

export type MaintenanceInsight = {
  key: string;
  label: string;
  status: "ok" | "due" | "overdue" | "unknown";
  lastDate?: string;
  nextDate?: string;
  yearsRemaining?: number;
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

export const getMaintenanceInsights = (
  history: MaintenanceRecord[]
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
    label: string,
    lastRecord?: MaintenanceRecord,
    intervalYears?: number
  ) => {
    if (!lastRecord || !lastRecord.date || !intervalYears) {
        // Option: return an "unknown" state or just skip
        return; 
    }

    const lastDate = new Date(lastRecord.date);
    const nextDate = addYears(lastDate, intervalYears);
    const today = new Date();
    
    // Calculate remaining years (can be negative)
    const yearsRemaining = (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 365);

    insights.push({
      key,
      label,
      status: getStatus(nextDate),
      lastDate: lastRecord.date,
      nextDate: nextDate.toISOString().split('T')[0], // simplistic ISO date
      yearsRemaining: Number(yearsRemaining.toFixed(1)),
    });
  };

  // 1. Tires
  const latestFrontTire = findLatest(r => r.type === 'tire' && r.tirePosition === 'front');
  createInsight("tire-front", "Vorderreifen", latestFrontTire, MAINTENANCE_INTERVALS.tire);

  const latestRearTire = findLatest(r => r.type === 'tire' && r.tirePosition === 'rear');
  createInsight("tire-rear", "Hinterreifen", latestRearTire, MAINTENANCE_INTERVALS.tire);

  // 2. Battery
  const latestBattery = findLatest(r => r.type === 'battery');
  if (latestBattery) {
      const interval = latestBattery.batteryType === 'lithium-ion' 
        ? MAINTENANCE_INTERVALS.battery["lithium-ion"] 
        : MAINTENANCE_INTERVALS.battery.default;
      createInsight("battery", "Batterie", latestBattery, interval);
  }

  // 3. Fluids
  const fluidsToCheck = [
      { type: 'engineoil', label: 'Motoröl' },
      { type: 'gearboxoil', label: 'Getriebeöl' },
      { type: 'finaldriveoil', label: 'Kardanöl' },
  ] as const;

  fluidsToCheck.forEach(fluid => {
      const record = findLatest(r => r.type === 'fluid' && r.fluidType === fluid.type);
      createInsight(`fluid-${fluid.type}`, fluid.label, record, MAINTENANCE_INTERVALS.fluid[fluid.type]);
  });

  return insights;
};
