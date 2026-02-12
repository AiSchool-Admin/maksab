/**
 * Service Worker for مكسب (Maksab) PWA
 * Handles: offline caching, static assets, API response caching, push notifications
 *
 * VERSIONING: Change APP_VERSION on every deployment to bust caches.
 * The build script auto-updates this value.
 */

const APP_VERSION = "2026.02.12.1856";
const CACHE_NAME = `maksab-pages-${APP_VERSION}`;
const STATIC_CACHE = `maksab-static-${APP_VERSION}`;
const API_CACHE = `maksab-api-${APP_VERSION}`;

// All valid cache names for this version
const CURRENT_CACHES = [CACHE_NAME, STATIC_CACHE, API_CACHE];

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  "/",
  "/search",
  "/manifest.json",
];

// API cache TTL: 5 minutes max
const API_CACHE_MAX_AGE_MS = 5 * 60 * 1000;

// Install: pre-cache core assets, skip waiting to activate immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate: delete ALL old caches that don't match current version
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => !CURRENT_CACHES.includes(key))
          .map((key) => {
            console.log(`[SW] Deleting old cache: ${key}`);
            return caches.delete(key);
          })
      );
    }).then(() => {
      // Notify all clients that a new version is active
      self.clients.matchAll({ type: "window" }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: "SW_UPDATED",
            version: APP_VERSION,
          });
        });
      });
    })
  );
  self.clients.claim();
});

// Fetch: network-first for API & HTML, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin (except Supabase)
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin && !url.hostname.includes("supabase")) return;

  // API requests: network-first with short-lived cache fallback
  if (url.pathname.startsWith("/api/") || url.hostname.includes("supabase")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (!cached) return cached;
            // Check if API cache is stale (older than 5 min)
            const dateHeader = cached.headers.get("date");
            if (dateHeader) {
              const age = Date.now() - new Date(dateHeader).getTime();
              if (age > API_CACHE_MAX_AGE_MS) {
                // Stale, but return anyway as offline fallback
                console.log("[SW] Serving stale API cache (offline)");
              }
            }
            return cached;
          });
        })
    );
    return;
  }

  // Next.js static assets with build hashes: cache-first (safe, they're immutable)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Other static assets (images, fonts, CSS): network-first to get fresh versions
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|webp|avif|svg|woff|woff2|ttf)$/)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // HTML pages: network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          return cached || caches.match("/");
        });
      })
  );
});

// Handle messages from the app
self.addEventListener("message", (event) => {
  if (!event.data) return;

  switch (event.data.type) {
    case "SKIP_WAITING":
      // App is requesting immediate activation of new SW
      self.skipWaiting();
      break;

    case "GET_VERSION":
      // App is requesting current SW version
      event.source.postMessage({
        type: "SW_VERSION",
        version: APP_VERSION,
      });
      break;

    case "CLEAR_CACHES":
      // App is requesting full cache clear
      event.waitUntil(
        caches.keys().then((keys) => {
          return Promise.all(keys.map((key) => caches.delete(key)));
        }).then(() => {
          event.source.postMessage({ type: "CACHES_CLEARED" });
        })
      );
      break;

    case "SHOW_NOTIFICATION":
      const { title, body, url: notifUrl } = event.data;
      self.registration.showNotification(title || "مكسب", {
        body: body || "",
        icon: "/icons/icon-192x192.png",
        dir: "rtl",
        lang: "ar",
        data: { url: notifUrl || "/" },
      });
      break;
  }
});

// Push notifications
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "مكسب";
  const options = {
    body: data.body || "عندك إشعار جديد",
    icon: data.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/icon-192x192.png",
    dir: "rtl",
    lang: "ar",
    vibrate: [100, 50, 100],
    data: {
      url: (data.data && data.data.url) || data.url || "/",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click: open the app at the relevant URL
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
