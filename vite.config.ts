import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { BRAND } from './src/brand/config'

/** Fills %BRAND_NAME% in the HTML pages, so the name lives only in src/brand/config.ts. */
const brandName = (): Plugin => ({
  name: 'brand-name',
  transformIndexHtml: { order: 'pre', handler: html => html.replaceAll('%BRAND_NAME%', BRAND.name) },
})

const page = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), brandName()],
  build: {
    rollupOptions: {
      // The homepage at the root, the builder at /build/.
      input: { home: page('./index.html'), build: page('./build/index.html') },
    },
  },
  test: {
    // Browser end-to-end tests run separately: npm run e2e
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
