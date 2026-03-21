import { useSyncExternalStore } from "react";

/**
 * Returns the current offline status.
 */
export function getIsOffline(): boolean {
  if (typeof navigator === "undefined") return false;
  return !navigator.onLine;
}

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  
  const handleStatusChange = () => callback();
  
  window.addEventListener("online", handleStatusChange);
  window.addEventListener("offline", handleStatusChange);
  
  listeners.add(callback);
  
  return () => {
    window.removeEventListener("online", handleStatusChange);
    window.removeEventListener("offline", handleStatusChange);
    listeners.delete(callback);
  };
}

/**
 * A reactive hook that returns the current offline status.
 * Uses useSyncExternalStore for optimal performance and consistency.
 */
export function useIsOffline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => getIsOffline(),
    () => false // Server-side default
  );
}
