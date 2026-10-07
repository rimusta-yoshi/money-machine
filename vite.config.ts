import { readFileSync } from 'node:fs'
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

/**
 * The price is set in one place, the API worker's config (PRICE_PENCE in server/wrangler.api.jsonc).
 * The homepage and builder are built with it; the builder also asks the server when it runs.
 */
const PRICE_PENCE = Number(/"PRICE_PENCE"\s*:\s*"(\d+)"/.exec(readFileSync(page('./server/wrangler.api.jsonc'), 'utf8'))?.[1])
if (!Number.isInteger(PRICE_PENCE) || PRICE_PENCE <= 0) throw new Error('PRICE_PENCE not found in server/wrangler.api.jsonc')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), brandName()],
  define: { __PRICE_PENCE__: JSON.stringify(PRICE_PENCE) },
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
