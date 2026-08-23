import { describe, expect, it } from "vitest";
import { getCurrentLocationName } from "~/utils/motorcycle-header-stats";

describe("getCurrentLocationName", () => {
  const locations = [
    { id: 1, name: "Garage Katunga", type: "storage" as const },
    { id: 2, name: "Werkstatt Müller", type: "maintenanceShop" as const },
    { id: 3, name: "Tankstelle Nord", type: "fuelStation" as const },
  ];

  it("accepts an explicit location change to a workshop", () => {
    const records = [
      { type: "location" as const, locationId: 1, date: "2026-08-01" },
      { type: "location" as const, locationId: 2, date: "2026-08-23" },
    ];

    expect(getCurrentLocationName(records, locations)).toBe("Werkstatt Müller");
  });

  it("does not treat an ordinary workshop visit as a location change", () => {
    const records = [
      { type: "location" as const, locationId: 1, date: "2026-08-01" },
      { type: "service" as const, locationId: 2, date: "2026-08-23" },
      { type: "fuel" as const, locationId: 3, date: "2026-08-24" },
    ];

    expect(getCurrentLocationName(records, locations)).toBe("Garage Katunga");
  });
});
