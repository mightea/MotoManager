/**
 * Returns true if user registration is enabled.
 */
export function isRegistrationEnabled(): boolean {
  // Check runtime ENV first, then baked-in process.env
  const flag = (typeof window !== "undefined" && (window as any).ENV?.ENABLE_REGISTRATION) ?? 
               (typeof process !== "undefined" ? process.env.ENABLE_REGISTRATION : undefined);

  if (flag === undefined || flag === null) {
    return true;
  }

  const normalized = String(flag).trim().toLowerCase();

  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }

  return true;
}

/**
 * Returns the application version.
 */
export function getVersion(): string {
  return (typeof window !== "undefined" && (window as any).ENV?.APP_VERSION) ??
         (typeof process !== "undefined" ? process.env.APP_VERSION : null) ?? 
         "0.0.0";
}

/**
 * Returns the public backend URL for browser access.
 */
export function getPublicBackendUrl(): string {
  // 1. Check runtime browser ENV
  if (typeof window !== "undefined" && (window as any).ENV?.BACKEND_URL) {
    const url = (window as any).ENV.BACKEND_URL;
    return url.endsWith("/") ? url.slice(0, -1) : url;
  }

  // 2. Check server-side process.env (use public BACKEND_URL)
  if (typeof process !== "undefined" && process.env.BACKEND_URL) {
    const url = process.env.BACKEND_URL;
    return url.endsWith("/") ? url.slice(0, -1) : url;
  }

  return "http://localhost:3001";
}

/**
 * Returns the backend URL from the environment.
 * Defaults to http://localhost:3001 if not set.
 */
export function getBackendUrl(): string {
  // 1. Check runtime browser ENV
  if (typeof window !== "undefined" && (window as any).ENV?.BACKEND_URL) {
    const url = (window as any).ENV.BACKEND_URL;
    return url.endsWith("/") ? url.slice(0, -1) : url;
  }

  // 2. Check server-side process.env
  // If we are on the server, we prefer the internal Docker network name if provided
  // otherwise we use the public BACKEND_URL.
  if (typeof process !== "undefined") {
    const internalUrl = process.env.INTERNAL_BACKEND_URL || process.env.BACKEND_URL;
    if (internalUrl) {
      return internalUrl.endsWith("/") ? internalUrl.slice(0, -1) : internalUrl;
    }
  }

  return "http://localhost:3001";
}
