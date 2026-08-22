const CACHE_NAME = 'ourhome-shell-v2';
// GitHub Pages 등 서브패스(예: /ourfamily-restaurant_VC_2608/)로 배포될 수 있어
// 루트 절대경로 대신 이 sw.js 자신의 위치 기준으로 베이스 경로를 계산함.
const BASE_URL = new URL('.', self.location);
const BASE_PATH = BASE_URL.pathname;

const PRECACHE_URLS = [
  BASE_URL.href,
  BASE_PATH + 'manifest.json',
  BASE_PATH + 'offline.html',
  BASE_PATH + 'icons/icon-192.png',
  BASE_PATH + 'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isStaticAsset = url.pathname.startsWith(BASE_PATH + 'icons/') || url.pathname === BASE_PATH + 'manifest.json';
  if (isStaticAsset) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
    return;
  }

  const isNavigation = req.mode === 'navigate' || req.destination === 'document';
  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match(BASE_PATH + 'offline.html')))
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
