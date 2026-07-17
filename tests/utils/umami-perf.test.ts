import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startPerfMark, trackPerformance } from "~/components/umami-provider";
import type { UmamiTracker } from "~/types/umami";

// The node test environment has no `window`; the helpers guard on it, so the
// tests fake just the slice they touch.
const testGlobal = globalThis as typeof globalThis & {
  window: { umami?: UmamiTracker };
};

// IS_PROD inside umami-provider is computed once at module-load time from
// process.env.NODE_ENV. Vitest sets NODE_ENV=test, so the helpers will
// short-circuit before touching window.umami. That is the safest default —
// these tests just need to verify the no-op behavior and the timer mechanics.

describe("trackPerformance (non-production no-op)", () => {
  let umamiTrack: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    umamiTrack = vi.fn();
    testGlobal.window = testGlobal.window ?? ({} as typeof testGlobal.window);
    testGlobal.window.umami = {
      track: umamiTrack,
      identify: vi.fn(),
    } as unknown as UmamiTracker;
  });

  afterEach(() => {
    delete testGlobal.window.umami;
  });

  it("does not call window.umami.track outside production", () => {
    trackPerformance("noop", 42);
    expect(umamiTrack).not.toHaveBeenCalled();
  });

  it("startPerfMark also no-ops outside production", () => {
    const stop = startPerfMark("noop");
    stop();
    expect(umamiTrack).not.toHaveBeenCalled();
  });
});

describe("startPerfMark mechanics", () => {
  it("returns a callable stop function", () => {
    const stop = startPerfMark("first");
    expect(typeof stop).toBe("function");
    // Calling it should not throw even without window.umami present.
    expect(() => stop()).not.toThrow();
    expect(() => stop({ count: 3 })).not.toThrow();
  });

  it("does not throw when called repeatedly", () => {
    const stop = startPerfMark("repeat");
    stop();
    expect(() => stop()).not.toThrow();
  });
});
