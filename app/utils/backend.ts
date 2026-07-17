import { redirect } from "react-router";
import { getBackendUrl } from "~/config";
import { clearSessionToken, getSessionToken } from "~/services/auth";

/** Default per-request timeout so a hung backend fails fast instead of blocking a
 *  loader indefinitely. Callers can override by passing their own `signal`. */
const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * Typed error for non-OK backend responses. Carries the HTTP `status` so callers
 * can distinguish client (4xx) from server (5xx) failures. Network/timeout
 * failures surface as `status: 0`.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

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

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      // Respect a caller-supplied signal; otherwise apply a default timeout.
      signal: options.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
  } catch (error) {
    // Network failure or timeout (AbortSignal.timeout → TimeoutError).
    const isTimeout = error instanceof DOMException && error.name === "TimeoutError";
    throw new ApiError(
      isTimeout
        ? "Zeitüberschreitung – der Server hat nicht geantwortet."
        : "Netzwerkfehler – der Server ist nicht erreichbar.",
      0,
    );
  }

  if (response.status === 401) {
    clearSessionToken();
    throw redirect("/auth/login");
  }

  if (!response.ok) {
    let errorData: { error?: string; message?: string };
    try {
      errorData = await response.json();
    } catch {
      errorData = {};
    }
    const errorMessage = errorData.error || errorData.message || response.statusText || `Request failed with status ${response.status}`;
    throw new ApiError(errorMessage, response.status);
  }

  return await response.json() as T;
}

/**
 * Re-throw a thrown `redirect(...)` Response so callers that otherwise swallow
 * errors (e.g. `catch { return false }`) still honor the session-expiry redirect
 * to the login page. `fetchFromBackend` signals a 401 by throwing a `Response`.
 */
export function rethrowRedirect(error: unknown): void {
  if (error instanceof Response) {
    throw error;
  }
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

/**
 * Asset URL for the auth-gated file routes (/documents, /previews) with the
 * session token as a query parameter. Browser-initiated loads (`window.open`,
 * `<img src>`) can't carry an Authorization header, so these routes accept
 * `?token=` instead.
 */
export function getAuthenticatedAssetUrl(path: string | null | undefined): string | null {
  const assetUrl = getBackendAssetUrl(path);
  if (!assetUrl) return null;

  const token = getSessionToken();
  if (!token) return assetUrl;

  const url = new URL(assetUrl);
  url.searchParams.set("token", token);
  return url.toString();
}
