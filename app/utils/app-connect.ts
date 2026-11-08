/**
 * Link that opens the iOS app with its login screen prefilled:
 * `motomanager://connect?server=<API base URL>&user=<username>`.
 * Carries no password or token — the user still signs in in the app.
 */
export function appConnectLink(backendUrl: string, username: string | null | undefined, origin?: string): string {
  // The app needs an absolute API URL; resolve a relative BACKEND_URL against the page.
  const absolute = origin ? new URL(backendUrl, origin).toString() : backendUrl;
  const server = absolute.replace(/\/+$/, "");
  const params = new URLSearchParams({ server });
  if (username) params.set("user", username);
  return `motomanager://connect?${params.toString()}`;
}
