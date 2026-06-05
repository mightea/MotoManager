const EARTH_RADIUS_METERS = 6_371_000;

const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

interface GeoPoint {
  latitude: number | null;
  longitude: number | null;
}

export function normalizeLocationName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function findNearestWithinRadius<T extends GeoPoint>(
  target: { latitude: number; longitude: number },
  candidates: readonly T[],
  maxMeters: number,
): T | null {
  let best: T | null = null;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    if (candidate.latitude === null || candidate.longitude === null) continue;
    const distance = haversineMeters(
      target.latitude,
      target.longitude,
      candidate.latitude,
      candidate.longitude,
    );
    if (distance <= maxMeters && distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}
