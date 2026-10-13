import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import type { Browser, BrowserContext, Page } from 'playwright-core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { THEME_KEYS } from '../src/gen'
import { buildSiteZip } from '../src/publish/siteZip'
import type { SiteExport } from '../src/publish/siteZip'
import { finishedSite } from '../src/publish/test/sites'
import { unzipStored } from '../src/publish/zip'
import { client, photoBytes } from '../server/test/client'
import { startStack } from '../server/test/stack'
import type { Stack } from '../server/test/stack'
import { launchBrowser } from '../scripts/browser.mjs'

/**
 * End to end, in real Chrome: build a site -> save (photos uploaded) -> preview link ->
 * publish -> fetch <slug>.<domain> over HTTPS -> axe with colour contrast on the served
 * pages, at desktop and phone width, for every theme. Run with `npm run e2e`.
 */
const PORT = 8790
const BASE = `localblocks.localhost:${PORT}`
const ADMIN = 'e2e-admin-key-0123456789abcdef'
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')

const VIEWPORTS = [
  { name: 'desktop', viewport: { width: 1280, height: 900 }, isMobile: false },
  { name: 'phone', viewport: { width: 390, height: 844 }, isMobile: true },
] as const

let stack: Stack
let browser: Browser
const contexts: BrowserContext[] = []
/** The draft key of the site publishedSite() made last. */
let lastKey: string | null = null

beforeAll(async () => {
  stack = await startStack({ baseDomain: BASE, port: PORT, https: true, adminToken: ADMIN })
  browser = await launchBrowser()
}, 120_000)
afterAll(async () => {
  await browser?.close()
  await stack?.close()
}, 60_000)

/** Opens a page as a visitor would, under the site's real (script-free) CSP: any violation shows up as a console error. */
async function open(url: string, vp: typeof VIEWPORTS[number]): Promise<{ page: Page; errors: string[] }> {
  const context = await browser.newContext({ viewport: vp.viewport, isMobile: vp.isMobile, hasTouch: vp.isMobile, ignoreHTTPSErrors: true })
  contexts.push(context)
  const page = await context.newPage()
  const errors: string[] = []
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('requestfailed', r => errors.push(`${r.url()} ${r.failure()?.errorText}`))
  const res = await page.goto(url, { waitUntil: 'networkidle' })
  expect(res?.status(), url).toBe(200)
  await page.evaluate(() => document.fonts.ready)
  return { page, errors }
}

async function axe(page: Page): Promise<string[]> {
  // Through DevTools, not a <script> tag: the page's CSP allows no scripts at all.
  await page.evaluate(axeSource)
  return page.evaluate(async () => {
    const w = window as unknown as { axe: { run: (ctx: Document, o: object) => Promise<{ violations: { id: string; nodes: { target: string[]; failureSummary?: string }[] }[] }> } }
    const r = await w.axe.run(document, { rules: { 'color-contrast': { enabled: true } } })
    return r.violations.flatMap(v => v.nodes.map(n => `${v.id}: ${n.target.join(' ')} ${n.failureSummary?.split('\n').slice(1).join(' ') ?? ''}`))
  })
}

async function publishedSite(theme: typeof THEME_KEYS[number], slug: string) {
  const c = client(stack, BASE)
  const key = await c.newDraft()
  lastKey = key
  const hero = await c.upload(key, photoBytes('bathroom.jpg'))
  const about = await c.upload(key, photoBytes('worker-hi-vis.jpg'))
  const site = finishedSite({ theme, extras: ['reviews'], content: {
    photos: { hero: { url: hero, alt: 'A finished bathroom with a glass shower' }, about: { url: about, alt: 'One of the team at work' }, gallery: [] },
    rating: { score: 4.9, count: 37 },
    reviews: [{ author: 'Sam', location: 'Headingley', text: 'Quick, tidy and fairly priced. Would use again.', rating: 5 }],
  } })
  expect((await c.save(key, site)).status).toBe(200)
  const preview = await c.preview(key)
  const res = await c.publish(key, slug, ADMIN)
  expect(res.status, await res.clone().text()).toBe(200)
  return { preview: preview.url, live: ((await res.json()) as { url: string }).url }
}

