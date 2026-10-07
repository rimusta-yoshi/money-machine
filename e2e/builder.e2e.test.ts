import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Browser, Page } from 'playwright-core'
import { createServer } from 'vite'
import type { ViteDevServer } from 'vite'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { TESTER_CODE } from '../server/test/client'
import { fakeStripe, PAYMENT_VARS } from '../server/test/fakeStripe'
import { startStack } from '../server/test/stack'
import type { Stack } from '../server/test/stack'
import { launchBrowser } from '../scripts/browser.mjs'

/**
 * The real builder, end to end: the basics, your look, add a photo, go through the sections,
 * get a preview link, go live through checkout (a fake Stripe: its page is stood in for in the
 * browser, and the test sends the signed webhook), see it live, open the edit link on another
 * device and publish a change, then refund it with the refund link. Screenshots land in
 * e2e/screens (ignored by git) for a look by eye.
 */
const PORT = 8791
const BASE = `siteblocks.localhost:${PORT}`
const ADMIN = 'e2e-admin-key-0123456789abcdef'
const BUILDER_PORT = 5198
const SCREENS = join(process.cwd(), 'e2e', 'screens')

let stack: Stack
let vite: ViteDevServer
let browser: Browser
const stripe = fakeStripe()
const BUILDER = `http://localhost:${BUILDER_PORT}`

