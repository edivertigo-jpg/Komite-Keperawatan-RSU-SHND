// ============================================================
//  SERVICE WORKER — Dashboard Keperawatan SHND
//  PERBAIKAN: scope terbatas, tidak ganggu dashboard lain
//  Update versi cache setiap deploy baru
// ============================================================
const CACHE_NAME = 'keperawatan-shnd-v2';

// File yang di-cache — gunakan path RELATIF (tanpa leading slash)
// agar SW bekerja di subfolder manapun (bukan hanya di root /)
const CACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// ── INSTALL: cache assets utama ──────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching assets…');
      return cache.addAll(CACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: hapus cache lama, ambil kontrol langsung ───────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Hapus cache lama:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: Network First, fallback Cache ─────────────────────
// Hanya intercept request yang ada di dalam scope SW ini.
// Request ke Google (API, Drive, dll.) dibiarkan langsung.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Bypass: Google Apps Script & layanan Google lainnya
  const bypassHosts = [
    'script.google.com',
    'googleapis.com',
    'drive.google.com',
    'lh3.googleusercontent.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdnjs.cloudflare.com'
  ];
  if (bypassHosts.some(h => url.hostname.includes(h))) {
    return; // biarkan browser handle langsung (tidak di-intercept)
  }

  // Bypass: request POST / non-GET (misal submit form, API call)
  if (event.request.method !== 'GET') return;

  // Untuk asset lokal: Network First → fallback Cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Hanya cache response OK dari GET
        if (response && response.status === 200) {
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
            return caches.match('./index.html');
          }
        });
      })
  );
});
