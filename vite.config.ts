import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Installable app. The app shell and all lesson data are precached, so lessons,
    // practice and logged-out casual typing work offline. Online features need the network.
    VitePWA({
      // The desktop app already ships its files; a service worker there would only serve stale copies.
      disable: Boolean(process.env.TAURI_ENV_PLATFORM),
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'TypeRight',
        short_name: 'TypeRight',
        description: 'Learn to type with 200 lessons, then race your friends and climb the leaderboard.',
        start_url: '/play',
        scope: '/',
        display: 'standalone',
        theme_color: '#1f6ae0',
        background_color: '#ffffff',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Inter's other alphabets (about 170 KB) are not downloaded in the background; browsers still fetch them if a page ever needs them.
        globIgnores: ['**/inter-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese,latin-ext}-wght-normal-*.woff2'],
        navigateFallback: '/index.html',
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        // React and Supabase change rarely: in their own files, returning visitors keep them cached across deploys.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/, priority: 2 },
            { name: 'supabase', test: /node_modules[\\/](@supabase|iceberg-js|tslib)[\\/]/, priority: 1 },
          ],
        },
      },
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts', 'supabase/functions/_shared/**/*.test.ts'] },
})
