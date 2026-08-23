/// <reference lib="webworker" />

// The WebWorker lib types `self` as WorkerGlobalScope; this file runs as a
// service worker, so narrow it once at the top.
const sw = self as unknown as ServiceWorkerGlobalScope

const CACHE_VERSION = 'storycrat-v1'

// App shell: precached at install so the installed PWA opens offline.
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/icons/icon.svg', '/icons/maskable-icon.svg']

sw.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => sw.skipWaiting())
  )
})

sw.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => sw.clients.claim())
  )
})

/**
 * Strategy:
 * - API calls (`/api/*`) and cross-origin requests: never intercepted.
 *   Screenplay data must never be served stale; offline support for live
 *   features arrives with explicit design later, not by accident here.
 * - Navigations: network-first, falling back to the cached shell for offline starts.
 * - Everything else (fonts, icons, static assets): cache-first, then network,
 *   caching new successful responses.
 */
sw.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event

  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.pathname.startsWith('/api/') || url.origin !== sw.location.origin) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          void caches.open(CACHE_VERSION).then((cache) => cache.put('/', copy))
          return response
        })
        .catch(async () => (await caches.match('/')) ?? Response.error())
    )
    return
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            void caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy))
          }
          return response
        })
    )
  )
})
