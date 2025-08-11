/* Python Learn SW — cache-first shell + SWR for same-origin GET
   Update CACHE_VERSION when you change critical assets. */
const CACHE_VERSION = 'v1.0.0';
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const PRECACHE = `precache-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  // Shell (keep paths relative to <base href="/python-pwa/">)
  'index.html',
  'manifest.webmanifest',
  // JS entry
  'app/app.js',
  // Add more app files as you create them:
  // 'app/core/ui.js', 'app/core/store.js', ...
  // Icons (at least small ones so install sheet shows instantly)
  'pwa/icons/icon-192.png',
  'pwa/icons/icon-180.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PRECACHE).then(cache => cache.addAll(PRECACHE_URLS)).then(self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => {
      if (k !== PRECACHE && k !== RUNTIME_CACHE) return caches.delete(k);
    }));
    await self.clients.claim();
  })());
});

/** Strategy:
 * 1) Navigation requests → serve index.html from cache (SPA fallback) then update in background.
 * 2) Same-origin GET:
 *    - For files listed in PRECACHE: cache-first.
 *    - For others: stale-while-revalidate in RUNTIME_CACHE.
 * 3) Cross-origin: passthrough network.
 */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // 1) Navigation fallback
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(PRECACHE);
      const cached = await cache.match('index.html');
      // Try network, update cache; fall back to cached shell.
      const network = fetch(req).then(async res => {
        if (res.ok) cache.put('index.html', res.clone());
        return res;
      }).catch(() => cached || Response.error());
      return cached || network;
    })());
    return;
  }

  if (!sameOrigin) return; // skip cross-origin

  // 2) Cache-first for anything in precache list
  if (PRECACHE_URLS.some(p => url.pathname.endsWith(p))) {
    event.respondWith(caches.match(req).then(cached => cached || fetch(req)));
    return;
  }

  // 3) Stale-while-revalidate for other same-origin GETs
  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(req);
    const networkPromise = fetch(req).then(res => {
      // Only cache successful, basic/opaque responses
      if (res && (res.status === 200 || res.type === 'opaqueredirect' || res.type === 'basic')) {
        cache.put(req, res.clone());
      }
      return res;
    }).catch(() => cached); // offline fallback to cached if available
    return cached || networkPromise;
  })());
});
