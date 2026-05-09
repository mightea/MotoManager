import type {
  Motorcycle,
} from "~/types/db";
import type { NextInspectionInfo } from "~/utils/inspection";

export type MotorcycleDashboardItem = Motorcycle & {
  lastInspection: string | null;
  numberOfIssues: number;
  odometer: number;
  odometerThisYear: number;
  nextInspection: NextInspectionInfo | null;
  lastActivity: string | null;
  image: string | null;
  hasOverdueMaintenance: boolean;
  overdueMaintenanceItems: string[];
  currentLocationId: number | null;
  currentLocationName: string | null;
  currentLocationCountryCode: string | null;
};

export type BusiestBike =
  | null
  | string
  | {
      id?: number;
      make: string;
      model: string;
      odometerThisYear?: number;
    };

export type DashboardStats = {
  year: number;
  totalMotorcycles: number;
  totalKmThisYear: number;
  totalKmOverall: number;
  totalActiveIssues: number;
  totalMaintenanceCostThisYear: number;
  veteranCount: number;
  busiestBike: BusiestBike;
  yearly?: any[];
};

/**
 * Normalize backend stats response — accepts either camelCase or snake_case
 * shapes since the backend returns the latter today. Returning a single
 * canonical shape lets the UI drop its `as any` casts.
 */
export function normalizeDashboardStats(raw: any): DashboardStats | null {
  if (!raw || typeof raw !== "object") return null;

  const pick = <T,>(...keys: string[]): T | undefined => {
    for (const k of keys) {
      if (raw[k] !== undefined) return raw[k] as T;
    }
    return undefined;
  };

  return {
    year: pick<number>("year") ?? new Date().getFullYear(),
    totalMotorcycles: pick<number>("totalMotorcycles", "total_motorcycles") ?? 0,
    totalKmThisYear: pick<number>("totalKmThisYear", "total_km_this_year") ?? 0,
    totalKmOverall: pick<number>("totalKmOverall", "total_km_overall") ?? 0,
    totalActiveIssues: pick<number>("totalActiveIssues", "total_active_issues") ?? 0,
    totalMaintenanceCostThisYear:
      pick<number>("totalMaintenanceCostThisYear", "total_maintenance_cost_this_year") ?? 0,
    veteranCount: pick<number>("veteranCount", "veteran_count") ?? 0,
    busiestBike: pick<BusiestBike>("busiestBike", "busiest_bike") ?? null,
    yearly: pick<any[]>("yearly"),
  };
}
