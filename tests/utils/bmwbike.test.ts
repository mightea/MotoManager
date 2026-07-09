import { describe, expect, it } from "vitest";
import { mapCompatibility, parseBmwbikeSlug } from "~/utils/bmwbike";
import type { ModelSeries } from "~/types/parts";

const node = (
  id: number,
  name: string,
  parentId: number | null = null,
): ModelSeries => ({
  id,
  name,
  manufacturer: "BMW",
  parentId,
  typeCodes: null,
  frameRanges: null,
  userId: null,
  createdAt: "2026-07-01T00:00:00Z",
});

describe("parseBmwbikeSlug", () => {
  it("extracts the slug from part URLs in any locale", () => {
    expect(
      parseBmwbikeSlug(
        "https://bmwbike.com/de/part/gummitulle-zur-drehzahlmesserwelle-r50-5-r100rt-62121351554",
      ),
    ).toBe("gummitulle-zur-drehzahlmesserwelle-r50-5-r100rt-62121351554");
    expect(parseBmwbikeSlug("https://bmwbike.com/en/part/some-part-123/")).toBe("some-part-123");
    expect(parseBmwbikeSlug("https://www.bmwbike.com/fr/part/abc-1")).toBe("abc-1");
  });

  it("accepts a bare slug", () => {
    expect(parseBmwbikeSlug("  some-part-123 ")).toBe("some-part-123");
  });

  it("rejects foreign hosts and non-part URLs", () => {
    expect(parseBmwbikeSlug("https://evil.com/de/part/abc-1")).toBeNull();
    expect(parseBmwbikeSlug("https://bmwbike.com/de/bikes")).toBeNull();
    expect(parseBmwbikeSlug("")).toBeNull();
    expect(parseBmwbikeSlug("not a url at all!")).toBeNull();
  });
});

describe("mapCompatibility", () => {
  const familie = node(1, "R-Boxer");
  const serie = node(2, "R50/5-R90S 69-76", 1);
  const m1 = node(3, "R50/5 (ECE, 08/1969-07/1973)", 2);
  const m2 = node(4, "R60/5 (ECE, 08/1969-07/1973)", 2);
  const m3 = node(5, "R75/5 (ECE, 08/1969-07/1980)", 2);
  const otherSerie = node(6, "K569 (K 75, K 75 c, K 75 s, K 75 RT)", 1);
  const k1 = node(7, "K 75 S (0563,0572) (ECE, 10/1985-05/1995)", 6);
  const catalog = [familie, serie, m1, m2, m3, otherSerie, k1];

  it("maps names to ids and reports unmatched entries", () => {
    const result = mapCompatibility(
      ["R50/5 (ECE, 08/1969-07/1973)", "R90S (USA, 01/1974-07/1974)"],
      catalog,
    );
    expect(result.seriesIds).toEqual([3]);
    expect(result.unmatched).toEqual(["R90S (USA, 01/1974-07/1974)"]);
  });

  it("collapses a fully matched Serie into the Serie itself", () => {
    const result = mapCompatibility(
      [
        "R50/5 (ECE, 08/1969-07/1973)",
        "R60/5 (ECE, 08/1969-07/1973)",
        "R75/5 (ECE, 08/1969-07/1980)",
      ],
      catalog,
    );
    expect(result.seriesIds).toEqual([2]);
    expect(result.unmatched).toEqual([]);
  });

  it("deduplicates repeated names", () => {
    const result = mapCompatibility(
      ["R50/5 (ECE, 08/1969-07/1973)", "R50/5 (ECE, 08/1969-07/1973)"],
      catalog,
    );
    expect(result.seriesIds).toEqual([3]);
  });
});
