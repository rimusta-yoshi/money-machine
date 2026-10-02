import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Browser, Page } from 'playwright-core'
import { createServer } from 'vite'
import type { ViteDevServer } from 'vite'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { startStack } from '../server/test/stack'
import type { Stack } from '../server/test/stack'
import { launchBrowser } from '../scripts/browser.mjs'

/**
 * The real builder, end to end: pick a trade, fill in the details, add a photo, go through
 * the sections, get a preview link, publish with the admin key and visit the site. Screenshots
 * land in e2e/screens (ignored by git) for a look by eye.
 */
const PORT = 8791
const BASE = `siteblocks.localhost:${PORT}`
const ADMIN = 'e2e-admin-key-0123456789abcdef'
const BUILDER_PORT = 5198
const SCREENS = join(process.cwd(), 'e2e', 'screens')

let stack: Stack
let vite: ViteDevServer
let browser: Browser

beforeAll(async () => {
  mkdirSync(SCREENS, { recursive: true })
  stack = await startStack({ baseDomain: BASE, port: PORT, https: true, adminToken: ADMIN, builderOrigins: `http://localhost:${BUILDER_PORT}` })
  process.env.VITE_API_URL = `https://api.${BASE}`
  vite = await createServer({ server: { port: BUILDER_PORT, strictPort: true }, logLevel: 'error' })
  await vite.listen()
  browser = await launchBrowser()
}, 120_000)
afterAll(async () => {
  await browser?.close()
  await vite?.close()
  await stack?.close()
}, 60_000)

const shot = (page: Page, name: string) => page.screenshot({ path: join(SCREENS, `${name}.png`), fullPage: false })

it('builds, saves, previews and publishes a site from the builder', async () => {
  const context = await browser.newContext({ viewport: { width: 1360, height: 900 }, ignoreHTTPSErrors: true })
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  await page.goto(`http://localhost:${BUILDER_PORT}/`)
  await page.getByRole('button', { name: /Plumber/ }).first().click()
  await page.getByRole('button', { name: /Continue as/ }).click()
  await page.getByLabel(/Business name/).fill('Riverside Plumbing')
  await page.getByLabel(/^Phone/).fill('0113 496 0123')
  await page.getByLabel(/Town \/ City/).fill('Leeds')
  await page.getByLabel(/^Email/).fill('hello@riverside.example')
  await page.getByRole('button', { name: /Build my site/ }).click()

  // A photo for the hero: prepared in the browser now, uploaded when the builder saves.
  const file = page.locator('input[type=file]').first()
  await file.setInputFiles(join(process.cwd(), 'reference', 'sample-photos', 'bathroom.jpg'))
  await expect.poll(() => page.getByRole('status').filter({ hasText: 'Saved' }).count(), { timeout: 30_000 }).toBeGreaterThan(0)
  await shot(page, '1-build-saved')

  for (let i = 0; i < 20; i++) {
    const launch = page.getByRole('button', { name: /Review and go live/ })
    if (await launch.isVisible()) { await launch.click(); break }
    await page.getByRole('button', { name: /^Next ·/ }).click()
  }
  await page.getByText(/is ready\./).waitFor({ timeout: 60_000 })

  // Preview link.
  await page.getByRole('button', { name: 'Get a preview link' }).click()
  const previewUrl = await page.getByLabel('Preview link').inputValue({ timeout: 30_000 })
  expect(previewUrl).toMatch(new RegExp(`^https://preview\\.${BASE.replace('.', '\\.')}/[A-Za-z0-9_-]{32}/$`))
  expect(await page.getByLabel('Your link to carry on editing').inputValue()).toMatch(/#resume=[A-Za-z0-9_-]{43}$/)
  await page.getByRole('heading', { name: 'Share it before it goes live' }).scrollIntoViewIfNeeded()
  await shot(page, '2-finish-share')

  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ignoreHTTPSErrors: true })
  const preview = await phone.newPage()
  expect((await preview.goto(previewUrl))?.status()).toBe(200)
  await preview.getByText('Preview — not live yet').waitFor()
  await preview.getByText('Riverside Plumbing').first().waitFor()
  const heroSrc = await preview.locator('main img').first().getAttribute('src')
  expect(heroSrc).toMatch(new RegExp(`^https://preview\\.${BASE.replace('.', '\\.')}/photos/`))
  await shot(preview, '3-preview-phone')

  // Publish.
  await page.getByRole('button', { name: /^Publish my site/ }).click()
  const slug = page.getByLabel('Your web address')
  await slug.waitFor({ timeout: 60_000 })
  expect(await slug.inputValue()).toBe('riverside-plumbing')
  await page.getByLabel('Admin key').fill(ADMIN)
  await page.getByText('riverside-plumbing.siteblocks.localhost:8791 is free.').waitFor({ timeout: 30_000 })
  await shot(page, '4-publish-panel')
  await page.getByRole('button', { name: /Publish my site/ }).last().click()
  await page.getByText('It’s live.').waitFor({ timeout: 30_000 })
  await shot(page, '5-published')

  const live = await phone.newPage()
  const res = await live.goto(`https://riverside-plumbing.${BASE}/`)
  expect(res?.status()).toBe(200)
  await live.getByText('Riverside Plumbing').first().waitFor()
  expect(await live.getByText('Preview — not live yet').count()).toBe(0)
  expect(await live.locator('main img').first().getAttribute('src')).toMatch(/^\/photos\/[0-9a-f]{32}\.(webp|jpg)$/)
  await shot(live, '6-live-phone')

  // Reopening the builder brings the saved site back.
  const again = await context.newPage()
  await again.goto(`http://localhost:${BUILDER_PORT}/`)
  await again.getByText(/Build it, section by section/).waitFor({ timeout: 30_000 })

  expect(errors).toEqual([])
  await phone.close()
  await context.close()
}, 300_000)
