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
 * Returns the backend URL from the environment.
 * Defaults to http://localhost:3001 if not set.
 */
export function getBackendUrl(): string {
  const url = (typeof window !== "undefined" && (window as any).ENV?.BACKEND_URL) ??
              (typeof process !== "undefined" ? process.env.BACKEND_URL : null) ?? 
              "http://localhost:3001";
  
  // Strip trailing slash if present
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
