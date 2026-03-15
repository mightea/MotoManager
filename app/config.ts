/**
 * Returns true if user registration is enabled.
 */
export function isRegistrationEnabled(): boolean {
  // Use shimmed process.env from vite.config.ts
  const flag = typeof process !== "undefined" ? process.env.ENABLE_REGISTRATION : undefined;

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
  return (typeof process !== "undefined" ? process.env.APP_VERSION : null) ?? "0.0.0";
}

/**
 * Returns the backend URL from the environment.
 * Defaults to http://localhost:3001 if not set.
 */
export function getBackendUrl(): string {
  return (typeof process !== "undefined" ? process.env.BACKEND_URL : null) ?? "http://localhost:3001";
}
