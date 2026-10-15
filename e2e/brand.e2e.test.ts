import { mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import type { Browser, Page } from 'playwright-core'
import { createServer } from 'vite'
import type { ViteDevServer } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { FOOTER_LINKS } from '../src/brand/footer'
import { PACKS } from '../src/packs'
import { STATIC_PAGES } from '../src/pages/registry'
import { HUB_PATH, typePath } from '../src/pages/types/paths'
import { launchBrowser } from '../scripts/browser.mjs'

/**
 * Accessibility in real Chrome for Local Blocks' own pages: axe with colour contrast ON over
 * the homepage, the plain pages and FAQ, the "Websites for…" hub and every type page, the 404
 * page and every builder step (Basics, Your look, Build, Go live), at desktop and
 * phone width, with motion reduced and not. The generated customer-site previews inside
 * are left out here: `npm run a11y` and publish.e2e check those over every theme.
 * Screenshots land in e2e/screens (ignored by git).
 */
const PORT = 5197
const BASE = `http://localhost:${PORT}`
const SCREENS = join(process.cwd(), 'e2e', 'screens')
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')

const VIEWPORTS = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false },
  { name: 'phone', viewport: { width: 390, height: 844 }, isMobile: true },
] as const
type Viewport = typeof VIEWPORTS[number]

let vite: ViteDevServer
let browser: Browser

beforeAll(async () => {
  mkdirSync(SCREENS, { recursive: true })
  // No API: the builder runs on its own, saving nothing.
  delete process.env.VITE_API_URL
  vite = await createServer({ server: { port: PORT, strictPort: true }, logLevel: 'error' })
  await vite.listen()
  browser = await launchBrowser()
}, 120_000)
afterAll(async () => {
  await browser?.close()
  await vite?.close()
}, 60_000)

async function open(path: string, vp: Viewport, reducedMotion: 'reduce' | 'no-preference' = 'reduce') {
  const context = await browser.newContext({ viewport: vp.viewport, isMobile: vp.isMobile, hasTouch: vp.isMobile, reducedMotion })
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  return { page, errors, close: () => context.close() }
}

async function axe(page: Page): Promise<string[]> {
  await page.evaluate(axeSource)
  return page.evaluate(async () => {
    const w = window as unknown as { axe: { run: (ctx: object, o: object) => Promise<{ violations: { id: string; nodes: { target: string[]; failureSummary?: string }[] }[] }> } }
    const r = await w.axe.run({ exclude: [['.sb-generated'], ['.mm-example']] }, { rules: { 'color-contrast': { enabled: true } } })
    return r.violations.flatMap(v => v.nodes.map(n => `${v.id}: ${n.target.join(' ')} ${n.failureSummary?.split('\n').slice(1).join(' ') ?? ''}`))
  })
}

async function check(page: Page, name: string) {
  await page.waitForTimeout(600)
  await page.screenshot({ path: join(SCREENS, `brand-${name}.png`), fullPage: !name.includes('phone') })
  expect(await axe(page), name).toEqual([])
}

