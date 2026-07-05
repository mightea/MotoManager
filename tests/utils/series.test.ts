import { describe, expect, it } from "vitest";
import type { ModelSeries } from "~/types/parts";
import {
  compatibleSeriesIds,
  seriesDepth,
  seriesLevelLabel,
  seriesMatchesBike,
  seriesPath,
  seriesTree,
} from "~/utils/series";

const node = (id: number, name: string, parentId: number | null): ModelSeries => ({
  id,
  name,
  manufacturer: "BMW",
  parentId,
  typeCodes: null,
  userId: null,
  createdAt: "2026-01-01",
});

// Familie(1) -> Serie(2) -> Modell(3); Familie(1) -> Serie(4); Familie(5)
const catalog: ModelSeries[] = [
  node(1, "R-Modelle 2V", null),
  node(2, "R 80 GS, R 100 GS, PD (90-95)", 1),
  node(3, "R 100 GS (ECE, 04/1990-07/1996)", 2),
  node(4, "R 100 RS, R 100 RT (87-95)", 1),
  node(5, "K-Modelle 3-Zyl.", null),
];

describe("seriesDepth / seriesLevelLabel", () => {
  it("derives depth from the parent chain", () => {
    expect(seriesDepth(catalog[0], catalog)).toBe(0);
    expect(seriesDepth(catalog[1], catalog)).toBe(1);
    expect(seriesDepth(catalog[2], catalog)).toBe(2);
  });

  it("labels the three levels", () => {
    expect(seriesLevelLabel(0)).toBe("Familie");
    expect(seriesLevelLabel(1)).toBe("Serie");
    expect(seriesLevelLabel(2)).toBe("Modell");
  });
});

describe("seriesPath", () => {
  it("joins ancestor names", () => {
    expect(seriesPath(catalog[2], catalog)).toBe(
      "R-Modelle 2V › R 80 GS, R 100 GS, PD (90-95) › R 100 GS (ECE, 04/1990-07/1996)",
    );
  });
});

describe("seriesTree", () => {
  it("orders depth-first with children under parents", () => {
    const flattened = seriesTree(catalog).map(({ node, depth }) => `${depth}:${node.id}`);
    // Siblings sort lexically: "K-Modelle…" < "R-Modelle…", "R 100…" < "R 80…".
    expect(flattened).toEqual(["0:5", "0:1", "1:4", "1:2", "2:3"]);
  });

  it("surfaces orphans at root level instead of dropping them", () => {
    const withOrphan = [...catalog, node(9, "Verwaist", 999)];
    const ids = seriesTree(withOrphan).map(({ node }) => node.id);
    expect(ids).toContain(9);
  });
});

describe("compatibleSeriesIds / seriesMatchesBike", () => {
  it("includes ancestors and descendants of the bike's node", () => {
    // Bike on the Serie level: family above, model below, sibling series not.
    const compatible = compatibleSeriesIds(2, catalog);
    expect(compatible).toEqual(new Set([1, 2, 3]));
  });

  it("matches parts linked at any level of the chain", () => {
    expect(seriesMatchesBike([1], 2, catalog)).toBe(true); // Familie link
    expect(seriesMatchesBike([3], 2, catalog)).toBe(true); // Modell link
    expect(seriesMatchesBike([4], 2, catalog)).toBe(false); // sibling Serie
    expect(seriesMatchesBike([5], 2, catalog)).toBe(false); // other Familie
    expect(seriesMatchesBike([], 2, catalog)).toBe(false);
  });

  it("a bike on the Familie level matches everything below", () => {
    expect(seriesMatchesBike([3], 1, catalog)).toBe(true);
    expect(seriesMatchesBike([5], 1, catalog)).toBe(false);
  });
});
