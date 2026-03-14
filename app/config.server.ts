export function isRegistrationEnabled(): boolean {
  const flag = process.env.ENABLE_REGISTRATION;

  if (flag === undefined) {
    return true;
  }

  const normalized = flag.trim().toLowerCase();

  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }

  return true;
}

export function getVersion(): string {
  return process.env.APP_VERSION ?? "0.0.0";
}

/**
 * Returns the backend URL from the environment.
 * Defaults to http://localhost:3001 if not set.
 */
export function getBackendUrl(): string {
  return process.env.BACKEND_URL ?? "http://localhost:3001";
}
