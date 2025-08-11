const CACHE_VERSION = 'v1.0.0';
const PRECACHE = `precache-${CACHE_VERSION}`;
const RUNTIME  = `runtime-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  'index.html',
  'manifest.webmanifest',
  'app/app.js',
  'pwa/icons/icon-180.png',
  'pwa/icons/icon-192.png',
  'pwa/icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(PRECACHE).then(c => c.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === PRECACHE || k === RUNTIME) ? null : caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(PRECACHE);
      const cached = await cache.match('index.html');
      try {
        const fresh = await fetch(req);
        if (fresh.ok) cache.put('index.html', fresh.clone());
        return fresh;
      } catch { return cached || Response.error(); }
    })());
    return;
  }

  if (url.origin !== location.origin) return;

  if (PRECACHE_URLS.some(p => url.pathname.endsWith(p))) {
    e.respondWith(caches.match(req).then(r => r || fetch(req)));
    return;
  }

  e.respondWith((async () => {
    const cache = await caches.open(RUNTIME);
    const cached = await cache.match(req);
    const network = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => cached);
    return cached || network;
  })());
});
