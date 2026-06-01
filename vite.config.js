import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Service worker is auto-registered and auto-updated when a new build ships
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // We manage our own manifest via public/site.webmanifest — do not generate one
      manifest: false,
      workbox: {
        runtimeCaching: [
          // Products and categories: serve from cache, revalidate in the background (24 h TTL)
          {
            urlPattern: /\/api\/v1\/products(\?.*)?$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-products',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          },
          {
            urlPattern: /\/api\/v1\/categories(\?.*)?$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-categories',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          },
          // Sales POST must always reach the network — mutations cannot be stale
          {
            urlPattern: ({ url, request }) =>
              url.pathname === '/api/v1/sales' && request.method === 'POST',
            handler: 'NetworkOnly',
            options: {
              cacheName: 'api-sales-post'
            }
          },
          // Settings and reports: try network first (5 s timeout), fall back to cache
          {
            urlPattern: /\/api\/v1\/(settings|reports)(\/.*)?(\?.*)?$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-settings-reports',
              networkTimeoutSeconds: 5
            }
          }
        ]
      }
    }),
    // cloudflare() must remain last — it wraps the dev server for Workers compatibility
    cloudflare()
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true
      }
    }
  }
})
