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
    forkoil: 4,
    brakefluid: 4,
    coolant: 4,
  },
  service: 1,
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
  currentOdo: number,
  settings?: UserSettings | null,
): MaintenanceInsight[] => {
  const intervals = settings
    ? {
        tire: settings.tireInterval,
        battery: {
          "lithium-ion": settings.batteryLithiumInterval,
          default: settings.batteryDefaultInterval,
        },
        fluid: {
          engineoil: settings.engineOilInterval,
          gearboxoil: settings.gearboxOilInterval,
          finaldriveoil: settings.finalDriveOilInterval,
          forkoil: settings.forkOilInterval,
          brakefluid: settings.brakeFluidInterval,
          coolant: settings.coolantInterval,
        },
        service: settings.serviceInterval,
        chain: settings.chainInterval,
      }
    : DEFAULT_MAINTENANCE_INTERVALS;

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
    customBaseDate?: Date | null,
  ) => {
    if (!intervalYears) {
      return;
    }

    if (!lastRecord && !customBaseDate) {
      insights.push({
        key,
        category,
        label,
        status: "unknown",
      });
      return;
    }

    const baseDate =
      customBaseDate || (lastRecord?.date ? new Date(lastRecord.date) : null);
    if (!baseDate) {
      insights.push({
        key,
        category,
        label,
        status: "unknown",
      });
      return;
    }

    const nextDate = addYears(baseDate, intervalYears);
    const today = new Date();

    // Calculate remaining years (can be negative)
    const yearsRemaining =
      (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 365);

    const kmsSinceLast =
      currentOdo && lastRecord?.odo ? currentOdo - lastRecord.odo : undefined;

    insights.push({
      key,
      category,
      label,
      status: getStatus(nextDate),
      lastDate: baseDate.toISOString().split("T")[0],
      nextDate: nextDate.toISOString().split("T")[0],
      yearsRemaining: Number(yearsRemaining.toFixed(1)),
      lastOdo: lastRecord?.odo,
      kmsSinceLast:
        kmsSinceLast !== undefined && kmsSinceLast > 0
          ? kmsSinceLast
          : undefined,
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
    intervals.tire,
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
    intervals.tire,
    rearDotDate,
  );

  // 2. Battery
  const latestBattery = findLatest((r) => r.type === "battery");
  const batteryInterval = (latestBattery?.batteryType === "lithium-ion")
    ? intervals.battery["lithium-ion"]
    : intervals.battery.default;
  createInsight("battery", "Batterie", "Batterie", latestBattery, batteryInterval);

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
      intervals.fluid[fluid.type],
    );
  });

  // 4. Maintenance
  const latestService = findLatest((r) => r.type === "service");
  createInsight("service", "Wartung", "Service", latestService, intervals.service);

  const latestChain = findLatest((r) => r.type === "chain");
  createInsight("chain", "Wartung", "Kette reinigen/fetten", latestChain, intervals.chain);

  return insights;
};
