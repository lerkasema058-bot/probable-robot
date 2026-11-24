const CACHE_NAME = 'kids-studio-v3'

function getScopeAssets() {
  const scope = self.registration?.scope || self.location.origin + '/'
  return [
    new URL('./', scope).href,
    new URL('./index.html', scope).href,
    new URL('./manifest.json', scope).href,
    new URL('./icon.svg', scope).href,
  ]
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const urls = getScopeAssets()
      await Promise.allSettled(urls.map((u) => cache.add(u)))
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Network-first for HTML, JS, CSS, and manifest so deployments update immediately;
  // falls back to cache when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone))
        }
        return res
      })
      .catch(async () => {
        const cached = await caches.match(req)
        if (cached) return cached
        if (req.mode === 'navigate') {
          const scope = self.registration?.scope || self.location.origin + '/'
          return (
            (await caches.match(new URL('./index.html', scope).href)) ||
            (await caches.match(new URL('./', scope).href))
          )
        }
        return Response.error()
      })
  )
})
