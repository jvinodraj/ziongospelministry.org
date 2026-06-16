const CACHE_NAME = "zgm-static-v3";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./about.html",
  "./bible.html",
  "./sermons.html",
  "./bible-studies.html",
  "./ministries.html",
  "./events.html",
  "./missions.html",
  "./prayer.html",
  "./resources.html",
  "./contact.html",
  "./assets/css/style.css",
  "./assets/css/bible.css",
  "./assets/js/site.js",
  "./assets/js/bible.js",
  "./assets/js/bible-reader.js",
  "./assets/data/bible-books.json",
  "./manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
