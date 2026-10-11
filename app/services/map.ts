import { fetchFromBackend } from "~/utils/backend";
import { createDetailedReverseGeocoder } from "~/utils/reverse-geocode";
import type { MapPayload } from "~/types/map";

/** The server-side trip analysis (see `~/types/map`). Not cached: it's one call per visit. */
export async function getMapData(token: string): Promise<MapPayload> {
  return fetchFromBackend<MapPayload>("/map", {}, token);
}

/**
 * Looks up the country of a coordinate pair via Nominatim. Returns `undefined`
 * (not `null`) when nothing can be looked up so callers can leave the stored
 * country untouched instead of wiping it.
 */
export async function resolveCountryCode(
  latitude: number | null,
  longitude: number | null,
): Promise<string | undefined> {
  if (latitude === null || longitude === null) return undefined;
  try {
    const geocode = createDetailedReverseGeocoder();
    const result = await geocode(latitude, longitude);
    return result?.countryCode ?? undefined;
  } catch {
    return undefined;
  }
}
