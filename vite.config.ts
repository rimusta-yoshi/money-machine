import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import { configDefaults, defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { BRAND } from './src/brand/config'
import { launchProblems, pageWords } from './src/pages/fill'
import { STATIC_PAGES } from './src/pages/registry'
import { appHeaders, appRobotsTxt, appSitemap } from './src/pages/seo'
import { buildPage } from './src/pages/shell'
import { PACKS } from './src/packs'
import { typePages } from './vite.pages'

/** Fills %BRAND_NAME% in the HTML pages, so the name lives only in src/brand/config.ts. */
const brandName = (): Plugin => ({
  name: 'brand-name',
  transformIndexHtml: { order: 'pre', handler: html => html.replaceAll('%BRAND_NAME%', BRAND.name) },
})

/**
 * Cloudflare Web Analytics on the homepage only (cookieless page counts): its beacon goes into
 * index.html when VITE_CF_BEACON_TOKEN is set (.env.production). Never on the builder, the
 * dashboard or customers' sites.
 */
const webAnalytics = (token: string | undefined): Plugin => ({
  name: 'web-analytics',
  transformIndexHtml: (html, ctx) => {
    if (!token || !/^[0-9a-f]{32}$/.test(token) || ctx.path !== '/index.html') return html
    const beacon = `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${token}"}'></script>`
    return html.replace('</body>', `    ${beacon}
  </body>`)
  },
})

const page = (path: string) => fileURLToPath(new URL(path, import.meta.url))

/**
 * The price is set in one place, the API worker's config (PRICE_PENCE in server/wrangler.api.jsonc).
 * The homepage and builder are built with it; the builder also asks the server when it runs.
 */
const PRICE_PENCE = Number(/"PRICE_PENCE"\s*:\s*"(\d+)"/.exec(readFileSync(page('./server/wrangler.api.jsonc'), 'utf8'))?.[1])
if (!Number.isInteger(PRICE_PENCE) || PRICE_PENCE <= 0) throw new Error('PRICE_PENCE not found in server/wrangler.api.jsonc')

/**
 * Launch day is one switch, LAUNCHED in server/wrangler.api.jsonc: it opens orders, and the next
 * build of the homepage takes off noindex and publishes robots.txt and sitemap.xml for search.
 */
const LAUNCHED = /"LAUNCHED"\s*:\s*"true"/.test(readFileSync(page('./server/wrangler.api.jsonc'), 'utf8'))
const ORIGIN = `https://${BRAND.domain}`

/**
 * Our plain pages (privacy, terms, the hosting guide): their words are Markdown in content/,
 * built into the HTML entries (privacy/index.html etc.) with no JavaScript. A production build
 * with LAUNCHED on stops if any "[PLACEHOLDER]" is left in them.
 */
const staticPages = (): Plugin => {
  const words = pageWords(PRICE_PENCE)
  const built = (entry: string) => {
    const p = STATIC_PAGES.find(s => s.entry === entry)
    return p ? { page: p, ...buildPage(p, readFileSync(page(`./${p.source}`), 'utf8'), words, ORIGIN) } : null
  }
  return {
    name: 'static-pages',
    transformIndexHtml: {
      order: 'pre',
      handler: (html, ctx) => {
        const b = built(ctx.path.replace(/^\//, ''))
        if (!b) return html
        if (!ctx.server) {
          const problems = launchProblems([{ path: b.page.path, html: b.html }], LAUNCHED)
          if (problems.length) throw new Error(`Not ready to launch:\n${problems.join('\n')}`)
        }
        return html.replace('<!--page-head-->', b.head).replace('<!--page-body-->', b.body)
      },
    },
    // The words live in content/: a change there reloads the page while developing.
    configureServer: server => {
      server.watcher.add(page('./content'))
      server.watcher.on('change', file => { if (/[\\/]content[\\/].+\.md$/.test(file)) server.ws.send({ type: 'full-reload' }) })
    },
    // Search engines' files for the homepage's own site (customers' sites have their own).
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: appRobotsTxt(LAUNCHED, ORIGIN) })
      this.emitFile({ type: 'asset', fileName: '_headers', source: appHeaders(LAUNCHED) })
      const sitemap = appSitemap(LAUNCHED, ORIGIN, new Date())
      if (sitemap) this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(), brandName(), staticPages(), typePages({ origin: ORIGIN, pricePence: PRICE_PENCE }),
    webAnalytics(loadEnv(mode, process.cwd(), 'VITE_').VITE_CF_BEACON_TOKEN),
  ],
  define: {
    __PRICE_PENCE__: JSON.stringify(PRICE_PENCE),
    __FEATURED_TRADES__: JSON.stringify(PACKS.filter(p => p.featured).map(p => ({ id: p.id, label: p.name }))),
  },
  build: {
    // The licences of the open-source code in the browser bundles (MIT notices), served at
    // /third-party-notices.md. The rest of the list: THIRD-PARTY-NOTICES.md.
    license: { fileName: 'third-party-notices.md' },
    rollupOptions: {
      // The homepage at the root, the builder at /build/, the private dashboard at /admin/,
      // the plain pages (privacy, terms, the hosting guide, the FAQ), the "Websites for…" hub
      // (each type's page is built from it: vite.pages.ts) and the 404 page.
      input: {
        home: page('./index.html'), build: page('./build/index.html'), admin: page('./admin/index.html'),
        hub: page('./websites-for/index.html'), notFound: page('./404.html'),
        ...Object.fromEntries(STATIC_PAGES.map(p => [p.entry.replace(/\/index\.html$/, ''), page(`./${p.entry}`)])),
      },
    },
  },
  test: {
    // Browser end-to-end tests run separately: npm run e2e
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
}))
