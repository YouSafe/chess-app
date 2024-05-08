/// <reference lib="webworker" />

import { precache } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()

precache(self.__WB_MANIFEST)

registerRoute(
  ({ request }) => ['document', 'iframe', 'worker'].includes(request.destination),
  async ({ request }) => {
    const response = await fetch(request)

    // Set COOP and COEP headers
    const headers = new Headers(response.headers)
    headers.append('Cross-Origin-Opener-Policy', 'same-origin')
    headers.append('Cross-Origin-Embedder-Policy', 'require-corp')

    // Construct a new response with the headers
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    })

    return newResponse
  }
)
