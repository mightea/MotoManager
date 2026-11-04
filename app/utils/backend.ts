import { redirect } from "react-router";
import { getBackendUrl } from "~/config";
import { clearSessionToken, consumeStashedAdminToken, getSessionToken } from "~/services/auth";

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
    // An expired impersonation session falls back to the stashed admin token
    // instead of logging the admin out entirely.
    if (consumeStashedAdminToken()) {
      throw redirect("/settings/admin");
    }
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
 * Content types that may be opened in a new tab via a `blob:` URL. A blob URL
 * shares the webapp's origin, so anything that can run script (HTML, SVG, XML,
 * …) must never be navigated to — only downloaded.
 */
const INLINE_SAFE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
]);

/**
 * Fetch a file from the auth-gated file routes (/documents, /previews) with
 * the session token in the Authorization header. The token never goes into a
 * URL, where it would leak into logs, history and Referer headers.
 */
export async function fetchAuthenticatedAsset(path: string | null | undefined): Promise<Blob> {
  const url = getBackendAssetUrl(path);
  if (!url) throw new Error("Keine Datei vorhanden");

  const token = getSessionToken();
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error(`Datei konnte nicht geladen werden (${response.status})`);
  }
  return response.blob();
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(new Blob([blob], { type: "application/octet-stream" }));
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Open an auth-gated document in a new tab. Must be called from a click
 * handler: the tab is opened synchronously (so popup blockers allow it) and
 * pointed at the fetched file once it arrives. Types that aren't known to be
 * inert are downloaded instead of rendered.
 */
export async function openAuthenticatedAsset(path: string | null | undefined): Promise<void> {
  const tab = window.open("", "_blank");
  if (tab) tab.opener = null;
  try {
    const blob = await fetchAuthenticatedAsset(path);
    const type = blob.type.split(";")[0].trim().toLowerCase();
    if (tab && INLINE_SAFE_TYPES.has(type)) {
      const url = URL.createObjectURL(new Blob([blob], { type }));
      tab.location.href = url;
      // Give the tab time to load before releasing the blob.
      setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
    } else {
      tab?.close();
      downloadBlob(blob, path?.split("/").pop() || "dokument");
    }
  } catch (error) {
    tab?.close();
    throw error;
  }
}
