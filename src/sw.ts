/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precache } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { clientsClaim, type HandlerWillRespondCallbackParam } from 'workbox-core'
import { StaleWhileRevalidate } from 'workbox-strategies'
import * as navigationPreload from 'workbox-navigation-preload'

declare const self: ServiceWorkerGlobalScope

navigationPreload.enable()

self.skipWaiting()
clientsClaim()

const headersPlugin = {
  handlerWillRespond: async ({ response }: HandlerWillRespondCallbackParam) => {
    const headers = new Headers(response.headers)
    headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
    headers.set('Cross-Origin-Opener-Policy', 'same-origin')

    return new Response(response.body, {
      headers,
      status: response.status,
      statusText: response.statusText
    })
  }
}

// Delay precaching to when the service worker is already registered and 
// the page reloaded with the expected headers
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'START_PRECACHING') {
    precache(self.__WB_MANIFEST)
  }
})

cleanupOutdatedCaches()

registerRoute(
  ({ request }) => ['document', 'style', 'script', 'worker'].includes(request.destination),
  new StaleWhileRevalidate({
    plugins: [headersPlugin]
  })
)
