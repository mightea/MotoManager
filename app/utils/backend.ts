import { redirect } from "react-router";
import { getBackendUrl, getPublicBackendUrl } from "~/config";

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

  const url = `${baseUrl}/api${safePath}`;

  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

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

  return await response.json() as T;
}

/**
 * Returns the full URL for an asset served by the backend.
 */
export function getBackendAssetUrl(path: string | null | undefined): string | null {
  if (typeof path !== "string" || path.trim() === "") return null;
  if (path.startsWith("http")) return path;

  const baseUrl = getPublicBackendUrl();
  const normalizedPath = (path.startsWith("/") ? path : `/${path}`).replace(/^\/data/, "");

  return `${baseUrl}${normalizedPath}`;
}
