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

export type DashboardStats = {
  year: number;
  totalMotorcycles: number;
  totalKmThisYear: number;
  totalKmOverall: number;
  totalActiveIssues: number;
  totalMaintenanceCostThisYear: number;
  veteranCount: number;
  topRider: null | {
    id: number;
    make: string;
    model: string;
    odometerThisYear: number;
  };
  yearly?: any[];
};
