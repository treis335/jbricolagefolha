// sw-custom.js — força limpeza de caches antigos ao activar
// Muda CACHE_VERSION quando queres forçar refresh em todos os users
const CACHE_VERSION = 'v3'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => !key.includes(CACHE_VERSION))
          .map(key => {
            console.log('[SW] Deleting old cache:', key)
            return caches.delete(key)
          })
      )
    ).then(() => self.clients.claim())
  )
})
