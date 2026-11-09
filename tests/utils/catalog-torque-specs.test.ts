import { describe, expect, it } from "vitest";
import type { CatalogTorqueContribution, CatalogTorqueSpec } from "~/types/db";
import {
  formatShareDate,
  groupCatalogByCategory,
  ownContribution,
  torqueDuplicateKey,
} from "~/utils/catalog-torque-specs";

function spec(id: number, category: string, name: string, torque = 10): CatalogTorqueSpec {
  return {
    id,
    seriesId: 1,
    seriesName: "R 80 GS",
    seriesManufacturer: "BMW",
    userId: 1,
    contributorUsername: "alice",
    category,
    name,
    torque,
    torqueEnd: null,
    variation: null,
    toolSize: null,
    description: null,
    descriptionMarkup: null,
    unverified: false,
    createdAt: "2026-11-09T10:00:00.000Z",
  };
}

describe("torqueDuplicateKey", () => {
  it("ignores case and surrounding whitespace but not the torque", () => {
    expect(torqueDuplicateKey({ category: "Motor ", name: "Zylinderkopf", torque: 20 })).toBe(
      torqueDuplicateKey({ category: "motor", name: " ZYLINDERKOPF", torque: 20 }),
    );
    expect(torqueDuplicateKey({ category: "Motor", name: "Zylinderkopf", torque: 20 })).not.toBe(
      torqueDuplicateKey({ category: "Motor", name: "Zylinderkopf", torque: 21 }),
    );
  });
});

describe("groupCatalogByCategory", () => {
  it("sorts categories and names", () => {
    const groups = groupCatalogByCategory([
      spec(1, "Motor", "Zylinderkopf"),
      spec(2, "Fahrwerk", "Achsmutter"),
      spec(3, "Motor", "Ölablass"),
    ]);
    expect(groups.map((g) => g.category)).toEqual(["Fahrwerk", "Motor"]);
    expect(groups[1].specs.map((s) => s.name)).toEqual(["Ölablass", "Zylinderkopf"]);
  });
});

describe("ownContribution", () => {
  const base: CatalogTorqueContribution = {
    seriesId: 1,
    seriesName: "R 80 GS",
    seriesManufacturer: "BMW",
    userId: 1,
    contributorUsername: "alice",
    count: 3,
    sharedAt: "2026-11-09T10:00:00.000Z",
    isOwn: true,
  };

  it("matches only the caller's contribution on the exact node", () => {
    expect(ownContribution([base], 1)).toBe(base);
    expect(ownContribution([base], 2)).toBeNull();
    expect(ownContribution([{ ...base, isOwn: false }], 1)).toBeNull();
  });
});

describe("formatShareDate", () => {
  it("formats as dd.mm.yyyy", () => {
    expect(formatShareDate("2026-03-05T12:00:00.000Z")).toBe("05.03.2026");
    expect(formatShareDate("nonsense")).toBe("");
  });
});
