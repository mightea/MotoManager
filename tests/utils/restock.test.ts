import { describe, expect, it } from "vitest";
import { repairUsesByPart, restockTone } from "~/utils/restock";

const booking = (partId: number, maintenanceRecordId: number | null, deletedAt: string | null = null) => ({
  partId,
  maintenanceRecordId,
  deletedAt,
});

describe("repairUsesByPart", () => {
  it("counts distinct repairs and skips manual or deleted bookings", () => {
    const uses = repairUsesByPart([
      booking(1, 10),
      booking(1, 10),
      booking(1, 11),
      booking(1, null),
      booking(1, 12, "2026-01-01T00:00:00Z"),
      booking(2, 20),
    ]);
    expect(uses.get(1)).toBe(2);
    expect(uses.get(2)).toBe(1);
    expect(uses.get(3)).toBeUndefined();
  });
});

describe("restockTone", () => {
  it("warns only for parts used in more than three repairs", () => {
    expect(restockTone(1, 3)).toBe("ok");
    expect(restockTone(0, 3)).toBe("ok");
    expect(restockTone(1, 4)).toBe("low");
    expect(restockTone(0, 4)).toBe("empty");
    expect(restockTone(2, 9)).toBe("ok");
  });
});
