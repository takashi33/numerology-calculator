// Offline support for 数秘電卓. The page is a single self-contained HTML
// file (all CSS/JS/images inlined), so caching just the document itself is
// enough for the whole app to keep working with no network at all.
const CACHE_NAME = "numerology-calculator-v2";
const URLS_TO_CACHE = ["./", "./index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
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

// Network-first: whenever online, always fetch the latest page so updates
// show up immediately (no "one reload behind" staleness). Only falls back
// to the cached copy when the network request fails, i.e. truly offline.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
