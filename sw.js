// ============================================================
//  SERVICE WORKER — Dashboard Keperawatan SHND
//  Versi cache: update angka ini tiap deploy baru
// ============================================================
const CACHE_NAME = 'keperawatan-shnd-v1';

// File yang di-cache untuk offline
const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// ── INSTALL: cache assets utama ──────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching assets...');
      return cache.addAll(CACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: hapus cache lama ───────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: strategi Network First ───────────────────────────
// Prioritas jaringan, fallback ke cache kalau offline
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Jangan intercept request ke Google Apps Script API
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('drive.google.com') ||
      url.hostname.includes('lh3.googleusercontent.com')) {
    return; // biarkan browser handle langsung
  }

  // Untuk asset lokal: Network First, fallback Cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Simpan salinan response ke cache
        if (response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline: ambil dari cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Fallback ke index.html untuk navigasi
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
