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

const SERVER_OVERRIDE_KEY = "moto_backend_url";

function trimSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

/**
 * The backend this deployment is configured for (runtime config), ignoring
 * any server the user picked on the login screen.
 */
export function getConfiguredBackendUrl(): string {
  const url = getEnv("BACKEND_URL");
  return url ? trimSlash(url) : "http://localhost:3001";
}

/** Server the user picked on the login screen, if any. */
export function getServerOverride(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(SERVER_OVERRIDE_KEY);
    return value ? trimSlash(value) : null;
  } catch {
    return null;
  }
}

/** Stores (or with `null` clears) the server picked on the login screen. */
export function setServerOverride(url: string | null): void {
  try {
    if (url) localStorage.setItem(SERVER_OVERRIDE_KEY, trimSlash(url));
    else localStorage.removeItem(SERVER_OVERRIDE_KEY);
  } catch {
    // Storage blocked (private mode): the configured server stays in use.
  }
}

/**
 * Returns the backend URL the SPA calls directly: the server picked on the
 * login screen, otherwise the configured one.
 */
export function getBackendUrl(): string {
  return getServerOverride() ?? getConfiguredBackendUrl();
}