describe('publish, then visit', () => {
  for (const theme of THEME_KEYS) {
    it(`${theme}: the preview link and the published site pass axe with contrast on desktop and phone`, async () => {
      const { preview, live } = await publishedSite(theme, `e2e-${theme}`)
      expect(live).toBe(`https://e2e-${theme}.${BASE}/`)
      for (const vp of VIEWPORTS) {
        for (const url of [live, `${live}privacy`, preview]) {
          const { page, errors } = await open(url, vp)
          const violations = await axe(page)
          expect(violations, `${url} @${vp.name}`).toEqual([])
          // Every image and font came from the site itself and loaded.
          const broken = await page.evaluate(async () => {
            const imgs = [...document.images]
            // Photos below the fold load lazily: ask for them now.
            imgs.forEach(i => { i.loading = 'eager' })
            await Promise.all(imgs.map(i => i.decode().catch(() => undefined)))
            return imgs.filter(i => i.naturalWidth === 0).map(i => i.src)
          })
          expect(broken, `${url} @${vp.name}`).toEqual([])
          expect(await page.evaluate(() => [...document.fonts].filter(f => f.status === 'error').map(f => f.family))).toEqual([])
          expect(errors, `${url} @${vp.name}`).toEqual([])
          // No sideways scrolling on a phone.
          if (vp.isMobile) expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
          await page.close()
        }
      }
      // The preview says so; the live site doesn't.
      const { page } = await open(preview, VIEWPORTS[1])
      expect(await page.getByRole('complementary', { name: 'Preview notice' }).textContent()).toBe('Preview — not live yet')
      await page.close()
    }, 180_000)
  }
})

describe('download your site', () => {
  it('the zip of a paid site opens from a local folder, with every photo and font, and nothing fetched from anywhere', async () => {
    const { live } = await publishedSite('workwear', 'e2e-download')
    const db = await stack.db()
    // Marked paid directly: this stack has no Stripe (server/test/export.test.ts covers paying).
    await db.prepare("UPDATE drafts SET paid_at = ?1, stripe_session_id = 'cs_test_e2e', stripe_payment_intent = 'pi_e2e', amount = 9900, currency = 'gbp', email = 'joe@example.com' WHERE slug = 'e2e-download'").bind(Date.now()).run()
    const key = lastKey!
    const res = await client(stack, BASE).call('/v1/draft/export', { key })
    expect(res.status, await res.clone().text()).toBe(200)
    const zip = unzipStored(await buildSiteZip(await res.json() as SiteExport, url => stack.fetch(url)))

    const dir = mkdtempSync(join(tmpdir(), 'localblocks-download-'))
    for (const [path, data] of zip) {
      mkdirSync(dirname(join(dir, path)), { recursive: true })
      writeFileSync(join(dir, path), data)
    }
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({ viewport: vp.viewport, isMobile: vp.isMobile, hasTouch: vp.isMobile, offline: true })
      contexts.push(context)
      const page = await context.newPage()
      const requests: string[] = []
      const failed: string[] = []
      page.on('request', r => requests.push(r.url()))
      page.on('requestfailed', r => failed.push(`${r.url()} ${r.failure()?.errorText}`))
      for (const file of ['index.html', 'privacy.html']) {
        await page.goto(pathToFileURL(join(dir, file)).href, { waitUntil: 'load' })
        await page.evaluate(() => document.fonts.ready)
        const broken = await page.evaluate(async () => {
          const imgs = [...document.images]
          imgs.forEach(i => { i.loading = 'eager' })
          await Promise.all(imgs.map(i => i.decode().catch(() => undefined)))
          return imgs.filter(i => i.naturalWidth === 0).map(i => i.src)
        })
        expect(broken, file).toEqual([])
        expect(await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').length), file).toBeGreaterThan(0)
        expect(await page.evaluate(() => [...document.fonts].filter(f => f.status === 'error').map(f => f.family)), file).toEqual([])
        await page.screenshot({ path: join(process.cwd(), 'e2e', 'screens', `download-${file.replace('.html', '')}-${vp.name}.png`) })
      }
      // The privacy link and the way back both work between the local files.
      await page.goto(pathToFileURL(join(dir, 'index.html')).href)
      await page.locator('a[href="privacy.html"]').first().click()
      expect(page.url()).toMatch(/privacy\.html$/)
      expect(failed).toEqual([])
      expect(requests.filter(u => !u.startsWith('file:') && !u.startsWith('data:'))).toEqual([])
      await context.close()
    }
    expect(live).toBe(`https://e2e-download.${BASE}/`)
  }, 120_000)
})
