import { redirect } from "react-router";
import { getBackendUrl } from "~/config";

/**
 * Utility to fetch from the backend with Bearer token authentication.
 */
export async function fetchFromBackend<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const safePath = typeof path === "string" ? (path.startsWith("/") ? path : `/${path}`) : "/";
  const url = `${getBackendUrl()}/api${safePath}`;

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

  const baseUrl = getBackendUrl();
  const normalizedPath = (path.startsWith("/") ? path : `/${path}`).replace(/^\/data/, "");

  return `${baseUrl}${normalizedPath}`;
}
