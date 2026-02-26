/**
 * Simple client-side cache utility using the Cache API to store loader data.
 */
const DATA_CACHE_NAME = "moto-manager-data-v1";

export async function getCachedData<T>(request: Request, serverLoader: () => Promise<T>): Promise<T> {
  const cacheName = DATA_CACHE_NAME;
  const url = new URL(request.url);
  
  // React Router 7 Single Fetch suffix handling:
  // Strip .data from the end of the pathname for a stable cache key
  if (url.pathname.endsWith(".data")) {
    url.pathname = url.pathname.replace(/\.data$/, "");
  }
  
  // Remove search params that don't affect data (like version/hash) if any, 
  // but keep important ones like 'sort'.
  const cacheKey = url.toString();

  const cache = await caches.open(cacheName);

  // If online, fetch fresh data and update cache
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const data = await serverLoader();
      
      // If serverLoader returns a Response (it might in some RR7 configurations), 
      // check if it's ok. If not, throw to trigger cache fallback.
      if (data instanceof Response && !data.ok) {
        throw new Error(`Server returned ${data.status}`);
      }

      // Only cache if we got data
      if (data) {
        await cache.put(cacheKey, new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json" }
        }));
      }
      return data;
    } catch (error) {
      console.error("Server loader failed, trying cache:", error);
    }
  }

  // If offline or server failed, try to get from cache
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    return await cachedResponse.json() as T;
  }

  // If not in cache and we're offline, data is unavailable
  throw new Error("Diese Seite ist offline nicht verfügbar, da sie noch nicht zwischengespeichert wurde.");
}
