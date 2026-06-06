// Free reverse geocoding via OpenStreetMap Nominatim. No API key required;
// usage policy asks for ≤1 request/second and a contactable identity in the
// User-Agent. Browsers don't allow setting User-Agent, so we lean on the
// per-tab Referer and self-throttle aggressively to stay friendly.
//
// Reference: https://operations.osmfoundation.org/policies/nominatim/

const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const MIN_INTERVAL_MS = 1100;

export interface ReverseGeocoder {
  (latitude: number, longitude: number): Promise<string | null>;
}

interface NominatimAddress {
  fuel?: string;
  amenity?: string;
  shop?: string;
  road?: string;
  suburb?: string;
  village?: string;
  town?: string;
  city?: string;
  county?: string;
}

interface NominatimResponse {
  name?: string;
  display_name?: string;
  address?: NominatimAddress;
}

function pickName(data: NominatimResponse): string | null {
  if (typeof data.name === "string" && data.name.trim().length > 0) {
    return data.name.trim();
  }
  const a = data.address ?? {};
  const candidate =
    a.fuel ||
    a.amenity ||
    a.shop ||
    a.road ||
    a.suburb ||
    a.village ||
    a.town ||
    a.city ||
    a.county;
  if (typeof candidate === "string" && candidate.trim().length > 0) {
    return candidate.trim();
  }
  if (typeof data.display_name === "string") {
    const first = data.display_name.split(",")[0]?.trim();
    if (first && first.length > 0) return first;
  }
  return null;
}

async function callNominatim(
  latitude: number,
  longitude: number,
  fetchImpl: typeof fetch,
): Promise<string | null> {
  const url = `${NOMINATIM_REVERSE_URL}?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
  try {
    const res = await fetchImpl(url, { headers: { "Accept-Language": "de" } });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResponse;
    return pickName(data);
  } catch {
    return null;
  }
}

export interface ReverseGeocoderOptions {
  fetchImpl?: typeof fetch;
  /** Override the default 1.1s throttle (mostly for tests). */
  minIntervalMs?: number;
  /** Inject a clock for tests. */
  now?: () => number;
}

/**
 * Builds a reverse geocoder bound to a request-session-local cache + throttle.
 * Each callsite that needs reverse geocoding should create one, so cached
 * results and throttling are scoped to that single user action.
 */
export function createReverseGeocoder(opts: ReverseGeocoderOptions = {}): ReverseGeocoder {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const minIntervalMs = opts.minIntervalMs ?? MIN_INTERVAL_MS;
  const now = opts.now ?? Date.now;
  const cache = new Map<string, Promise<string | null>>();
  const key = (lat: number, lon: number) => `${lat.toFixed(5)},${lon.toFixed(5)}`;
  let chain: Promise<void> = Promise.resolve();
  let lastCallAt = 0;

  return (latitude, longitude) => {
    const k = key(latitude, longitude);
    const cached = cache.get(k);
    if (cached) return cached;

    const slot = chain.then(async () => {
      const wait = lastCallAt + minIntervalMs - now();
      if (wait > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, wait));
      }
      lastCallAt = now();
    });
    chain = slot.catch(() => undefined);

    const promise = slot.then(() => callNominatim(latitude, longitude, fetchImpl));
    cache.set(k, promise);
    return promise;
  };
}
