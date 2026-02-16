/**
 * Service Worker for مكسب (Maksab) PWA
 * Handles: offline caching, static assets, API response caching, push notifications
 *
 * VERSIONING: Change APP_VERSION on every deployment to bust caches.
 * The build script auto-updates this value.
 */

const APP_VERSION = "2026.02.16.0517";
const CACHE_NAME = `maksab-pages-${APP_VERSION}`;
const STATIC_CACHE = `maksab-static-${APP_VERSION}`;
const API_CACHE = `maksab-api-${APP_VERSION}`;
const IMAGE_CACHE = `maksab-images-${APP_VERSION}`;

// All valid cache names for this version
const CURRENT_CACHES = [CACHE_NAME, STATIC_CACHE, API_CACHE, IMAGE_CACHE];

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  "/",
  "/search",
  "/offline.html",
  "/manifest.json",
];

// API cache TTL: 5 minutes max
const API_CACHE_MAX_AGE_MS = 5 * 60 * 1000;

// Image cache: max 100 images
const IMAGE_CACHE_MAX_ITEMS = 100;

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

// Helper: serve offline fallback page
function serveOfflineFallback() {
  return caches.match("/offline.html").then((cached) => {
    return cached || new Response(
      "<html dir='rtl'><body style='font-family:sans-serif;text-align:center;padding:60px 20px'><h1>📡 مفيش إنترنت</h1><p>جرّب تاني لما الإنترنت يرجع</p><button onclick='location.reload()' style='margin-top:16px;padding:12px 24px;background:#1B7A3D;color:white;border:none;border-radius:8px;font-size:16px;cursor:pointer'>🔄 جرّب تاني</button></body></html>",
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  });
}

// Helper: trim cache to max items (FIFO)
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    for (let i = 0; i < keys.length - maxItems; i++) {
      await cache.delete(keys[i]);
    }
  }
}

// Fetch: network-first for API & HTML, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin (except Supabase and image CDNs)
  if (request.method !== "GET") return;
  if (
    url.origin !== self.location.origin &&
    !url.hostname.includes("supabase") &&
    !url.hostname.includes("storage.googleapis.com")
  ) return;

  // Image requests: cache-first with background refresh
  if (
    url.pathname.match(/\.(png|jpg|jpeg|webp|avif|gif)$/) ||
    url.hostname.includes("storage.googleapis.com") ||
    (url.hostname.includes("supabase") && url.pathname.includes("/storage/"))
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(IMAGE_CACHE).then((cache) => {
              cache.put(request, clone);
              trimCache(IMAGE_CACHE, IMAGE_CACHE_MAX_ITEMS);
            });
          }
          return response;
        }).catch(() => null);

        // Return cached immediately, refresh in background
        return cached || fetchPromise || new Response("", { status: 404 });
      })
    );
    return;
  }

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

  // Other static assets (js, css, fonts, svg): network-first
  if (url.pathname.match(/\.(js|css|svg|woff|woff2|ttf)$/)) {
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

  // HTML pages: network-first with cache fallback and offline page
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
          if (cached) return cached;
          // Try serving the home page cache as a SPA fallback
          return caches.match("/").then((homeCached) => {
            return homeCached || serveOfflineFallback();
          });
        });
      })
  );
});

// Handle messages from the app
self.addEventListener("message", (event) => {
  if (!event.data) return;

  switch (event.data.type) {
    case "SKIP_WAITING":
      self.skipWaiting();
      break;

    case "GET_VERSION":
      event.source.postMessage({
        type: "SW_VERSION",
        version: APP_VERSION,
      });
      break;

    case "CLEAR_CACHES":
      event.waitUntil(
        caches.keys().then((keys) => {
          return Promise.all(keys.map((key) => caches.delete(key)));
        }).then(() => {
          event.source.postMessage({ type: "CACHES_CLEARED" });
        })
      );
      break;

    case "CACHE_AD":
      // Pre-cache a specific ad page for offline viewing
      if (event.data.url) {
        event.waitUntil(
          caches.open(CACHE_NAME).then((cache) => {
            return cache.add(event.data.url).catch(() => {});
          })
        );
      }
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
    actions: data.actions || [],
    tag: data.tag || undefined,
    renotify: !!data.tag,
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
