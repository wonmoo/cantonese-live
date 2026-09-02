/*
 * Service worker: keeps the app shell available with no signal.
 *
 * Same-origin requests go network-first so an update is picked up the
 * moment you're online, and fall back to the cached copy when you're not.
 * Cross-origin requests (the translation services) are left alone — the
 * page handles their failure itself, and caching them would be wrong.
 */
const CACHE = "canto-live-shell-v1";
const SHELL = ["./", "./index.html", "./vendor/to-jyutping.mjs", "./manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
  );
});
