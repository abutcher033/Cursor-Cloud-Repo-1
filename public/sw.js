const CACHE = "local-life-shell-v3";
const RESULTS_CACHE = "local-life-results-v1";
const SHELL = ["/", "/offline", "/onboarding", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];
const PRIVATE_PREFIX = ["/settings", "/recent", "/friends", "/saved", "/go", "/api", "/auth", "/plan", "/admin"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE && k !== RESULTS_CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

function isPrivate(pathname) {
  return PRIVATE_PREFIX.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isNextAsset(pathname) {
  return pathname.startsWith("/_next/");
}

function isAuthApi(pathname) {
  return (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/me") ||
    pathname.startsWith("/api/friends") ||
    pathname.startsWith("/api/save") ||
    pathname.startsWith("/api/been") ||
    pathname.startsWith("/api/reviews") ||
    pathname.startsWith("/api/report") ||
    pathname.startsWith("/api/share") ||
    pathname.startsWith("/api/onboarding") ||
    pathname.startsWith("/api/guest-prefs")
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache auth / mutation-adjacent APIs
  if (isAuthApi(url.pathname) || url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(req));
    return;
  }
  if (isNextAsset(url.pathname)) {
    event.respondWith(fetch(req));
    return;
  }

  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok && !isPrivate(url.pathname)) {
        if (req.mode === "navigate") {
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone());
        }
        // Cache public results navigations for offline park/car
        if (url.pathname === "/results" || url.pathname.startsWith("/places/")) {
          const rc = await caches.open(RESULTS_CACHE);
          rc.put(req, res.clone());
        }
      }
      return res;
    } catch (err) {
      const cached = (await caches.match(req)) || (await caches.open(RESULTS_CACHE).then((c) => c.match(req)));
      if (cached) return cached;
      if (req.mode === "navigate") {
        const offline = await caches.match("/offline");
        if (offline) return offline;
      }
      throw err;
    }
  })());
});
