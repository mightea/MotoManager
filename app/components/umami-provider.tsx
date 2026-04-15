import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router';

interface UmamiContextProps {
  /**
   * Track a custom event with optional data.
   * Only tracks in production environment.
   */
  trackEvent: (name: string, data?: Record<string, any>) => void;
}

const UmamiContext = createContext<UmamiContextProps | undefined>(undefined);

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Provider component for Umami Analytics integration.
 * Handles automatic page-view tracking on route changes.
 *
 * @param children - React children to wrap
 */
export const UmamiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  // 1. Automatic Page View Tracking
  useEffect(() => {
    if (IS_PROD && window.umami) {
      // We wrap in a small timeout to ensure document.title is updated 
      // by React Router before tracking
      const timer = setTimeout(() => {
        window.umami?.track();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, location.search]);

  // 2. Memoized Event Tracker to prevent unnecessary re-renders in consumers
  const value = useMemo(() => ({
    trackEvent: (name: string, data?: Record<string, any>) => {
      if (IS_PROD && window.umami) {
        window.umami.track(name, data);
      } else if (!IS_PROD) {
        console.log(`[Umami Debug]: Event "${name}"`, data);
      }
    }
  }), []);

  return (
    <UmamiContext.Provider value={value}>
      {children}
    </UmamiContext.Provider>
  );
};

/**
 * Hook to access Umami event tracking capabilities.
 * Must be used within an UmamiProvider.
 */
export const useUmami = () => {
  const context = useContext(UmamiContext);
  if (!context) {
    throw new Error('useUmami must be used within an UmamiProvider');
  }
  return context;
};
