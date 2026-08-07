import { describe, it, expect } from "vitest";
import { parseUsedParts, planConsumptionChanges } from "~/utils/part-consumptions";
import type { PartConsumption } from "~/types/parts";

/** Only the fields the planner reads; the rest of the row is irrelevant here. */
function consumption(id: number, partId: number, quantity: number): PartConsumption {
  return {
    id,
    partId,
    maintenanceRecordId: 7,
    quantity,
    date: "2026-06-20",
    notes: null,
    createdAt: "2026-06-20T00:00:00Z",
    clientId: null,
    updatedAt: null,
    deletedAt: null,
    motorcycleId: null,
    motorcycleMake: null,
    motorcycleModel: null,
    maintenanceDate: null,
    maintenanceType: null,
  };
}

describe("parseUsedParts", () => {
  it("parses a well-formed payload", () => {
    expect(parseUsedParts('[{"partId":1,"quantity":2},{"partId":5,"quantity":1}]')).toEqual([
      { partId: 1, quantity: 2 },
      { partId: 5, quantity: 1 },
    ]);
  });

  it("returns nothing for empty, absent or malformed input", () => {
    expect(parseUsedParts(null)).toEqual([]);
    expect(parseUsedParts("")).toEqual([]);
    expect(parseUsedParts("   ")).toEqual([]);
    expect(parseUsedParts("not json")).toEqual([]);
    expect(parseUsedParts('{"partId":1}')).toEqual([]);
  });

  it("drops entries the server would reject anyway", () => {
    const raw = JSON.stringify([
      { partId: 1, quantity: 0 },
      { partId: 2, quantity: -3 },
      { partId: 3, quantity: 1.5 },
      { partId: "4", quantity: 1 },
      { partId: 5 },
      null,
      { partId: 6, quantity: 2 },
    ]);
    expect(parseUsedParts(raw)).toEqual([{ partId: 6, quantity: 2 }]);
  });

  it("keeps only the first row for a repeated part, so it cannot be booked twice", () => {
    const raw = JSON.stringify([
      { partId: 1, quantity: 2 },
      { partId: 1, quantity: 5 },
    ]);
    expect(parseUsedParts(raw)).toEqual([{ partId: 1, quantity: 2 }]);
  });
});

describe("planConsumptionChanges", () => {
  it("creates everything for a brand-new entry", () => {
    expect(planConsumptionChanges([], [{ partId: 1, quantity: 2 }])).toEqual({
      create: [{ partId: 1, quantity: 2 }],
      update: [],
      remove: [],
    });
  });

  it("leaves an unchanged part completely alone", () => {
    // A no-op PUT would still bump partsCost/updatedAt server-side and churn
    // sync, so "no change" has to mean "no call".
    const plan = planConsumptionChanges(
      [consumption(10, 1, 2)],
      [{ partId: 1, quantity: 2 }],
    );
    expect(plan).toEqual({ create: [], update: [], remove: [] });
  });

  it("updates a re-quantified part", () => {
    const plan = planConsumptionChanges([consumption(10, 1, 2)], [{ partId: 1, quantity: 5 }]);
    expect(plan.update).toEqual([{ id: 10, quantity: 5 }]);
    expect(plan.create).toEqual([]);
    expect(plan.remove).toEqual([]);
  });

  it("removes a part that was taken off the entry", () => {
    const plan = planConsumptionChanges([consumption(10, 1, 2)], []);
    expect(plan.remove).toEqual([10]);
    expect(plan.create).toEqual([]);
    expect(plan.update).toEqual([]);
  });

  it("handles an add, a change and a removal in one submission", () => {
    const plan = planConsumptionChanges(
      [consumption(10, 1, 2), consumption(11, 2, 1), consumption(12, 3, 4)],
      [
        { partId: 1, quantity: 2 }, // unchanged
        { partId: 2, quantity: 3 }, // re-quantified
        { partId: 9, quantity: 1 }, // newly added
        // part 3 dropped
      ],
    );
    expect(plan.create).toEqual([{ partId: 9, quantity: 1 }]);
    expect(plan.update).toEqual([{ id: 11, quantity: 3 }]);
    expect(plan.remove).toEqual([12]);
  });

  it("collapses duplicate consumptions of one part instead of double-counting", () => {
    const plan = planConsumptionChanges(
      [consumption(10, 1, 2), consumption(11, 1, 3)],
      [{ partId: 1, quantity: 2 }],
    );
    expect(plan.update).toEqual([]);
    expect(plan.remove).toEqual([11]);
    expect(plan.create).toEqual([]);
  });
});
