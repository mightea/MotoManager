import type {
  CurrentLocation,
  Issue,
  MaintenanceRecord,
  Motorcycle,
} from "~/db/schema";
import {
  getNextInspectionInfo,
  type NextInspectionInfo,
} from "~/utils/inspection";

export type MotorcycleDashboardItem = (Motorcycle & {
  lastInspection: string | null;
}) & {
  numberOfIssues: number;
  odometer: number;
  odometerThisYear: number;
  nextInspection: NextInspectionInfo | null;
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
  year: number;
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

export function buildDashboardItems({
  motorcycles,
  issues,
  maintenance,
  locationHistory,
  year,
}: BuildDashboardItemsArgs): MotorcycleDashboardItem[] {
  return motorcycles.map((moto) => {
    const relatedIssues = issues.filter((issue) => issue.motorcycleId === moto.id);
    const relatedMaintenance = maintenance.filter(
      (entry) => entry.motorcycleId === moto.id,
    );
    const relatedLocations = locationHistory.filter(
      (entry) =>
        entry.motorcycleId === moto.id && entry.odometer !== null,
    );

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

    return {
      ...moto,
      lastInspection,
      numberOfIssues: openIssuesCount,
      odometer: maxOdometer,
      odometerThisYear,
      nextInspection,
    };
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
  const totalKmThisYear = items.reduce(
    (sum, moto) => sum + (moto.odometerThisYear ?? 0),
    0,
  );

  const totalKmOverall = items.reduce((sum, moto) => {
    const distance = Math.max(
      0,
      (moto.odometer ?? 0) - (moto.initialOdo ?? 0),
    );
    return sum + distance;
  }, 0);

  const totalActiveIssues = items.reduce(
    (sum, moto) => sum + (moto.numberOfIssues ?? 0),
    0,
  );

  const totalMaintenanceCostThisYear = maintenance.reduce((sum, entry) => {
    if (!entry.date || entry.cost == null) {
      return sum;
    }
    const entryYear = new Date(entry.date).getFullYear();
    if (entryYear !== year) {
      return sum;
    }
    return sum + (entry.cost ?? 0);
  }, 0);

  const veteranCount = motorcycles.filter((moto) => moto.isVeteran).length;

  const topRider = items.reduce<DashboardStats["topRider"]>((current, moto) => {
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
    totalMotorcycles: motorcycles.length,
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
  const items = buildDashboardItems(args);
  const stats = buildDashboardStats({
    items,
    maintenance: args.maintenance,
    motorcycles: args.motorcycles,
    year: args.year,
  });
  return { items, stats };
}
