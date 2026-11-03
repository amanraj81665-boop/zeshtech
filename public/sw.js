// ZESH-TECH Progressive Web App Service Worker
const CACHE_NAME = 'zeshtech-v7.5';
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/admin.html",
  "/css/style.css?v=7.2",
  "/js/phoneSpecsData.js?v=7.2",
  "/js/app.js?v=7.2",
  "/js/admin.js?v=7.2",
  "/js/api.js?v=7.2",
  "/images/logo.png",
  "/images/screenshots/desktop.png",
  "/images/screenshots/mobile.png",
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("PWA pre-cache warning:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // 1. API requests: always network only
  if (url.includes("/api/")) {
    return;
  }

  // 2. Images, fonts, stylesheets, scripts: Cache First (Instant 0ms display!) + Background Revalidate
  const isImageOrStatic = event.request.destination === "image" ||
                          url.includes("/images/") ||
                          url.includes("res.cloudinary.com") ||
                          url.match(/\.(jpg|jpeg|png|webp|svg|ico|css|js|woff2)$/i);

  if (isImageOrStatic) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // Background fetch to update cache for next load
        const networkFetch = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        }).catch(() => null);

        // If in cache, return immediately (0ms delay!)
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise wait for network fetch
        return networkFetch;
      })
    );
    return;
  }

  // 3. HTML Navigation requests: Network first with Cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((res) => res || caches.match("/index.html")))
  );
});
