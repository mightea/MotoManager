import { describe, it, expect } from "vitest";
import { buildDashboardData } from "~/utils/home-stats";
import type { Motorcycle, Issue, MaintenanceRecord, CurrentLocation } from "~/db/schema";

describe("buildDashboardData", () => {
  const mockMotorcycle: Motorcycle = {
    id: 1,
    make: "Yamaha",
    model: "MT-07",
    modelYear: 2021,
    userId: 1,
    vin: "VIN123",
    initialOdo: 1000,
    firstRegistration: "2021-03-01",
    isVeteran: false,
    isArchived: false,
    vehicleIdNr: null,
    numberPlate: null,
    image: null,
    manualOdo: null,
    purchaseDate: null,
    purchasePrice: null,
    currencyCode: null,
  };

  it("should return empty stats when no data", () => {
    const { items, stats } = buildDashboardData({
      motorcycles: [],
      issues: [],
      maintenance: [],
      locationHistory: [],
      year: 2025,
    });

    expect(items).toHaveLength(0);
    expect(stats.totalMotorcycles).toBe(0);
  });

  it("should calculate odometer from initialOdo when no records", () => {
    const { items } = buildDashboardData({
      motorcycles: [mockMotorcycle],
      issues: [],
      maintenance: [],
      locationHistory: [],
      year: 2025,
    });

    expect(items).toHaveLength(1);
    expect(items[0].odometer).toBe(1000);
    expect(items[0].odometerThisYear).toBe(0);
  });

  it("should calculate odometer from maintenance record", () => {
    const maintenance: MaintenanceRecord[] = [
      {
        id: 1,
        motorcycleId: 1,
        date: "2025-05-01",
        odo: 5000,
        type: "service",
        cost: 200,
        currency: "CHF",
        description: null,
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
        locationId: null
      }
    ];

    const { items, stats } = buildDashboardData({
      motorcycles: [mockMotorcycle],
      issues: [],
      maintenance,
      locationHistory: [],
      year: 2025,
    });

    expect(items[0].odometer).toBe(5000);
    // Baseline is initialOdo (1000). Max is 5000.
    // Previous year entries: none.
    // Baseline = max(prev entries max, initial) = 1000.
    // This year = 5000 - 1000 = 4000.
    expect(items[0].odometerThisYear).toBe(4000);
    expect(stats.totalKmThisYear).toBe(4000);
  });

    it("should correctly calculate km this year with records from previous years", () => {
    const maintenance: MaintenanceRecord[] = [
      {
        id: 1,
        motorcycleId: 1,
        date: "2024-12-01",
        odo: 4000,
        type: "service",
        cost: 200,
        currency: "CHF",
        description: null,
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
        locationId: null
      },
      {
        id: 2,
        motorcycleId: 1,
        date: "2025-06-01",
        odo: 6000,
        type: "service",
        cost: 300,
        currency: "CHF",
        description: null,
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
        locationId: null
      }
    ];

    const { items } = buildDashboardData({
      motorcycles: [mockMotorcycle],
      issues: [],
      maintenance,
      locationHistory: [],
      year: 2025,
    });

    expect(items[0].odometer).toBe(6000);
    // Previous year (2024) max is 4000.
    // Baseline for 2025 is 4000.
    // Max 2025 is 6000.
    // This year = 6000 - 4000 = 2000.
    expect(items[0].odometerThisYear).toBe(2000);
  });
});
