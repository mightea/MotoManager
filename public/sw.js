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

  // Only handle GET requests
  if (request.method !== "GET") return;

  // 1. Data Requests (.data)
  // We ignore these in the SW because they are handled by clientLoaders 
  // using getCachedData in a separate 'moto-manager-data-v1' cache.
  // Letting them fail naturally offline allows the clientLoader to catch the error
  // and serve from its own cache.
  if (url.pathname.endsWith(".data")) return;

  // 2. API and Auth routes
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth")) return;

  // 3. Navigation Requests (HTML documents)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Cache successful document responses
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline navigation fallback
          const cache = await caches.open(CACHE_NAME);
          
          // Try specific page cache first
          const cachedResponse = await cache.match(request);
          if (cachedResponse) return cachedResponse;

          // Fallback to root index (App Shell)
          // This allows the SPA to hydrate and use its clientLoaders for data
          const rootResponse = await cache.match("/");
          if (rootResponse) return rootResponse;

          // Final fallback: browser's default or a custom offline page
          return new Response("Offline-Modus: Diese Seite ist nicht im Cache verfügbar.", {
            status: 503,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        })
    );
    return;
  }

  // 4. Shell Assets (JS, CSS, Fonts, Icons)
  // Stale-while-revalidate strategy
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        return cachedResponse || new Response("Asset not available offline", { status: 404 });
      });

      return cachedResponse || fetchPromise;
    })
  );
});
