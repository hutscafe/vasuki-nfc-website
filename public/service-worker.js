const CACHE_NAME = "vasuki-v8";

const urlsToCache = [
  "/",
  "/index.html",
  "/collection.html",
  "/contact.html",
  "/design.html",
  "/products.html",
  "/assets/vasuki-premium-v5.css",
  "/assets/vasuki-experience-v6.css",
  "/assets/vasuki-new-site-v7.css",
  "/assets/vasuki-compact-pwa-v8.css",
  "/assets/vasuki-signature-hero-v6.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
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
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
