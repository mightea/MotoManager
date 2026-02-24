/**
 * Simple client-side cache utility using the Cache API to store loader data.
 */
export async function getCachedData<T>(request: Request, serverLoader: () => Promise<T>): Promise<T> {
  const cacheName = "moto-manager-data-v1";
  const url = new URL(request.url);
  // Remove search params that don't affect data (like version/hash) if any, 
  // but keep important ones like 'sort'.
  const cacheKey = url.pathname + url.search;

  const cache = await caches.open(cacheName);

  // If online, fetch fresh data and update cache
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const data = await serverLoader();
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

  // If not in cache and we're online, this might be the first visit
  // If we're offline and not in cache, let it fail naturally
  return await serverLoader();
}
