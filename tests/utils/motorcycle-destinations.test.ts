import { describe, expect, it } from "vitest";
import {
  BIKE_DESTINATIONS,
  bikeDestinationHref,
  filterBikeDestinations,
  parseBikeOpenAction,
  searchBikeCommands,
} from "~/utils/motorcycle-destinations";

const gs = { id: 1, make: "BMW", model: "R 1250 GS" };
const tenere = { id: 2, make: "Yamaha", model: "Ténéré 700" };
const bikes = [gs, tenere];

const destination = (id: string) => BIKE_DESTINATIONS.find((d) => d.id === id)!;

describe("bikeDestinationHref", () => {
  it("builds section, anchor and dialog links", () => {
    expect(bikeDestinationHref(gs, destination("overview"))).toBe("/motorcycle/bmw-r-1250-gs/1");
    expect(bikeDestinationHref(gs, destination("pressure"))).toBe(
      "/motorcycle/bmw-r-1250-gs/1/torque-specs#pressure-heading",
    );
    expect(bikeDestinationHref(gs, destination("edit"))).toBe("/motorcycle/bmw-r-1250-gs/1?open=edit");
  });
});

describe("parseBikeOpenAction", () => {
  it("accepts known dialogs only", () => {
    expect(parseBikeOpenAction("issue")).toBe("issue");
    expect(parseBikeOpenAction("delete")).toBeNull();
    expect(parseBikeOpenAction(null)).toBeNull();
  });

  it("covers every dialog destination", () => {
    for (const d of BIKE_DESTINATIONS.filter((entry) => entry.group === "Aktion")) {
      expect(parseBikeOpenAction(d.suffix.replace("?open=", ""))).not.toBeNull();
    }
  });
});

describe("searchBikeCommands", () => {
  it("lists bikes for an empty query", () => {
    expect(searchBikeCommands(bikes, "").map((r) => r.kind)).toEqual(["bike", "bike"]);
  });

  it("finds a bike's target directly", () => {
    const results = searchBikeCommands(bikes, "tenere teile");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ kind: "destination", bike: tenere, destination: { id: "parts" } });
  });

  it("finds a target on every bike", () => {
    const results = searchBikeCommands(bikes, "reifendruck");
    expect(results.map((r) => r.bike.id)).toEqual([1, 2]);
  });

  it("does not list all targets when the query is just a bike name", () => {
    expect(searchBikeCommands(bikes, "bmw")).toEqual([{ kind: "bike", bike: gs }]);
  });

  it("respects the result limit", () => {
    expect(searchBikeCommands(bikes, "e", 1)).toHaveLength(1);
  });
});

describe("filterBikeDestinations", () => {
  it("searches labels and aliases", () => {
    expect(filterBikeDestinations("einstellungen").map((d) => d.id)).toEqual(["edit"]);
    expect(filterBikeDestinations("")).toHaveLength(BIKE_DESTINATIONS.length);
  });
});
