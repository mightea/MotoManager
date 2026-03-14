import { redirect } from "react-router";
import { getBackendUrl } from "~/config.server";

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

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    throw redirect("/auth/login", {
      headers: {
        "Set-Cookie": "mb_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
      }
    });
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

  return response.json() as Promise<T>;
}
