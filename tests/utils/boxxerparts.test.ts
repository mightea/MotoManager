import { describe, expect, it } from "vitest";
import { inferBoxxerpartsFitment } from "~/utils/boxxerparts";
import type { ModelSeries } from "~/types/parts";

const node = (id: number, name: string, parentId: number | null = null): ModelSeries => ({
  id,
  name,
  manufacturer: "BMW",
  parentId,
  typeCodes: null,
  frameRanges: null,
  userId: null,
  createdAt: "2026-07-01T00:00:00Z",
});

// The global seed catalog (migrations 015/023), R families only.
const catalog: ModelSeries[] = [
  node(1, "R-Modelle /5 /6 /7 (1969-1984)"),
  node(2, "R-Modelle 2V (1978-1996)"),
  node(11, "R 50/5, R 60/5, R 75/5 (69-73)", 1),
  node(12, "R 60/6, R 75/6, R 90/6, R 90 S (73-76)", 1),
  node(13, "R 60/7, R 75/7, R 80/7, R 100/7-T-S-RS-RT (76-84)", 1),
  node(21, "R 80 G/S, R 80 ST (80-87)", 2),
  node(22, "R 65, R 65 RT, R 80, R 80 RT (85-95)", 2),
  node(23, "R 80 GS, R 100 GS, PD (90-95)", 2),
  node(24, "R 100 RS, R 100 RT (87-95)", 2),
  node(25, "R 80 R, R 100 R, Mystic (91-96)", 2),
  node(31, "K569 (K 75, K 75 C, K 75 S, K 75 RT)"),
];

describe("inferBoxxerpartsFitment", () => {
  it("maps the Paralever GS phrases of the valve and the brake line", () => {
    const valve = inferBoxxerpartsFitment(
      "Winkelventil 8,3 mm. für BMW R 100 / 80 GS R Kreuzspeichen Felgen",
      catalog,
    );
    expect(valve.seriesIds).toEqual([23]);
    expect(valve.matches).toEqual([{ phrase: "R 100 / 80 GS", names: ["R 80 GS, R 100 GS, PD (90-95)"] }]);

    const brakeLine = inferBoxxerpartsFitment(
      "Stahlflex Bremsleitung mit ABE für BMW R 100/80 GS, ab Sep 90 Für BMW R 2V Boxer Modelle R 80GS, R 80GS PD, R 100GS, R 100GS PD, R 80GS Basic ab 9/1990.",
      catalog,
    );
    // "R 2V Boxer" proposes the family; the GS Serie collapses into it.
    expect(brakeLine.seriesIds).toEqual([2]);
    expect(brakeLine.matches.map((m) => m.phrase)).toEqual(["R 2V", "R 100/80 GS"]);
  });

  it("includes the /5 /6 /7 family for 'R2V Boxer ab 69'", () => {
    const regulator = inferBoxxerpartsFitment(
      "Regler Wehrle für alle R2V Boxer ab 69 Regler passend für alle 2 V Boxer ab Baujahr 1969 vom Erstausrüster BMW 12321244409",
      catalog,
    );
    expect(regulator.seriesIds).toEqual([1, 2]);
    expect(regulator.matches[1]).toEqual({
      phrase: "R2V ab 69",
      names: ["R-Modelle /5 /6 /7 (1969-1984)"],
    });
  });

  it("expands the family and drops excluded models for 'Ausnahme: R 45 und R 65'", () => {
    const nut = inferBoxxerpartsFitment(
      "Auspuff Sternmutter für die 2V Boxer Für alle BMW 2 V 80/100 Modelle ab /7 Ausnahme: R 45 und R 65 Preis je Stück",
      catalog,
    );
    // Every 2V Serie except the one naming R 65, plus the /7 generation.
    expect(nut.seriesIds).toEqual([13, 21, 23, 24, 25]);
    expect(nut.matches.map((m) => m.phrase)).toEqual(["2V Boxer", "ab /7"]);
  });

  it("does not turn a bare '2V' hose into anything but the family", () => {
    const hose = inferBoxxerpartsFitment(
      "Benzinleitung Schnellverschluss für 6 mm Benzinleitung Schnellkupplung für 6 mm Benzinschlauch zum Bespiel für die BMW 2 V Boxer",
      catalog,
    );
    expect(hose.seriesIds).toEqual([2]);
    const generic = inferBoxxerpartsFitment("Neopren Kraftstoffschlauch 6.0mm. - 1m.", catalog);
    expect(generic.seriesIds).toEqual([]);
    expect(generic.matches).toEqual([]);
  });

  it("distinguishes R 80 G/S, R 100 R and R 100 RS, and reports missing catalog names", () => {
    expect(inferBoxxerpartsFitment("Kotflügel R 80 G/S", catalog).seriesIds).toEqual([21]);
    expect(inferBoxxerpartsFitment("Sitzbank R 100 R Mystic", catalog).seriesIds).toEqual([25]);
    expect(inferBoxxerpartsFitment("Verkleidung R 100 RS", catalog).seriesIds).toEqual([24]);
    expect(inferBoxxerpartsFitment("Blinker R 65", catalog).seriesIds).toEqual([22]);

    const k = inferBoxxerpartsFitment("Kupplung K 75 und K 100", catalog);
    expect(k.seriesIds).toEqual([31]);
    expect(k.unmatched).toEqual(["K589 (K 100, RS, RT, LT)"]);
  });
});
