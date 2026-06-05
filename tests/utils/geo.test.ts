import { describe, it, expect } from "vitest";
import { haversineMeters, findNearestWithinRadius, normalizeLocationName } from "~/utils/geo";

describe("normalizeLocationName", () => {
  it("lowercases", () => {
    expect(normalizeLocationName("Migrol Bern")).toBe("migrol bern");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeLocationName("  Shell  ")).toBe("shell");
  });

  it("collapses internal whitespace", () => {
    expect(normalizeLocationName("Migrol   Bern\tWest")).toBe("migrol bern west");
  });

  it("treats two casings of the same name as equal", () => {
    expect(normalizeLocationName("BP TANKSTELLE")).toBe(normalizeLocationName("bp tankstelle"));
  });
});

describe("haversineMeters", () => {
  it("returns 0 for identical points", () => {
    expect(haversineMeters(47.041214, 9.432396, 47.041214, 9.432396)).toBe(0);
  });

  it("matches a known distance (Zurich HB ↔ Bern HB ≈ 95 km)", () => {
    const meters = haversineMeters(47.378177, 8.540192, 46.948832, 7.439136);
    expect(meters).toBeGreaterThan(94_000);
    expect(meters).toBeLessThan(97_000);
  });

  it("treats a ~100m offset as ~100m", () => {
    // 1° latitude ≈ 111_111 m, so 0.0009° ≈ 100 m.
    const meters = haversineMeters(47.0, 9.0, 47.0009, 9.0);
    expect(meters).toBeGreaterThan(90);
    expect(meters).toBeLessThan(110);
  });
});

describe("findNearestWithinRadius", () => {
  const target = { latitude: 47.0, longitude: 9.0 };

  it("returns null when the candidate list is empty", () => {
    expect(findNearestWithinRadius(target, [], 100)).toBeNull();
  });

  it("returns null when every candidate is outside the radius", () => {
    const candidates = [
      { id: 1, latitude: 47.01, longitude: 9.0 }, // ~1.1 km north
      { id: 2, latitude: 47.0, longitude: 9.01 }, // ~750 m east
    ];
    expect(findNearestWithinRadius(target, candidates, 100)).toBeNull();
  });

  it("returns the nearest candidate when multiple are within the radius", () => {
    const candidates = [
      { id: "far",   latitude: 47.0008, longitude: 9.0 }, // ~89 m
      { id: "near",  latitude: 47.0003, longitude: 9.0 }, // ~33 m
      { id: "outer", latitude: 47.001,  longitude: 9.0 }, // ~111 m (out)
    ];
    expect(findNearestWithinRadius(target, candidates, 100)?.id).toBe("near");
  });

  it("ignores candidates with null coordinates", () => {
    const candidates = [
      { id: 1, latitude: null, longitude: null },
      { id: 2, latitude: 47.0003, longitude: 9.0 },
    ];
    expect(findNearestWithinRadius(target, candidates, 100)?.id).toBe(2);
  });

  it("includes a candidate exactly at the boundary", () => {
    // 0.0009° ≈ 100 m, so this point is right around the radius edge.
    const candidates = [{ id: 1, latitude: 47.0009, longitude: 9.0 }];
    expect(findNearestWithinRadius(target, candidates, 110)?.id).toBe(1);
  });
});
