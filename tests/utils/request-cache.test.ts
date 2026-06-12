import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cachedFetch,
  clearRequestCache,
  invalidate,
  invalidatePrefix,
} from "~/utils/request-cache";

describe("request-cache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearRequestCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the cached result within the TTL", async () => {
    const fetcher = vi.fn().mockResolvedValue("first");

    await expect(cachedFetch("key", 1000, fetcher)).resolves.toBe("first");
    await expect(cachedFetch("key", 1000, fetcher)).resolves.toBe("first");

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("refetches after the TTL expires", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce("first").mockResolvedValueOnce("second");

    await expect(cachedFetch("key", 1000, fetcher)).resolves.toBe("first");
    vi.advanceTimersByTime(1001);
    await expect(cachedFetch("key", 1000, fetcher)).resolves.toBe("second");

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("dedups concurrent callers onto one in-flight request", async () => {
    let resolveFetch: (value: string) => void = () => {};
    const fetcher = vi.fn(
      () => new Promise<string>((resolve) => { resolveFetch = resolve; }),
    );

    const first = cachedFetch("key", 1000, fetcher);
    const second = cachedFetch("key", 1000, fetcher);
    resolveFetch("shared");

    await expect(first).resolves.toBe("shared");
    await expect(second).resolves.toBe("shared");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not cache rejected promises", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce("ok");

    await expect(cachedFetch("key", 1000, fetcher)).rejects.toThrow("boom");
    await expect(cachedFetch("key", 1000, fetcher)).resolves.toBe("ok");

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("invalidates specific keys", async () => {
    const fetcher = vi.fn().mockResolvedValue("value");

    await cachedFetch("key", 1000, fetcher);
    invalidate("key");
    await cachedFetch("key", 1000, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("invalidates by prefix without touching other entries", async () => {
    const locations = vi.fn().mockResolvedValue("locations");
    const currencies = vi.fn().mockResolvedValue("currencies");

    await cachedFetch("locations:abc", 1000, locations);
    await cachedFetch("currencies", 1000, currencies);
    invalidatePrefix("locations:");
    await cachedFetch("locations:abc", 1000, locations);
    await cachedFetch("currencies", 1000, currencies);

    expect(locations).toHaveBeenCalledTimes(2);
    expect(currencies).toHaveBeenCalledTimes(1);
  });

  it("clears everything with clearRequestCache", async () => {
    const fetcher = vi.fn().mockResolvedValue("value");

    await cachedFetch("key", 1000, fetcher);
    clearRequestCache();
    await cachedFetch("key", 1000, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
