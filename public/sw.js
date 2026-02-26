const CACHE_NAME = "moto-manager-v1";

// assets to cache initially (optional, we'll mostly use dynamic caching)
const INITIAL_ASSETS = ["/", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(INITIAL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ).then(() => self.clients.claim())
    )
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests and same-origin or known external assets (fonts)
  if (request.method !== "GET") return;

  // Don't cache API calls or Auth routes in the SW (we'll handle data in clientLoaders)
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth")) return;

  // Stale-while-revalidate strategy for shell assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        // Only cache successful responses
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // If fetch fails and no cache, we're truly offline and haven't visited this yet
        if (cachedResponse) {
          return cachedResponse;
        }

        // Provide a clear offline fallback response instead of returning undefined
        return new Response("You are offline and this resource is not cached.", {
          status: 503,
          statusText: "Service Unavailable",
        });
      });

      return cachedResponse || fetchPromise;
    })
  );
});
