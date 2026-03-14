import type {
  CurrentLocation,
  Issue,
  Location,
  MaintenanceRecord,
  Motorcycle,
  UserSettings,
} from "~/types/db";
import {
  getNextInspectionInfo,
  type NextInspectionInfo,
} from "~/utils/inspection";
import { getMaintenanceInsights } from "~/utils/maintenance-intervals";

export type MotorcycleDashboardItem = (Motorcycle & {
  lastInspection: string | null;
}) & {
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
};

export type BuildDashboardItemsArgs = {
  motorcycles: Motorcycle[];
  issues: Issue[];
  maintenance: MaintenanceRecord[];
  locationHistory: CurrentLocation[];
  locations: Location[];
  year: number;
  settings?: UserSettings | null;
};

const registerOdoForYear = (
  map: Map<number, number>,
  date: string | null | undefined,
  odo: number | null | undefined,
) => {
  if (!date || odo == null) {
    return;
  }

  const entryYear = new Date(date).getFullYear();
  if (!Number.isFinite(entryYear)) {
    return;
  }

  const previous = map.get(entryYear);
  if (previous === undefined || odo > previous) {
    map.set(entryYear, odo);
  }
};

export function buildDashboardItems(args: BuildDashboardItemsArgs): MotorcycleDashboardItem[] {
  const safeMotos = Array.isArray(args.motorcycles) ? args.motorcycles : [];
  const safeIssues = Array.isArray(args.issues) ? args.issues : [];
  const safeMaintenance = Array.isArray(args.maintenance) ? args.maintenance : [];
  const safeHistory = Array.isArray(args.locationHistory) ? args.locationHistory : [];
  const safeLocations = Array.isArray(args.locations) ? args.locations : [];
  const year = args.year;
  const settings = args.settings;

  return safeMotos.map((moto) => {
    try {
      const relatedIssues = safeIssues.filter((issue) => issue.motorcycleId === moto.id);
      const relatedMaintenance = safeMaintenance.filter(
        (entry) => entry.motorcycleId === moto.id,
      );
      const relatedLocations = safeHistory.filter(
        (entry) =>
          entry.motorcycleId === moto.id && entry.odometer !== null,
      );

      // Calculate last activity
      const allDates = [
        moto.purchaseDate,
        ...relatedIssues.map((i) => i.date),
        ...relatedMaintenance.map((m) => m.date),
        ...relatedLocations.map((l) => l.date),
      ].filter((d): d is string => typeof d === "string" && d.length > 0);

      const lastActivity = allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).at(0) ?? null;

      const openIssuesCount = relatedIssues.filter(
        (issue) => issue.status !== "done",
      ).length;

      const odometerCandidates: Array<number | undefined> = [
        moto.initialOdo,
        moto.manualOdo ?? undefined,
        ...relatedMaintenance.map((entry) => entry.odo),
        ...relatedIssues.map((entry) => entry.odo),
        ...relatedLocations.map((entry) => entry.odometer ?? undefined),
      ];

      const odometerValues = odometerCandidates.filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value),
      );

      const maxOdometer = odometerValues.reduce(
        (max, value) => (value > max ? value : max),
        moto.initialOdo,
      );

      const odometerByYear = new Map<number, number>();

      relatedIssues.forEach((issue) =>
        registerOdoForYear(odometerByYear, issue.date ?? null, issue.odo),
      );
      relatedMaintenance.forEach((entry) =>
        registerOdoForYear(odometerByYear, entry.date, entry.odo),
      );
      relatedLocations.forEach((entry) =>
        registerOdoForYear(odometerByYear, entry.date, entry.odometer),
      );

      // If we have a manual odometer reading, attribute it to the last known activity date
      // This prevents it from being treated as "today's" reading if the bike hasn't been ridden this year.
      if (moto.manualOdo && lastActivity) {
        registerOdoForYear(odometerByYear, lastActivity, moto.manualOdo);
      }

      const previousYearEntries = Array.from(odometerByYear.entries())
        .filter(([entryYear]) => entryYear < year)
        .sort((a, b) => b[0] - a[0]);

      const baselineOdometer = Math.max(
        previousYearEntries.at(0)?.[1] ?? moto.initialOdo ?? 0,
        moto.initialOdo ?? 0,
      );

      const odometerThisYear = Math.max(0, maxOdometer - baselineOdometer);

      const lastInspection = relatedMaintenance
        .filter((entry) => entry.type === "inspection" && entry.date)
        .map((entry) => entry.date as string)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        .at(0) ?? null;

      const nextInspection = getNextInspectionInfo({
        firstRegistration: moto.firstRegistration,
        lastInspection,
        isVeteran: moto.isVeteran ?? false,
      });

      const insights = getMaintenanceInsights(relatedMaintenance, maxOdometer, settings);
      const overdueMaintenanceItems = insights
        .filter((i) => i.status === "overdue")
        .map((i) => i.label);
      const hasOverdueMaintenance = overdueMaintenanceItems.length > 0;

      const currentLocationId = relatedMaintenance
        .filter(r => r.type === "location")
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.locationId ?? null;

      const location = safeLocations.find(l => l.id === currentLocationId);
      const currentLocationName = location?.name ?? null;
      const currentLocationCountryCode = location?.countryCode ?? null;

      return {
        ...moto,
        lastInspection,
        numberOfIssues: openIssuesCount,
        odometer: maxOdometer,
        odometerThisYear: odometerThisYear,
        nextInspection: nextInspection,
        lastActivity: lastActivity,
        image: moto.image,
        hasOverdueMaintenance,
        overdueMaintenanceItems,
        currentLocationId,
        currentLocationName,
        currentLocationCountryCode,
      };
    } catch (e) {
      console.error(`Error processing motorcycle ${moto.id}:`, e);
      return {
        ...moto,
        lastInspection: null,
        numberOfIssues: 0,
        odometer: moto.initialOdo,
        odometerThisYear: 0,
        nextInspection: null,
        lastActivity: null,
        hasOverdueMaintenance: false,
        overdueMaintenanceItems: [],
        currentLocationId: null,
        currentLocationName: null,
        currentLocationCountryCode: null,
      };
    }
  });
}

