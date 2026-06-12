/**
 * Tiny module-level TTL cache for client-side API requests.
 *
 * Stores the in-flight promise (not just the resolved value) so concurrent
 * callers within the same navigation tick share a single network request.
 * Rejected promises are evicted immediately so errors are never cached.
 */

type CacheEntry = {
  promise: Promise<unknown>;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

/**
 * Returns the cached promise for `key` if present and fresh, otherwise runs
 * `fetcher`, caches its promise for `ttlMs`, and returns it.
 */
export function cachedFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key);
  if (entry && entry.expiresAt > now) {
    return entry.promise as Promise<T>;
  }

  const promise = fetcher();
  cache.set(key, { promise, expiresAt: now + ttlMs });
  promise.catch(() => {
    // Evict only if this promise is still the cached one — a newer entry
    // written in the meantime must not be dropped.
    if (cache.get(key)?.promise === promise) {
      cache.delete(key);
    }
  });
  return promise;
}

/**
 * Removes the given keys from the cache.
 */
export function invalidate(...keys: string[]) {
  for (const key of keys) {
    cache.delete(key);
  }
}

/**
 * Removes every cache entry whose key starts with `prefix`.
 */
export function invalidatePrefix(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Clears the entire cache. Used on login/logout (user switch) and in tests.
 */
export function clearRequestCache() {
  cache.clear();
}
