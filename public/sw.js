// 경식이의 자산 추적기 — Service Worker
// 전략: 페이지(HTML)·API는 네트워크 우선 + 오프라인 폴백, 정적 자산은 캐시 우선

const CACHE_NAME = 'asset-tracker-v3';
const STATIC_ASSETS = ['/', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // API 라우트는 네트워크 우선 (시세는 항상 최신)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }))),
    );
    return;
  }

  // 외부 도메인(Supabase, Yahoo)은 그대로 통과
  if (url.origin !== self.location.origin) return;

  // 페이지(HTML)는 네트워크 우선 — 캐시 우선이면 새로 배포한 화면이 한 번 늦게 뜬다
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match(req)
            .then((cached) => cached || caches.match('/'))
            .then((cached) => cached || Response.error()),
        ),
    );
    return;
  }

  // 정적 자산(해시가 붙은 JS·CSS 등): 캐시 우선 + 백그라운드 갱신
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          }
          return networkRes;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    }),
  );
});