export function buildDashboardStats({
  items,
  maintenance,
  motorcycles,
  year,
}: {
  items: MotorcycleDashboardItem[];
  maintenance: MaintenanceRecord[];
  motorcycles: Motorcycle[];
  year: number;
}): DashboardStats {
  const safeItems = Array.isArray(items) ? items : [];
  const safeMaintenance = Array.isArray(maintenance) ? maintenance : [];
  const safeMotorcycles = Array.isArray(motorcycles) ? motorcycles : [];

  const totalKmThisYear = safeItems.reduce(
    (sum, moto) => sum + (moto.odometerThisYear ?? 0),
    0,
  );

  const totalKmOverall = safeItems.reduce((sum, moto) => {
    const distance = Math.max(
      0,
      (moto.odometer ?? 0) - (moto.initialOdo ?? 0),
    );
    return sum + distance;
  }, 0);

  const totalActiveIssues = safeItems.reduce(
    (sum, moto) => sum + (moto.numberOfIssues ?? 0),
    0,
  );

  const totalMaintenanceCostThisYear = safeMaintenance.reduce((sum, entry) => {
    if (!entry.date) {
      return sum;
    }
    const entryYear = new Date(entry.date).getFullYear();
    if (entryYear !== year) {
      return sum;
    }
    // Prefer normalizedCost but fall back to cost for legacy records
    const costValue = entry.normalizedCost ?? entry.cost ?? 0;
    return sum + costValue;
  }, 0);

  const veteranCount = safeMotorcycles.filter((moto) => moto.isVeteran).length;

  const topRider = safeItems.reduce<DashboardStats["topRider"]>((current, moto) => {
    if (moto.odometerThisYear <= 0) {
      return current;
    }
    if (
      !current ||
      moto.odometerThisYear > current.odometerThisYear
    ) {
      return {
        id: moto.id,
        make: moto.make,
        model: moto.model,
        odometerThisYear: moto.odometerThisYear,
      };
    }
    return current;
  }, null);

  return {
    year,
    totalMotorcycles: safeMotorcycles.length,
    totalKmThisYear,
    totalKmOverall,
    totalActiveIssues,
    totalMaintenanceCostThisYear,
    veteranCount,
    topRider,
  };
}

export function buildDashboardData(args: BuildDashboardItemsArgs): {
  items: MotorcycleDashboardItem[];
  stats: DashboardStats;
} {
  const safeMotorcycles = Array.isArray(args.motorcycles) ? args.motorcycles : [];
  const safeMaintenance = Array.isArray(args.maintenance) ? args.maintenance : [];
  const safeIssues = Array.isArray(args.issues) ? args.issues : [];
  const safeLocationHistory = Array.isArray(args.locationHistory) ? args.locationHistory : [];
  const safeLocations = Array.isArray(args.locations) ? args.locations : [];

  const items = buildDashboardItems({
    ...args,
    motorcycles: safeMotorcycles,
    maintenance: safeMaintenance,
    issues: safeIssues,
    locationHistory: safeLocationHistory,
    locations: safeLocations,
  });

  const stats = buildDashboardStats({
    items,
    maintenance: safeMaintenance,
    motorcycles: safeMotorcycles,
    year: args.year,
  });
  return { items, stats };
}
