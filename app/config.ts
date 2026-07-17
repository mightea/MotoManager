/**
 * Reads runtime config injected by /config.js into window.ENV.
 */
function getEnv(name: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as { ENV?: Record<string, string | undefined> }).ENV?.[name];
}

/**
 * Returns true if user registration is enabled.
 */
export function isRegistrationEnabled(): boolean {
  const flag = getEnv("ENABLE_REGISTRATION");

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
 * Returns the Umami Website ID.
 */
export function getUmamiWebsiteId(): string | undefined {
  return getEnv("UMAMI_WEBSITE_ID");
}

/**
 * Returns the Umami Script URL.
 */
export function getUmamiScriptUrl(): string | undefined {
  return getEnv("UMAMI_SCRIPT_URL");
}

/**
 * Returns the application version.
 */
export function getVersion(): string {
  return getEnv("APP_VERSION") ?? "0.0.0";
}

/**
 * Returns the backend URL the SPA calls directly.
 */
export function getBackendUrl(): string {
  const url = getEnv("BACKEND_URL");

  if (url) {
    return url.endsWith("/") ? url.slice(0, -1) : url;
  }

  return "http://localhost:3001";
}
