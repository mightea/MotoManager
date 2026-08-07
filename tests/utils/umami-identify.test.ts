import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { UmamiEventData, UmamiTracker } from "~/types/umami";

// Unlike umami-perf.test.ts, these tests need the *production* path: the whole
// point is what happens when the tracker is missing at identify() time. IS_PROD
// is computed once at module load from NODE_ENV, so NODE_ENV is stubbed and the
// module re-imported per test to pick it up.
const testGlobal = globalThis as typeof globalThis & {
  window: { umami?: UmamiTracker };
};

async function loadProdModule() {
  vi.stubEnv("NODE_ENV", "production");
  vi.resetModules();
  return import("~/components/umami-provider");
}

describe("identifyUser", () => {
  let identify: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    identify = vi.fn();
    testGlobal.window = testGlobal.window ?? ({} as typeof testGlobal.window);
    delete testGlobal.window.umami;
  });

  afterEach(() => {
    delete testGlobal.window.umami;
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  function attachTracker() {
    testGlobal.window.umami = {
      track: vi.fn(),
      identify,
    } as unknown as UmamiTracker;
  }

  it("calls window.umami.identify directly when the tracker is already loaded", async () => {
    attachTracker();
    const { identifyUser } = await loadProdModule();

    identifyUser("tobias", { role: "admin" });

    expect(identify).toHaveBeenCalledWith("tobias", { role: "admin" });
  });

  it("does not throw when the tracker is missing", async () => {
    const { identifyUser } = await loadProdModule();

    expect(() => identifyUser("tobias")).not.toThrow();
    expect(identify).not.toHaveBeenCalled();
  });

  // The regression this whole change is about: the tracker script is injected
  // async, so the route tree's identify() lands before window.umami exists. It
  // used to be dropped, leaving direct page loads unattributed.
  it("replays an identify issued before the tracker finished loading", async () => {
    const { identifyUser, flushPendingIdentify } = await loadProdModule();

    identifyUser("tobias", { role: "admin" });
    expect(identify).not.toHaveBeenCalled();

    attachTracker();
    flushPendingIdentify();

    expect(identify).toHaveBeenCalledTimes(1);
    expect(identify).toHaveBeenCalledWith("tobias", { role: "admin" });
  });

  it("replays only once, so a later flush cannot double-count the session", async () => {
    const { identifyUser, flushPendingIdentify } = await loadProdModule();

    identifyUser("tobias");
    attachTracker();
    flushPendingIdentify();
    flushPendingIdentify();

    expect(identify).toHaveBeenCalledTimes(1);
  });

  it("keeps the newest identity when several are queued", async () => {
    const { identifyUser, flushPendingIdentify } = await loadProdModule();

    identifyUser("old-user");
    identifyUser("current-user", { role: "user" } satisfies UmamiEventData);
    attachTracker();
    flushPendingIdentify();

    expect(identify).toHaveBeenCalledTimes(1);
    expect(identify).toHaveBeenCalledWith("current-user", { role: "user" });
  });

  it("stays silent outside production even with a tracker present", async () => {
    attachTracker();
    vi.resetModules();
    const { identifyUser } = await import("~/components/umami-provider");

    identifyUser("tobias");

    expect(identify).not.toHaveBeenCalled();
  });
});
