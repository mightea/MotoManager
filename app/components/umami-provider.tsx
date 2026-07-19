import React, { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigation } from "react-router";
import { getUmamiScriptUrl, getUmamiWebsiteId } from "~/config";
import type { UmamiEventData } from "~/types/umami";

/**
 * Stop function returned by {@link startPerfMark}. Call once to fire the
 * `perf.<name>` event with the elapsed time; the optional `data` argument is
 * merged into the Umami event payload alongside `duration_ms`.
 */
export type PerfMarkStop = (data?: UmamiEventData) => void;

interface UmamiContextProps {
  /**
   * Track a custom event with optional data.
   * Only tracks in production environment.
   */
  trackEvent: (name: string, data?: UmamiEventData) => void;
  /**
   * Identify a user session by a distinct ID (shown in the umami dashboard),
   * with optional session data attached.
   * Only tracks in production environment.
   */
  identifyUser: (uniqueId: string, data?: UmamiEventData) => void;
  /**
   * Fire a `perf.<name>` Umami event with an explicit duration in ms. Useful
   * when the duration is already known (e.g. from a server response).
   */
  trackPerformance: (
    name: string,
    durationMs: number,
    data?: UmamiEventData,
  ) => void;
  /**
   * Start a performance mark. Call the returned stop function once the work
   * is done to fire the matching `perf.<name>` event with the elapsed time.
   */
  startPerfMark: (name: string) => PerfMarkStop;
}

const UmamiContext = createContext<UmamiContextProps | undefined>(undefined);

const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Module-level escape hatch — usable outside React components (e.g. inside a
 * route's `clientAction` or any plain async function).
 */
export function trackPerformance(
  name: string,
  durationMs: number,
  data?: UmamiEventData,
): void {
  if (!IS_PROD) return;
  if (typeof window === "undefined" || !window.umami) return;
  window.umami.track(`perf.${name}`, {
    ...(data ?? {}),
    duration_ms: Math.round(durationMs),
  });
}

/**
 * Wall-clock-friendly timer. Captures the start time when called and returns
 * a stop function that emits a `perf.<name>` event when invoked. Safe to call
 * outside React (the action context) — Umami stays silent in non-production
 * or when the SDK hasn't loaded.
 */
export function startPerfMark(name: string): PerfMarkStop {
  const t0 =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  return (data) => {
    const now =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
    trackPerformance(name, now - t0, data);
  };
}
// Marker attribute used to keep the loader idempotent across StrictMode
// double-mounts, HMR, and back-forward navigations.
const LOADER_MARKER = "data-umami-loader";

/**
 * Provider component for Umami Analytics integration.
 *
 * Injects the umami tracker script at runtime using the runtime config
 * exposed on `window.ENV` (set by `/config.js`), then handles automatic
 * page-view tracking on route changes.
 *
 * The script tag used to live in `root.tsx` Layout, but was dropped
 * during the SSR → SPA refactor since the runtime config is no longer
 * available at server-render time. Doing it here keeps all umami
 * concerns in one file.
 */
export const UmamiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigation = useNavigation();
  // Captures the start of a non-idle navigation/submission so we can emit
  // a `perf.route_navigation` event once it settles.
  const transitionStartRef = useRef<{ start: number; path: string; kind: "loading" | "submitting" } | null>(null);

  // 1. Inject the umami tracker script once per page load.
  useEffect(() => {
    if (!IS_PROD) return;
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (window.umami) return;

    const scriptUrl = getUmamiScriptUrl();
    const websiteId = getUmamiWebsiteId();
    if (!scriptUrl || !websiteId) return;

    if (document.head.querySelector(`script[${LOADER_MARKER}]`)) return;

    // Auto-track stays enabled (the default): the tracker handles the initial
    // pageview, SPA route changes (it hooks history.pushState/replaceState and
    // observes document.title), and — only when auto-track is on — initializes
    // the Core Web Vitals observers that data-performance enables.
    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.src = scriptUrl;
    script.dataset.websiteId = websiteId;
    script.dataset.performance = "true";
    script.setAttribute(LOADER_MARKER, "");
    document.head.appendChild(script);
  }, []);

  // 2. Time every SPA route transition. The umami script's `data-performance`
  //     flag captures Core Web Vitals on the initial document load only;
  //     client-side navigations inside the SPA don't trigger it. This effect
  //     fills that gap by measuring from the moment React Router enters a
  //     non-idle state until it returns to "idle", then reports the elapsed
  //     time as a `perf.route_navigation` event.
  useEffect(() => {
    const state = navigation.state;
    if (state !== "idle") {
      if (transitionStartRef.current === null) {
        const path =
          navigation.location?.pathname ?? location.pathname ?? "/";
        transitionStartRef.current = {
          start:
            typeof performance !== "undefined" && typeof performance.now === "function"
              ? performance.now()
              : Date.now(),
          path,
          kind: state,
        };
      }
      return;
    }
    const pending = transitionStartRef.current;
    if (pending === null) return;
    transitionStartRef.current = null;
    const elapsed =
      (typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now()) - pending.start;
    trackPerformance("route_navigation", elapsed, {
      path: pending.path,
      kind: pending.kind,
    });
  }, [navigation.state, navigation.location, location.pathname]);

  // 3. Memoized Context Value
  const value = useMemo(
    () => ({
      trackEvent: (name: string, data?: UmamiEventData) => {
        if (IS_PROD && window.umami) {
          window.umami.track(name, data);
        }
      },
      identifyUser: (uniqueId: string, data?: UmamiEventData) => {
        if (IS_PROD && window.umami) {
          window.umami.identify(uniqueId, data);
        }
      },
      trackPerformance,
      startPerfMark,
    }),
    [],
  );

  return <UmamiContext.Provider value={value}>{children}</UmamiContext.Provider>;
};

/**
 * Hook to access Umami event tracking capabilities.
 * Must be used within an UmamiProvider.
 */
export const useUmami = () => {
  const context = useContext(UmamiContext);
  if (!context) {
    throw new Error("useUmami must be used within an UmamiProvider");
  }
  return context;
};
