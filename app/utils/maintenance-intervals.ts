import { type MaintenanceRecord, type UserSettings } from "~/types/db";

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
    forkoil: 4,
    brakefluid: 4,
    coolant: 4,
  },
  chain: 1,
} as const;

export type InsightCategory = "Reifen" | "Batterie" | "Flüssigkeiten" | "Wartung";

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
  kmsRemaining?: number;
};

const addYears = (date: Date, years: number) => {
  const copy = new Date(date.getTime());
  copy.setFullYear(copy.getFullYear() + years);
  return copy;
};

const getStatus = (dueDate: Date, kmsSinceLast?: number, intervalKms?: number): MaintenanceInsight["status"] => {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  
  let timeStatus: MaintenanceInsight["status"] = "ok";
  if (dueStart < todayStart) {
    timeStatus = "overdue";
  } else {
    // Consider "due" if within next 3 months (approx 90 days)
    const diffTime = dueStart.getTime() - todayStart.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 90) timeStatus = "due";
  }

  let kmStatus: MaintenanceInsight["status"] = "ok";
  if (intervalKms && kmsSinceLast !== undefined) {
    if (kmsSinceLast >= intervalKms) {
      kmStatus = "overdue";
    } else if (intervalKms - kmsSinceLast <= 1000 || kmsSinceLast / intervalKms >= 0.9) {
      // Due if within 1000km or 90% of interval
      kmStatus = "due";
    }
  }

  // Prioritize more urgent status
  const priority = { overdue: 0, due: 1, ok: 2, unknown: 3 };
  return priority[timeStatus] <= priority[kmStatus] ? timeStatus : kmStatus;
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
  currentOdo: number,
  settings?: UserSettings | null,
): MaintenanceInsight[] => {
  const intervals = settings
    ? {
        tire: { years: settings.tireInterval, kms: settings.tireKmInterval },
        battery: {
          "lithium-ion": settings.batteryLithiumInterval,
          default: settings.batteryDefaultInterval,
        },
        fluid: {
          engineoil: { years: settings.engineOilInterval, kms: settings.engineOilKmInterval },
          gearboxoil: { years: settings.gearboxOilInterval, kms: settings.gearboxOilKmInterval },
          finaldriveoil: { years: settings.finalDriveOilInterval, kms: settings.finalDriveOilKmInterval },
          forkoil: { years: settings.forkOilInterval, kms: settings.forkOilKmInterval },
          brakefluid: { years: settings.brakeFluidInterval, kms: settings.brakeFluidKmInterval },
          coolant: { years: settings.coolantInterval, kms: settings.coolantKmInterval },
        },
        chain: { years: settings.chainInterval, kms: settings.chainKmInterval },
      }
    : {
        tire: { years: DEFAULT_MAINTENANCE_INTERVALS.tire, kms: null },
        battery: DEFAULT_MAINTENANCE_INTERVALS.battery,
        fluid: {
          engineoil: { years: DEFAULT_MAINTENANCE_INTERVALS.fluid.engineoil, kms: null },
          gearboxoil: { years: DEFAULT_MAINTENANCE_INTERVALS.fluid.gearboxoil, kms: null },
          finaldriveoil: { years: DEFAULT_MAINTENANCE_INTERVALS.fluid.finaldriveoil, kms: null },
          forkoil: { years: DEFAULT_MAINTENANCE_INTERVALS.fluid.forkoil, kms: null },
          brakefluid: { years: DEFAULT_MAINTENANCE_INTERVALS.fluid.brakefluid, kms: null },
          coolant: { years: DEFAULT_MAINTENANCE_INTERVALS.fluid.coolant, kms: null },
        },
        chain: { years: DEFAULT_MAINTENANCE_INTERVALS.chain, kms: null },
      };

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
    intervalKms?: number | null,
    customBaseDate?: Date | null,
  ) => {
    if (!intervalYears) {
      return;
    }

    const baseDate =
      customBaseDate || (lastRecord?.date ? new Date(lastRecord.date) : null);
    
    if (!baseDate) {
      return;
    }

    const nextDate = addYears(baseDate, intervalYears);
    const today = new Date();

    // Calculate remaining years (can be negative)
    const yearsRemaining =
      (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 365);

    const kmsSinceLast =
      lastRecord?.odo !== undefined && lastRecord?.odo !== null && currentOdo >= lastRecord.odo
        ? currentOdo - lastRecord.odo
        : undefined;

    const kmsRemaining = (intervalKms && kmsSinceLast !== undefined) ? intervalKms - kmsSinceLast : undefined;

    insights.push({
      key,
      category,
      label,
      status: getStatus(nextDate, kmsSinceLast, intervalKms || undefined),
      lastDate: baseDate.toISOString().split("T")[0],
      nextDate: nextDate.toISOString().split("T")[0],
      yearsRemaining: Number(yearsRemaining.toFixed(1)),
      lastOdo: lastRecord?.odo,
      kmsSinceLast: kmsSinceLast,
      kmsRemaining: kmsRemaining,
    });
  };

  // 1. Tires
  const latestFrontTire = findLatest(
    (r) => r.type === "tire" && r.tirePosition === "front",
  );
  const frontDotDate = latestFrontTire
    ? parseDotCode(latestFrontTire.dotCode)
    : null;
  createInsight(
    "tire-front",
    "Reifen",
    "Vorderreifen",
    latestFrontTire,
    intervals.tire.years,
    intervals.tire.kms,
    frontDotDate,
  );

  const latestRearTire = findLatest(
    (r) => r.type === "tire" && r.tirePosition === "rear",
  );
  const rearDotDate = latestRearTire
    ? parseDotCode(latestRearTire.dotCode)
    : null;
  createInsight(
    "tire-rear",
    "Reifen",
    "Hinterreifen",
    latestRearTire,
    intervals.tire.years,
    intervals.tire.kms,
    rearDotDate,
  );

  // 2. Battery
  const latestBattery = findLatest((r) => r.type === "battery");
  const batteryYears = (latestBattery?.batteryType === "lithium-ion")
    ? intervals.battery["lithium-ion"]
    : intervals.battery.default;
  createInsight("battery", "Batterie", "Batterie", latestBattery, batteryYears);

  // 3. Fluids
  const fluidsToCheck = [
    { type: "engineoil", label: "Motoröl" },
    { type: "gearboxoil", label: "Getriebeöl" },
    { type: "finaldriveoil", label: "Kardanöl" },
    { type: "forkoil", label: "Gabelöl" },
    { type: "brakefluid", label: "Bremsflüssigkeit" },
    { type: "coolant", label: "Kühlflüssigkeit" },
  ] as const;

  fluidsToCheck.forEach((fluid) => {
    const record = findLatest(
      (r) => r.type === "fluid" && r.fluidType === fluid.type,
    );
    createInsight(
      `fluid-${fluid.type}`,
      "Flüssigkeiten",
      fluid.label,
      record,
      intervals.fluid[fluid.type].years,
      intervals.fluid[fluid.type].kms,
    );
  });

  // 4. Maintenance
  const latestChain = findLatest((r) => r.type === "chain");
  createInsight("chain", "Wartung", "Kette reinigen/fetten", latestChain, intervals.chain.years, intervals.chain.kms);

  return insights;
};
