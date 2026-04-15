/**
 * Safely access environment variables without them being baked in at build time.
 */
function getEnv(name: string): string | undefined {
  if (typeof window !== "undefined") {
    return (window as any).ENV?.[name];
  }
  if (typeof process !== "undefined") {
    // We use a dynamic lookup to prevent Vite from statically replacing the string
    return process.env[name];
  }
  return undefined;
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
 * Returns the public backend URL for browser access.
 */
export function getPublicBackendUrl(): string {
  const url = getEnv("BACKEND_URL");
  
  if (url) {
    return url.endsWith("/") ? url.slice(0, -1) : url;
  }

  return "http://localhost:3001";
}

/**
 * Returns the backend URL from the environment.
 * Defaults to http://localhost:3001 if not set.
 */
export function getBackendUrl(): string {
  // If we are on the server, we prefer the internal Docker network name if provided
  if (typeof window === "undefined" && typeof process !== "undefined") {
    const internalUrl = process.env.INTERNAL_BACKEND_URL;
    if (internalUrl) {
      return internalUrl.endsWith("/") ? internalUrl.slice(0, -1) : internalUrl;
    }
  }

  return getPublicBackendUrl();
}