beforeAll(async () => {
  mkdirSync(SCREENS, { recursive: true })
  stack = await startStack({
    baseDomain: BASE, port: PORT, https: true, adminToken: ADMIN, builderOrigins: BUILDER,
    vars: { ...PAYMENT_VARS, APP_URL: BUILDER }, outbound: stripe.handle,
  })
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

/** Presses each section's Next button through to the go-live step. */
async function throughSections(page: Page): Promise<void> {
  for (let i = 0; i < 20; i++) {
    const next = page.getByRole('button', { name: /^Next: / })
    await expect.poll(() => next.isEnabled(), { timeout: 30_000 }).toBe(true)
    const label = await next.textContent()
    await next.click()
    if (label?.includes('go live')) break
  }
  await page.getByText(/Nearly there/).waitFor({ timeout: 60_000 })
}

it('builds, previews, pays for, edits and refunds a site from the builder', async () => {
  const context = await browser.newContext({ viewport: { width: 1360, height: 900 }, ignoreHTTPSErrors: true })
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  // Before launch: a tester link (the code is kept for the tab and taken out of the address).
  await page.goto(`${BUILDER}/build/?tester=${TESTER_CODE}`)
  await page.getByRole('radio', { name: 'Plumber' }).check({ force: true })
  await page.getByLabel('Business name').fill('Riverside Plumbing')
  await page.getByLabel('Phone number').fill('0113 496 0123')
  await page.getByLabel('Where do you work?').fill('Leeds')
  await page.getByRole('button', { name: 'Next: your look' }).click()
  await page.getByRole('button', { name: 'Start building' }).click()

  // A photo for the hero: prepared in the browser now, uploaded when the builder saves.
  const file = page.locator('input[type=file]').first()
  await file.setInputFiles(join(process.cwd(), 'reference', 'sample-photos', 'bathroom.jpg'))
  await expect.poll(() => page.getByRole('status').filter({ hasText: 'Saved' }).count(), { timeout: 30_000 }).toBeGreaterThan(0)
  await shot(page, '1-build-saved')

  await throughSections(page)
  // The email is asked for here now, for the receipt and edit link.
  await page.getByLabel('Your email').fill('hello@riverside.example')

  // Preview link.
  await page.getByRole('button', { name: 'Share a preview link first' }).click()
  await page.getByRole('button', { name: 'Get a preview link' }).click()
  const previewUrl = await page.getByLabel('Preview link').inputValue({ timeout: 30_000 })
  expect(previewUrl).toMatch(new RegExp(`^https://preview\\.${BASE.replace('.', '\\.')}/[A-Za-z0-9_-]{32}/$`))
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

  // Go live: checkout. Stripe's page is stood in for; paying there sends the signed webhook.
  const slug = page.getByLabel('Your web address')
  expect(await slug.inputValue()).toBe('riverside-plumbing')
  await page.getByText(/riverside-plumbing\.siteblocks\.localhost:8791 is free\./).waitFor({ timeout: 30_000 })
  // Not launched yet: the tester code from the link is filled in.
  expect(await page.getByLabel('Tester code').inputValue()).toBe(TESTER_CODE)
  await shot(page, '4-go-live-panel')
  await page.route('https://checkout.stripe.test/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Stripe</title><h1>Pay</h1>' }))
  await page.getByRole('button', { name: 'Go live for £99' }).click()
  await page.waitForURL(/checkout\.stripe\.test/, { timeout: 60_000 })
  const session = stripe.lastSession()
  expect(session).toMatchObject({ amount: 9900, currency: 'gbp', email: 'hello@riverside.example', slug: 'riverside-plumbing' })
  // Stripe can send the customer back before the webhook lands: the page waits for it.
  await page.goto(session.successUrl.replace('{CHECKOUT_SESSION_ID}', session.id))
  await page.getByText('Publishing your site…').waitFor()
  expect((await stack.fetch(...await stripe.webhook(`https://api.${BASE}`, stripe.completed(session.id)))).status).toBe(200)
  await page.getByRole('heading', { name: 'Your site is live' }).waitFor({ timeout: 30_000 })
  await shot(page, '5-paid-live')

  const live = await phone.newPage()
  const res = await live.goto(`https://riverside-plumbing.${BASE}/`)
  expect(res?.status()).toBe(200)
  await live.getByText('Riverside Plumbing').first().waitFor()
  expect(await live.getByText('Preview — not live yet').count()).toBe(0)
  expect(await live.locator('main img').first().getAttribute('src')).toMatch(/^\/photos\/[0-9a-f]{32}\.(webp|jpg)$/)
  await shot(live, '6-live-phone')

  // Reopening the builder in this browser brings the site back (kept in the browser).
  const again = await context.newPage()
  await again.goto(`${BUILDER}/build/`)
  await again.getByRole('heading', { name: 'Hero' }).waitFor({ timeout: 30_000 })

  // The welcome email (through the fake Resend) holds the edit and refund links.
  const welcome = stripe.emailsTo('hello@riverside.example').find(e => e.subject.startsWith('Your site is live'))!
  const link = (kind: string) => new RegExp(`${BUILDER}/build/#${kind}=[\\w.-]+`).exec(welcome.text)![0]

  // The edit link on another device: the site opens, and a change goes live for free.
  const other = await browser.newContext({ viewport: { width: 1360, height: 900 }, ignoreHTTPSErrors: true })
  const edit = await other.newPage()
  edit.on('pageerror', e => errors.push(e.message))
  await edit.goto(link('edit'))
  await edit.getByRole('heading', { name: 'Hero' }).waitFor({ timeout: 30_000 })
  await edit.getByRole('button', { name: /^Basics/ }).click()
  await edit.getByLabel('Business name').fill('Riverside Heating')
  await edit.getByRole('button', { name: 'Next: your look' }).click()
  await edit.getByRole('button', { name: 'Start building' }).click()
  await throughSections(edit)
  await edit.getByRole('button', { name: 'Publish changes' }).click()
  await edit.getByText('It’s live.').waitFor({ timeout: 60_000 })
  await shot(edit, '7-edit-link-published')
  expect(await (await stack.fetch(`https://riverside-plumbing.${BASE}/`)).text()).toContain('Riverside Heating')

  // The refund link: one button, then the site is down.
  const refund = await other.newPage()
  await refund.goto(link('refund'))
  await refund.getByRole('heading', { name: 'Refund £99 and take your site down?' }).waitFor({ timeout: 30_000 })
  await shot(refund, '8-refund-confirm')
  await refund.getByRole('button', { name: 'Refund £99 and take my site down' }).click()
  await refund.getByRole('heading', { name: 'Your refund is on its way' }).waitFor({ timeout: 30_000 })
  const down = await live.goto(`https://riverside-plumbing.${BASE}/`)
  expect(down?.status()).toBe(410)
  await live.getByText('This site is no longer available').waitFor()
  expect(stripe.emailsTo('hello@riverside.example').map(e => e.subject)).toContain('Refund on its way: £99')

  expect(errors).toEqual([])
  await other.close()
  await phone.close()
  await context.close()
}, 400_000)
