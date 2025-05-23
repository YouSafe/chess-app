import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/chess-app/',
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    },
    https: {
      key: './localhost-https/private.key',
      cert: './localhost-https/certificate.crt'
    }
  },
  plugins: [
    vue(),
    VitePWA({
      strategies: 'injectManifest',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,nnue}'],
        maximumFileSizeToCacheInBytes: 45000000
      },
      srcDir: 'src',
      filename: 'sw.ts',
      manifest: {
        name: 'Chess App',
        start_url: '/chess-app/',
        display: 'standalone',
        prefer_related_applications: true,
        theme_color: '#1d232a',
        background_color: '#1d232a',
        icons: [
          {
            src: 'icons/512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable any'
          }
        ]
      },
      registerType: 'autoUpdate'
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