describe.each(VIEWPORTS)('$name', vp => {
  it('homepage', async () => {
    const { page, errors, close } = await open('/', vp)
    await check(page, `home-${vp.name}`)
    // Every main button goes to the builder, and the trade links pick the trade.
    expect(await page.getByRole('link', { name: 'Build my site free' }).first().getAttribute('href')).toBe('/build/')
    expect(await page.getByRole('link', { name: 'Roofer' }).getAttribute('href')).toBe('/build/?trade=roofer')
    await page.getByText('What if I’m not happy?').click()
    await expect.poll(() => page.getByText(/within 14 days of paying/).isVisible()).toBe(true)
    expect(errors).toEqual([])
    await close()
  })

  it('homepage motion is off under reduced motion, on otherwise', async () => {
    const reduced = await open('/', vp, 'reduce')
    const still = await reduced.page.evaluate(() => [...document.querySelectorAll('.sb-rise, .sb-logo-mark--drop > span')].every(el => getComputedStyle(el).animationName === 'none'))
    expect(still).toBe(true)
    await reduced.close()
    const moving = await open('/', vp, 'no-preference')
    expect(await moving.page.evaluate(() => getComputedStyle(document.querySelector('.sb-rise')!).animationName)).toBe('sbRise')
    await moving.close()
  })

  it.each(STATIC_PAGES.map(p => p.path))('plain page %s', async path => {
    const { page, errors, close } = await open(path, vp)
    await check(page, `page${path.replace(/\/+/g, '-').replace(/-$/, '')}-${vp.name}`)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    // The contents: a sidebar on desktop, a fold-away list on phones (opened and checked again).
    if (vp.isMobile) {
      await page.locator('summary', { hasText: 'On this page' }).click()
      expect(await axe(page)).toEqual([])
    } else {
      expect(await page.getByRole('navigation', { name: 'On this page' }).isVisible()).toBe(true)
    }
    expect(await page.getByRole('navigation', { name: 'Footer' }).getByRole('link').count()).toBe(FOOTER_LINKS.length)
    expect(errors).toEqual([])
    await close()
  })

  it.each([HUB_PATH, ...PACKS.map(typePath), '/404.html'])('trade page %s', async path => {
    const { page, errors, close } = await open(`${path}?src=fb`, vp)
    // Lazy pictures arrive before the check.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)) }
      window.scrollTo(0, 0)
    })
    await page.waitForLoadState('networkidle')
    await check(page, `trade${path.replace(/\/+/g, '-').replace(/-$/, '').replace('.html', '')}-${vp.name}`)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    // Builder links keep the ad source; the trade pages preselect their trade.
    const start = await page.locator('a[data-build]').first().getAttribute('href')
    expect(start).toContain('src=fb')
    const pack = PACKS.find(p => typePath(p) === path)
    if (pack) expect(start).toBe(`/build/?trade=${pack.id}&src=fb`)
    // Every picture loaded.
    expect(await page.evaluate(() => [...document.images].every(i => i.complete && i.naturalWidth > 0))).toBe(true)
    if (pack) {
      await page.locator('summary').first().click()
      expect(await axe(page)).toEqual([])
    }
    expect(errors).toEqual([])
    await close()
  })

  it('every builder step', async () => {
    const { page, errors, close } = await open('/build/?trade=plumber', vp)
    // "My business isn't listed", opened and answered.
    await page.getByRole('button', { name: 'My business isn’t listed' }).click()
    await page.getByLabel('What’s your business?').fill('heating engineer')
    await page.getByRole('button', { name: 'Find the closest match' }).click()
    await page.getByRole('button', { name: 'Start with Plumber' }).waitFor()
    await check(page, `basics-notlisted-${vp.name}`)
    if (vp.isMobile) {
      await check(page, `basics-trade-${vp.name}`)
      await page.getByRole('button', { name: 'Continue' }).click()
    }
    await page.getByLabel('Business name').fill('Hartley & Sons')
    await page.getByLabel('Where do you work?').fill('Harrogate')
    await page.getByLabel('Phone number').fill('01632 960 123')
    await check(page, `basics-${vp.name}`)

    await page.getByRole('button', { name: 'Next: your look' }).click()
    await page.getByRole('heading', { name: 'Your look' }).waitFor()
    await page.getByRole('switch', { name: 'Show customer reviews' }).click()
    await check(page, `look-${vp.name}`)

    await page.getByRole('button', { name: 'Start building' }).click()
    await page.getByRole('button', { name: /^Next: trust bar/ }).waitFor({ timeout: 30_000 })
    await expect.poll(() => page.getByRole('button', { name: /^Next: / }).isEnabled(), { timeout: 30_000 }).toBe(true)
    await check(page, `build-${vp.name}`)
    if (vp.isMobile) {
      // Edit opens just the hero's fields; Done moves on to the next section.
      await page.getByRole('button', { name: 'Edit hero' }).click()
      await page.getByRole('heading', { name: 'Your hero' }).waitFor()
      await check(page, `build-content-${vp.name}`)
      await page.getByRole('button', { name: 'Done' }).click()
      await page.getByRole('button', { name: 'Edit trust bar' }).waitFor({ timeout: 30_000 })
    }

    for (let i = 0; i < 20; i++) {
      const next = page.getByRole('button', { name: /^Next: / })
      await expect.poll(() => next.isEnabled(), { timeout: 30_000 }).toBe(true)
      const label = await next.textContent()
      await next.click()
      if (label?.includes('go live')) break
    }
    await page.getByRole('heading', { name: /Nearly there, Hartley & Sons/ }).waitFor({ timeout: 60_000 })
    await check(page, `golive-${vp.name}`)
    expect(errors).toEqual([])
    await close()
  }, 240_000)
})
