/// <reference lib="webworker" />

import { precache } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { clientsClaim, type HandlerWillRespondCallbackParam } from 'workbox-core'
import { StaleWhileRevalidate } from 'workbox-strategies'
import * as navigationPreload from 'workbox-navigation-preload'

declare const self: ServiceWorkerGlobalScope

navigationPreload.enable()

self.skipWaiting()
clientsClaim()

precache(self.__WB_MANIFEST)

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

registerRoute(
  ({ request }) => ['document', 'style', 'script', 'worker'].includes(request.destination),
  new StaleWhileRevalidate({
    plugins: [headersPlugin]
  })
)
