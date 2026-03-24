// ============================================================
//  SERVICE WORKER — Komite Keperawatan RSU SHND
//  v4 — scope otomatis dari lokasi sw.js, aman multi-repo
// ============================================================

// BASE otomatis terdeteksi dari letak sw.js
// Jika sw.js ada di /Komite-Keperawatan-RSU-SHND/sw.js
// maka BASE = '/Komite-Keperawatan-RSU-SHND/'
const BASE = self.location.pathname.replace(/sw\.js$/, '');
const CACHE_NAME = 'komkep-shnd-v4';

const CACHE_ASSETS = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.json',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png'
];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: bersihkan cache lama ───────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH ────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Lewati semua domain eksternal
  if (url.origin !== self.location.origin) return;

  // Lewati non-GET
  if (event.request.method !== 'GET') return;

  // KRITIS: hanya handle request di dalam scope BASE ini saja
  // Request dari repo/app lain dibiarkan browser handle sendiri
  if (!url.pathname.startsWith(BASE)) return;

  // Network First → fallback Cache (untuk PWA offline)
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(cached =>
          cached || (event.request.mode === 'navigate'
            ? caches.match(BASE + 'index.html')
            : undefined)
        )
      )
  );
});
