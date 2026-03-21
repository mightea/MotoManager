import { redirect } from "react-router";
import { getBackendUrl } from "~/config";
import { db, saveToCache, syncCache } from "./db.client";
import { getIsOffline } from "./offline";

/**
 * Utility to fetch from the backend with Bearer token authentication.
 */
export async function fetchFromBackend<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const isBrowser = typeof window !== "undefined";
  const baseUrl = isBrowser ? "" : getBackendUrl();
  const safePath = typeof path === "string" ? (path.startsWith("/") ? path : `/${path}`) : "/";
  
  // Use /api prefix for the backend
  const url = `${baseUrl}/api${safePath}`;

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
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = {};
      }
      const errorMessage = errorData.error || errorData.message || response.statusText || `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = await response.json() as T;

    // Cache specific GET responses for offline use
    if (options.method === 'GET' || !options.method) {
      await cacheResponse(path, data);
    }

    return data;
  } catch (error) {
    if (error instanceof Response) throw error;
    
    // Check if we can handle this POST offline
    const isOffline = getIsOffline();
    if (isOffline && options.method === "POST") {
      const body = options.body ? JSON.parse(options.body as string) : {};
      
      if (path.endsWith("/issues")) {
        const id = -(Date.now()); // Temporary negative ID
        const pendingIssue = { ...body, id, isPending: 1 };
        await saveToCache(db.issues, pendingIssue);
        return { issue: pendingIssue } as any;
      }
      
      if (path.endsWith("/maintenance")) {
        const id = -(Date.now()); // Temporary negative ID
        const pendingRecord = { ...body, id, isPending: 1 };
        await saveToCache(db.maintenance, pendingRecord);
        return { maintenanceRecord: pendingRecord } as any;
      }

      if (path.endsWith("/torque-specs")) {
        const id = -(Date.now()); // Temporary negative ID
        const pendingSpec = { ...body, id, isPending: 1 };
        await saveToCache(db.torqueSpecs, pendingSpec);
        return { torqueSpec: pendingSpec } as any;
      }
    }

    if (isOffline && options.method === "PUT") {
      const body = options.body ? JSON.parse(options.body as string) : {};
      const parts = path.split('/');
      const id = parseInt(parts[parts.length - 1], 10);

      if (path.includes("/torque-specs/")) {
        const pendingSpec = { ...body, id, isPending: 1 };
        await saveToCache(db.torqueSpecs, pendingSpec);
        return { torqueSpec: pendingSpec } as any;
      }
    }

    console.error(`[Backend Error] ${options.method || "GET"} ${url}:`, error);
    
    // Attempt to return from cache if network fails
    const cachedData = await getFromResponseCache<T>(path);
    if (cachedData) {
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
    if (path === '/auth/me') {
      if (data.user) await saveToCache(db.users, data.user);
    } else if (path === '/stats' || path === '/home') {
      if (data.motorcycles) await syncCache(db.motorcycles, data.motorcycles);
      if (data.issues) await syncCache(db.issues, data.issues);
      if (data.maintenance) await syncCache(db.maintenance, data.maintenance);
      if (data.locationHistory) await syncCache(db.locationHistory, data.locationHistory);
      if (data.locations) await syncCache(db.locations, data.locations);
      if (data.settings) await saveToCache(db.settings, data.settings);
    } else if (path.startsWith('/motorcycles/')) {
      const parts = path.split('/');
      if (parts.length === 3 && !isNaN(Number(parts[2]))) {
        // Motorcycle detail
        if (data.motorcycle) await saveToCache(db.motorcycles, data.motorcycle);
        if (data.issues) await syncCache(db.issues, data.issues);
        if (data.maintenanceRecords) await syncCache(db.maintenance, data.maintenanceRecords);
        if (data.torqueSpecs) await syncCache(db.torqueSpecs, data.torqueSpecs);
      }
    } else if (path === '/settings') {
      if (data.settings) await saveToCache(db.settings, data.settings);
    } else if (path === '/locations') {
      if (Array.isArray(data.locations)) await syncCache(db.locations, data.locations);
    } else if (path === '/currencies') {
      if (Array.isArray(data.currencies)) await syncCache(db.currencies, data.currencies);
    } else if (path === '/documents') {
      if (Array.isArray(data.docs)) await syncCache(db.documents, data.docs);
      if (Array.isArray(data.assignments)) await syncCache(db.docAssignments, data.assignments);
      if (Array.isArray(data.allMotorcycles)) await syncCache(db.motorcycles, data.allMotorcycles);
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
    if (path === '/auth/me') {
      const user = await db.users.toCollection().first();
      if (!user) return null;
      return { user } as any;
    } else if (path.startsWith('/motorcycles/')) {
      const parts = path.split('/');
      const id = parseInt(parts[2], 10);
      if (isNaN(id)) return null;

      const [motorcycle, issues, maintenanceRecords, torqueSpecs] = await Promise.all([
        db.motorcycles.get(id),
        db.issues.where('motorcycleId').equals(id).toArray(),
        db.maintenance.where('motorcycleId').equals(id).toArray(),
        db.torqueSpecs.where('motorcycleId').equals(id).toArray(),
      ]);

      if (!motorcycle) return null;

      return {
        motorcycle,
        issues,
        maintenanceRecords,
        torqueSpecs,
        previousOwners: [], // Not cached yet
      } as any;
    } else if (path === '/documents') {
      const [docs, assignments, allMotorcycles] = await Promise.all([
        db.documents.toArray(),
        db.docAssignments.toArray(),
        db.motorcycles.toArray(),
      ]);
      return { docs, assignments, allMotorcycles } as any;
    } else if (path === '/stats' || path === '/home') {
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
    } else if (path === '/settings') {
      const settings = await db.settings.toCollection().first();
      return { settings } as any;
    } else if (path === '/locations') {
      const locations = await db.locations.toArray();
      return { locations } as any;
    } else if (path === '/currencies') {
      const currencies = await db.currencies.toArray();
      return { currencies } as any;
    }
  } catch (e) {
    console.warn('Failed to get from cache:', e);
  }

  return null;
}

/**
 * Returns the full URL for an asset served by the backend.
 */
export function getBackendAssetUrl(path: string | null | undefined): string | null {
  if (typeof path !== "string" || path.trim() === "") return null;
  if (path.startsWith("http")) return path;
  
  const baseUrl = getBackendUrl();
  const normalizedPath = (path.startsWith("/") ? path : `/${path}`).replace(/^\/data/, "");
  return `${baseUrl}${normalizedPath}`;
}
