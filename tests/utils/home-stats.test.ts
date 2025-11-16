import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CurrentLocation,
  Issue,
  MaintenanceRecord,
  Motorcycle,
} from "~/db/schema";
import {
  buildDashboardData,
  buildDashboardItems,
  buildDashboardStats,
} from "~/utils/home-stats";

const baseMotorcycle = (overrides: Partial<Motorcycle> = {}): Motorcycle => ({
  id: 1,
  make: "Honda",
  model: "CB500",
  modelYear: 2020,
  userId: 1,
  vin: "VIN123456789",
  vehicleIdNr: null,
  numberPlate: "ZH-12345",
  image: null,
  isVeteran: false,
  isArchived: false,
  firstRegistration: "2020-01-01",
  initialOdo: 1000,
  manualOdo: 1200,
  purchaseDate: "2021-01-01",
  purchasePrice: 9500,
  currencyCode: "CHF",
  ...overrides,
});

const baseMaintenance = (
  overrides: Partial<MaintenanceRecord> = {},
): MaintenanceRecord => ({
  id: 1,
  date: "2023-06-15",
  odo: 1500,
  motorcycleId: 1,
  cost: null,
  currency: null,
  description: null,
  type: "service",
  brand: null,
  model: null,
  tirePosition: null,
  tireSize: null,
  dotCode: null,
  batteryType: null,
  fluidType: null,
  viscosity: null,
  oilType: null,
  inspectionLocation: null,
  ...overrides,
});

const baseIssue = (overrides: Partial<Issue> = {}): Issue => ({
  id: 1,
  motorcycleId: 1,
  odo: 1800,
  description: null,
  priority: "medium",
  status: "new",
  date: "2024-02-10",
  ...overrides,
});

const baseLocation = (
  overrides: Partial<CurrentLocation> = {},
): CurrentLocation => ({
  id: 1,
  motorcycleId: 1,
  locationId: 1,
  odometer: 2000,
  date: "2024-02-20",
  ...overrides,
});

describe("home-stats utilities", () => {
  const fixedNow = new Date("2024-03-01T00:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("buildDashboardItems calculates per-motorcycle metrics correctly", () => {
    const motorcycles: Motorcycle[] = [baseMotorcycle()];
    const issues: Issue[] = [
      baseIssue({ id: 1, status: "new" }),
      baseIssue({ id: 2, status: "done", odo: 1750 }),
    ];
    const maintenance: MaintenanceRecord[] = [
      baseMaintenance({
        id: 1,
        date: "2023-05-01",
        odo: 1500,
        cost: 120,
        type: "service",
      }),
      baseMaintenance({
        id: 2,
        date: "2024-01-10",
        odo: 1900,
        type: "inspection",
        cost: 200,
      }),
    ];
    const locationHistory: CurrentLocation[] = [baseLocation()];

    const [item] = buildDashboardItems({
      motorcycles,
      issues,
      maintenance,
      locationHistory,
      year: 2024,
    });

    expect(item.odometer).toBe(2000);
    expect(item.odometerThisYear).toBe(500);
    expect(item.numberOfIssues).toBe(1);
    expect(item.lastInspection).toBe("2024-01-10");
    expect(item.nextInspection?.dueDateISO).toBe(
      new Date("2026-01-10T00:00:00.000Z").toISOString(),
    );
  });

  it("buildDashboardStats aggregates metrics and determines top rider", () => {
    const motorcycles: Motorcycle[] = [
      baseMotorcycle(),
      baseMotorcycle({
        id: 2,
        make: "BMW",
        model: "R80",
        modelYear: 1985,
        isVeteran: true,
        initialOdo: 5000,
        manualOdo: 5400,
        firstRegistration: "1985-04-01",
      }),
    ];

    const issues: Issue[] = [
      baseIssue(),
      baseIssue({ id: 3, motorcycleId: 2, odo: 5900, status: "new" }),
    ];

    const maintenance: MaintenanceRecord[] = [
      baseMaintenance(),
      baseMaintenance({
        id: 3,
        motorcycleId: 1,
        date: "2024-02-01",
        odo: 1950,
        cost: 220,
        type: "service",
      }),
      baseMaintenance({
        id: 4,
        motorcycleId: 2,
        date: "2023-03-01",
        odo: 5800,
        cost: 180,
        type: "service",
      }),
      baseMaintenance({
        id: 5,
        motorcycleId: 2,
        date: "2024-02-15",
        odo: 6000,
        cost: 310,
        type: "service",
      }),
    ];

    const locationHistory: CurrentLocation[] = [
      baseLocation(),
      baseLocation({
        id: 4,
        motorcycleId: 2,
        odometer: 6050,
        date: "2024-02-28",
      }),
    ];

    const items = buildDashboardItems({
      motorcycles,
      issues,
      maintenance,
      locationHistory,
      year: 2024,
    });

    const stats = buildDashboardStats({
      items,
      maintenance,
      motorcycles,
      year: 2024,
    });

    expect(stats.totalMotorcycles).toBe(2);
    expect(stats.totalKmThisYear).toBe(
      items[0].odometerThisYear + items[1].odometerThisYear,
    );
    expect(stats.totalKmOverall).toBe(
      (items[0].odometer - motorcycles[0].initialOdo) +
        (items[1].odometer - motorcycles[1].initialOdo),
    );
    expect(stats.totalActiveIssues).toBe(2);
    expect(stats.totalMaintenanceCostThisYear).toBe(220 + 310);
    expect(stats.veteranCount).toBe(1);
    expect(stats.topRider).toEqual({
      id: items[0].id,
      make: items[0].make,
      model: items[0].model,
      odometerThisYear: items[0].odometerThisYear,
    });
  });

  it("buildDashboardData returns items and stats together", () => {
    const motorcycles: Motorcycle[] = [baseMotorcycle()];
    const issues: Issue[] = [baseIssue()];
    const maintenance: MaintenanceRecord[] = [baseMaintenance()];
    const locationHistory: CurrentLocation[] = [baseLocation()];

    const result = buildDashboardData({
      motorcycles,
      issues,
      maintenance,
      locationHistory,
      year: 2024,
    });

    expect(result.items).toHaveLength(1);
    expect(result.stats.totalMotorcycles).toBe(1);
  });
});
