import { describe, expect, it } from "vitest";
import { matchesBikeName, normalizeSearchText } from "~/utils/motorcycle-search";

const gs = { make: "BMW", model: "R 1250 GS" };
const tenere = { make: "Yamaha", model: "Ténéré 700" };

describe("normalizeSearchText", () => {
  it("strips case, diacritics and punctuation", () => {
    expect(normalizeSearchText("  Ténéré-700! ")).toBe("tenere 700");
    expect(normalizeSearchText("Straße")).toBe("strasse");
  });
});

describe("matchesBikeName", () => {
  it("matches everything for an empty query", () => {
    expect(matchesBikeName(gs, "")).toBe(true);
    expect(matchesBikeName(gs, "  - ")).toBe(true);
  });

  it("ignores diacritics in either direction", () => {
    expect(matchesBikeName(tenere, "tenere")).toBe(true);
    expect(matchesBikeName({ make: "Yamaha", model: "Tenere" }, "ténéré")).toBe(true);
  });

  it("accepts tokens in any order across make and model", () => {
    expect(matchesBikeName(gs, "gs bmw")).toBe(true);
    expect(matchesBikeName(gs, "gs yamaha")).toBe(false);
  });

  it("treats spacing and punctuation in model names as equal", () => {
    for (const query of ["R1250", "r 1250", "R-1250"]) {
      expect(matchesBikeName(gs, query)).toBe(true);
    }
  });

  it("does not match a token across make and model", () => {
    expect(matchesBikeName(gs, "bmwr")).toBe(false);
  });
});
