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

/** Backstop poll for tracker readiness — see the loader effect below. */
const READY_POLL_INTERVAL_MS = 200;
const READY_POLL_TIMEOUT_MS = 10_000;

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

// The tracker script is injected async, so `window.umami` does not exist yet
// when the route tree's mount effects run — and child effects run before the
// provider's own. An `identify()` issued in that window used to be dropped on
// the floor, which meant a logged-in user who loaded the app directly (rather
// than passing through /auth/login) was never associated with their sessions.
// The call is therefore parked here and replayed once the tracker is live.
let pendingIdentify: { id: string; data?: UmamiEventData } | null = null;

/**
 * Replay a parked `identify()` once `window.umami` exists. Safe to call
 * repeatedly — the queue is cleared before dispatching, so a session can never
 * be identified twice.
 */
export function flushPendingIdentify(): void {
  if (pendingIdentify === null) return;
  if (typeof window === "undefined" || !window.umami) return;
  const { id, data } = pendingIdentify;
  pendingIdentify = null;
  window.umami.identify(id, data);
}

/**
 * Identify the current visitor. Umami scopes `identify()` to the *current*
 * session, so this has to land on every page load — not just once per user —
 * for all of a user's sessions to roll up under the same profile.
 *
 * Module-level twin of the context's `identifyUser`, so non-React callers get
 * the same queueing behaviour.
 */
export function identifyUser(uniqueId: string, data?: UmamiEventData): void {
  if (!IS_PROD) return;
  if (typeof window === "undefined") return;
  if (window.umami) {
    window.umami.identify(uniqueId, data);
    return;
  }
  // Last call wins: the identity is a snapshot of the logged-in user, so a
  // newer one always supersedes whatever is parked.
  pendingIdentify = { id: uniqueId, data };
}

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

  // 1. Inject the umami tracker script once per page load, and replay any
  //    `identify()` that was issued before the tracker finished loading.
  useEffect(() => {
    if (!IS_PROD) return;
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (window.umami) {
      flushPendingIdentify();
      return;
    }

    const scriptUrl = getUmamiScriptUrl();
    const websiteId = getUmamiWebsiteId();
    if (!scriptUrl || !websiteId) return;

    const existing = document.head.querySelector<HTMLScriptElement>(
      `script[${LOADER_MARKER}]`,
    );

    // A StrictMode remount (or HMR) can find the script already in flight. Still
    // attach a load listener to it, otherwise the parked identify never fires.
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", flushPendingIdentify, { once: true });

    // `load` is missed if the script resolved between the window.umami check
    // above and the listener being attached, so poll briefly as a backstop.
    // Cleared as soon as the tracker appears, and bounded so a blocked or
    // ad-blocked script cannot leave a timer running for the whole session.
    let elapsed = 0;
    const poll = window.setInterval(() => {
      elapsed += READY_POLL_INTERVAL_MS;
      if (window.umami) {
        flushPendingIdentify();
        window.clearInterval(poll);
      } else if (elapsed >= READY_POLL_TIMEOUT_MS) {
        window.clearInterval(poll);
      }
    }, READY_POLL_INTERVAL_MS);

    if (existing === null) {
      // Auto-track stays enabled (the default): the tracker handles the initial
      // pageview, SPA route changes (it hooks history.pushState/replaceState and
      // observes document.title), and — only when auto-track is on — initializes
      // the Core Web Vitals observers that data-performance enables.
      script.async = true;
      script.defer = true;
      script.src = scriptUrl;
      script.dataset.websiteId = websiteId;
      script.dataset.performance = "true";
      script.setAttribute(LOADER_MARKER, "");
      document.head.appendChild(script);
    }

    return () => {
      script.removeEventListener("load", flushPendingIdentify);
      window.clearInterval(poll);
    };
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
      identifyUser,
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
