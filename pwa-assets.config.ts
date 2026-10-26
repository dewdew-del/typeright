import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Regenerate the app icons from public/favicon.svg: npx pwa-assets-generator
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#2f7df6' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#2f7df6' } },
  },
  images: ['public/favicon.svg'],
})
