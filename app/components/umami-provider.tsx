import React, { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router";
import { getUmamiScriptUrl, getUmamiWebsiteId } from "~/config";

interface UmamiContextProps {
  /**
   * Track a custom event with optional data.
   * Only tracks in production environment.
   */
  trackEvent: (name: string, data?: Record<string, any>) => void;
  /**
   * Identify a user session.
   * Only tracks in production environment.
   */
  identifyUser: (data: Record<string, any>) => void;
}

const UmamiContext = createContext<UmamiContextProps | undefined>(undefined);

const IS_PROD = process.env.NODE_ENV === "production";
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
  // Whether we've already fired the initial pageview. Used to prevent
  // double-counting the first page when both the script onload handler
  // and the route-change effect race after the SDK arrives.
  const initialTrackedRef = useRef(false);

  // 1. Inject the umami tracker script once per page load.
  useEffect(() => {
    if (!IS_PROD) return;
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (window.umami) return;

    const scriptUrl = getUmamiScriptUrl();
    const websiteId = getUmamiWebsiteId();
    if (!scriptUrl || !websiteId) return;

    if (document.head.querySelector(`script[${LOADER_MARKER}]`)) return;

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.src = scriptUrl;
    script.dataset.websiteId = websiteId;
    script.dataset.autoTrack = "false";
    script.dataset.performance = "true";
    script.setAttribute(LOADER_MARKER, "");
    script.addEventListener("load", () => {
      // If the route-change effect (below) already tracked the initial
      // page while the SDK was loading, don't track it again.
      if (initialTrackedRef.current) return;
      initialTrackedRef.current = true;
      window.umami?.track();
    });
    document.head.appendChild(script);
  }, []);

  // 2. Track on every route change. Also picks up the initial pageview
  //    if the SDK is ready in time.
  useEffect(() => {
    if (!IS_PROD) return;
    // Small delay so React Router has updated document.title before umami
    // snapshots the page metadata.
    const timer = setTimeout(() => {
      if (window.umami) {
        initialTrackedRef.current = true;
        window.umami.track();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  // 3. Memoized Context Value
  const value = useMemo(
    () => ({
      trackEvent: (name: string, data?: Record<string, any>) => {
        if (IS_PROD && window.umami) {
          window.umami.track(name, data);
        }
      },
      identifyUser: (data: Record<string, any>) => {
        if (IS_PROD && window.umami) {
          window.umami.identify(data);
        }
      },
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
