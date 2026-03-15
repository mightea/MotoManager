import { redirect } from "react-router";
import { getBackendUrl } from "~/config";
import { db, saveToCache } from "./db.client";

/**
 * Utility to fetch from the backend with Bearer token authentication.
 */
export async function fetchFromBackend<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const baseUrl = getBackendUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${baseUrl}/api${normalizedPath}`;

  console.log(`[Backend Request] ${options.method || "GET"} ${url}`);

  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      const { clearSessionToken } = await import("~/services/auth");
      clearSessionToken();
      throw redirect("/auth/login");
    }
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }
      throw new Error(errorData.message || `Backend request failed with status ${response.status}`);
    }

    const data = await response.json() as T;

    // Cache specific GET responses for offline use
    if (options.method === 'GET' || !options.method) {
      await cacheResponse(path, data);
    }

    return data;
  } catch (error) {
    // If it's a redirect, re-throw it
    if (error instanceof Response && error.status === 302) {
      throw error;
    }
    
    // Attempt to return from cache if network fails
    const cachedData = await getFromResponseCache<T>(path);
    if (cachedData) {
      console.log(`[Offline] Using cached data for ${path}:`, JSON.stringify(cachedData, null, 2));
      return cachedData;
    }

    throw error;
  }
}

/**
 * Caches specific API responses in IndexedDB.
 */
async function cacheResponse(path: string, data: any) {
  if (typeof window === 'undefined') return;

  try {
    if (path === '/stats') {
      if (data.motorcycles) await saveToCache(db.motorcycles, data.motorcycles);
      if (data.issues) await saveToCache(db.issues, data.issues);
      if (data.maintenance) await saveToCache(db.maintenance, data.maintenance);
      if (data.locationHistory) await saveToCache(db.locationHistory, data.locationHistory);
      if (data.locations) await saveToCache(db.locations, data.locations);
      if (data.settings) await saveToCache(db.settings, data.settings);
    } else if (path.startsWith('/motorcycles/')) {
      const parts = path.split('/');
      if (parts.length === 3 && !isNaN(Number(parts[2]))) {
        // Motorcycle detail
        if (data.motorcycle) await saveToCache(db.motorcycles, data.motorcycle);
        if (data.issues) await saveToCache(db.issues, data.issues);
        if (data.maintenanceRecords) await saveToCache(db.maintenance, data.maintenanceRecords);
      }
    } else if (path === '/locations') {
      if (Array.isArray(data.locations)) await saveToCache(db.locations, data.locations);
    } else if (path === '/currencies') {
      if (Array.isArray(data.currencies)) await saveToCache(db.currencies, data.currencies);
    } else if (path === '/documents') {
      if (Array.isArray(data.docs)) await saveToCache(db.documents, data.docs);
      if (Array.isArray(data.assignments)) await saveToCache(db.docAssignments, data.assignments);
    }
  } catch (e) {
    console.warn('Failed to cache response:', e);
  }
}

/**
 * Attempts to retrieve data from local cache based on API path.
 */
async function getFromResponseCache<T>(path: string): Promise<T | null> {
  if (typeof window === 'undefined') return null;

  try {
    if (path === '/stats') {
      const [motorcycles, issues, maintenance, locationHistory, locations, settings] = await Promise.all([
        db.motorcycles.toArray(),
        db.issues.toArray(),
        db.maintenance.toArray(),
        db.locationHistory.toArray(),
        db.locations.toArray(),
        db.settings.limit(1).first(),
      ]);
      
      if (motorcycles.length === 0) return null;

      return {
        stats: {
          users: 1, // Dummy for offline
          motorcycles: motorcycles.length,
          documents: 0,
        },
        motorcycles,
        issues,
        maintenance,
        locationHistory,
        locations,
        settings,
        version: 'offline',
      } as any;
    }
    
    // Add more path handlers as needed
  } catch (e) {
    console.warn('Failed to get from cache:', e);
  }

  return null;
}

/**
 * Returns the full URL for an asset served by the backend.
 */
export function getBackendAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  
  const baseUrl = getBackendUrl();
  const normalizedPath = (path.startsWith("/") ? path : `/${path}`).replace(/^\/data/, "");
  return `${baseUrl}${normalizedPath}`;
}
