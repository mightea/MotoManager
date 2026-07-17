import { describe, it, expect, vi } from "vitest";
import { createReverseGeocoder } from "~/utils/reverse-geocode";

function makeFetch(response: unknown, status = 200) {
  return vi.fn(async () =>
    ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => response,
    }) as unknown as Response,
  );
}

describe("createReverseGeocoder", () => {
  it("returns the POI name when Nominatim provides one", async () => {
    const fetchImpl = makeFetch({ name: "Migrol Tankstelle" });
    const geocode = createReverseGeocoder({ fetchImpl, minIntervalMs: 0 });
    await expect(geocode(47.0, 9.0)).resolves.toBe("Migrol Tankstelle");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("falls back to address.fuel / amenity / road / city when name is missing", async () => {
    const fetchImpl = makeFetch({
      address: { fuel: "Shell Bahnhofstrasse" },
    });
    const geocode = createReverseGeocoder({ fetchImpl, minIntervalMs: 0 });
    await expect(geocode(47.0, 9.0)).resolves.toBe("Shell Bahnhofstrasse");
  });

  it("falls back to the first segment of display_name as a last resort", async () => {
    const fetchImpl = makeFetch({
      display_name: "Tankstelle Müller, Hauptstrasse 12, Bern",
    });
    const geocode = createReverseGeocoder({ fetchImpl, minIntervalMs: 0 });
    await expect(geocode(47.0, 9.0)).resolves.toBe("Tankstelle Müller");
  });

  it("returns null when Nominatim returns nothing usable", async () => {
    const fetchImpl = makeFetch({});
    const geocode = createReverseGeocoder({ fetchImpl, minIntervalMs: 0 });
    await expect(geocode(47.0, 9.0)).resolves.toBeNull();
  });

  it("returns null on HTTP failure", async () => {
    const fetchImpl = makeFetch({}, 503);
    const geocode = createReverseGeocoder({ fetchImpl, minIntervalMs: 0 });
    await expect(geocode(47.0, 9.0)).resolves.toBeNull();
  });

  it("returns null on network error", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    });
    const geocode = createReverseGeocoder({ fetchImpl, minIntervalMs: 0 });
    await expect(geocode(47.0, 9.0)).resolves.toBeNull();
  });

  it("caches by rounded coords so the same place hits Nominatim once", async () => {
    const fetchImpl = makeFetch({ name: "Cached Station" });
    const geocode = createReverseGeocoder({ fetchImpl, minIntervalMs: 0 });
    const [a, b, c] = await Promise.all([
      geocode(47.123456, 9.654321),
      geocode(47.123456, 9.654321),
      geocode(47.123459, 9.654323), // rounds to same 5dp key
    ]);
    expect(a).toBe("Cached Station");
    expect(b).toBe("Cached Station");
    expect(c).toBe("Cached Station");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("throttles consecutive distinct requests to respect Nominatim's rate limit", async () => {
    let virtualNow = 0;
    const now = () => virtualNow;
    const fetchImpl = vi.fn(async () => {
      virtualNow += 50; // each request itself takes 50ms
      return { ok: true, status: 200, json: async () => ({ name: "x" }) } as unknown as Response;
    });
    const geocode = createReverseGeocoder({ fetchImpl, minIntervalMs: 1000, now });
    // setTimeout still uses real time — keep it tiny so the test stays fast.
    // We assert the throttle ran by checking that the second call observed
    // a `now` reading at least minIntervalMs after the first.
    const callTimes: number[] = [];
    const origSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((cb: () => void, ms?: number) => {
      virtualNow += ms ?? 0;
      callTimes.push(ms ?? 0);
      return origSetTimeout(cb, 0);
    }) as unknown as typeof setTimeout);

    await geocode(47.0, 9.0);
    await geocode(47.1, 9.1);

    // The second call should have queued a wait of ~ (1000 - 50) ms.
    expect(callTimes.some((ms) => ms > 800)).toBe(true);
    vi.restoreAllMocks();
  });
});
