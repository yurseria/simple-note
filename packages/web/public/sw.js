// Simple Note — App Shell Service Worker
// Design Ref: Plan §2.1 "PWA manifest + service worker (앱 셸 오프라인 캐시)"
// Strategy: app shell (offline page, manifest, icons) precache + network-first for nav/HTML.
// Static Next.js assets are cached on-demand (stale-while-revalidate).

const CACHE_VERSION = 'sn-v3'
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`

const APP_SHELL_URLS = [
  '/',
  '/files',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(CACHE_VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // 외부 Origin (googleapis, accounts.google.com) — SW 가 가로채지 않음 (online-only)
  if (url.origin !== self.location.origin) return

  // 1) Navigation (HTML): network-first with offline shell fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone()
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone))
          return res
        })
        .catch(() =>
          caches.match(req).then(
            (cached) =>
              cached ||
              caches.match('/') ||
              new Response('Offline', {
                status: 503,
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
              })
          )
        )
    )
    return
  }

  // 2) Static assets (_next/static/*, icons, manifest): cache-first with network fallback
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached
        return fetch(req)
          .then((res) => {
            const clone = res.clone()
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone))
            return res
          })
          .catch(() => new Response('', { status: 503 }))
      })
    )
    return
  }

  // 3) Other same-origin (_next/data 등): network-first
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const clone = res.clone()
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone))
        }
        return res
      })
      .catch(() => caches.match(req) as Promise<Response>)
  )
})
