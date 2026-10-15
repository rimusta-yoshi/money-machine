import { mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
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
 * The phone builder in real Chrome on a phone-sized screen, end to end: swipe and step through
 * a section's layouts in the slim bar, Edit opens just its fields under the live section (the
 * keyboard-open case too), a headline suggestion and the customer's own, a tall photo with its
 * focal point, Done moves on, tapping an earlier section returns to its bar, "Email me a link to
 * finish on my computer" (Resend faked) opens the site on a computer, and on to Go live, where
 * checkout flags the site's wording for review on the admin dashboard. axe runs on every new
 * state. Screenshots land in e2e/screens.
 */
const PORT = 8794
const BASE = `localblocks.localhost:${PORT}`
const ADMIN = 'e2e-phone-admin-key-0123456789abcdef'
const BUILDER_PORT = 5199
const BUILDER = `http://localhost:${BUILDER_PORT}`
const SCREENS = join(process.cwd(), 'e2e', 'screens')
const PHONE = { width: 390, height: 844 }
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')

let stack: Stack
let vite: ViteDevServer
let browser: Browser
const stripe = fakeStripe()

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

const shot = (page: Page, name: string) => page.screenshot({ path: join(SCREENS, `phone-${name}.png`) })

/** axe over the builder's own UI (the generated site has its own checks), colour contrast on. */
async function axe(page: Page): Promise<string[]> {
  await page.evaluate(axeSource)
  return page.evaluate(async () => {
    const w = window as unknown as { axe: { run: (ctx: object, o: object) => Promise<{ violations: { id: string; nodes: { target: string[]; failureSummary?: string }[] }[] }> } }
    const r = await w.axe.run({ exclude: [['.sb-generated'], ['.mm-example']] }, { rules: { 'color-contrast': { enabled: true } } })
    return r.violations.flatMap(v => v.nodes.map(n => `${v.id}: ${n.target.join(' ')} ${n.failureSummary?.split('\n').slice(1).join(' ') ?? ''}`))
  })
}

async function check(page: Page, name: string) {
  await page.waitForTimeout(500)
  await shot(page, name)
  expect(await axe(page), name).toEqual([])
}

const line = (page: Page) => page.locator('.bd-bar-line').textContent()

/** A swipe across the preview, as a finger would: right to left shows the next layout. */
const swipe = (page: Page, dx: number) => page.evaluate(d => {
  const el = document.querySelector('.mm-stack-view')!
  const touch = (x: number) => new Touch({ identifier: 1, target: el, clientX: x, clientY: 400 })
  el.dispatchEvent(new TouchEvent('touchstart', { touches: [touch(200)], changedTouches: [touch(200)], bubbles: true }))
  el.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touch(200 + d)], bubbles: true }))
}, dx)

/** A tall photo, drawn in the page (a red spot near the top right is the important part). */
async function tallPhoto(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(async () => {
    const c = document.createElement('canvas')
    c.width = 600
    c.height = 1000
    const g = c.getContext('2d')!
    g.fillStyle = '#8fb0c8'
    g.fillRect(0, 0, 600, 1000)
    g.fillStyle = '#c0392b'
    g.beginPath()
    g.arc(450, 250, 60, 0, Math.PI * 2)
    g.fill()
    const blob = await new Promise<Blob>(r => c.toBlob(b => r(b!), 'image/jpeg', 0.9))
    const bytes = new Uint8Array(await blob.arrayBuffer())
    let s = ''
    for (const x of bytes) s += String.fromCharCode(x)
    return btoa(s)
  })
  return Buffer.from(b64, 'base64')
}

/** Presses Done once it's ready (it waits while the section's layouts catch up with an edit). */
async function done(page: Page, then: ReturnType<Page['getByRole']>) {
  const button = page.getByRole('button', { name: 'Done', exact: true })
  await expect.poll(async () => {
    if (await then.isVisible()) return true
    if (await button.isVisible() && await button.isEnabled()) await button.click({ timeout: 2000 }).catch(() => undefined)
    return then.isVisible()
  }, { timeout: 30_000, interval: 500 }).toBe(true)
}

const nextReady = async (page: Page) => {
  const next = page.locator('.bd-bar .bd-next')
  await expect.poll(() => next.isEnabled(), { timeout: 30_000 }).toBe(true)
  return next
}

it('builds a site on a phone, one section at a time', async () => {
  const context = await browser.newContext({ viewport: PHONE, isMobile: true, hasTouch: true, ignoreHTTPSErrors: true, reducedMotion: 'reduce' })
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  await page.goto(`${BUILDER}/build/?tester=${TESTER_CODE}&trade=plumber`)
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Business name').fill('Riverside Plumbing')
  await page.getByLabel('Where do you work?').fill('Harrogate')
  await page.getByLabel('Phone number').fill('01632 960 123')
  await page.getByRole('button', { name: 'Next: your look' }).click()
  await page.getByRole('button', { name: 'Start building' }).click()

  // 1. The slim bar: ‹ Edit hero ›, the layout line, Next. No pills on the site.
  await page.getByRole('button', { name: 'Edit hero', exact: true }).waitFor({ timeout: 30_000 })
  await expect.poll(() => line(page), { timeout: 30_000 }).toMatch(/^Hero · .+ · 1 of \d+ · swipe to change$/)
  expect(await page.locator('.mm-band-tag').count()).toBe(0)
  expect(await page.getByRole('button', { name: /use this layout/i }).count()).toBe(0)
  await check(page, '1-bar')
  await swipe(page, -120)
  await expect.poll(() => line(page)).toMatch(/ · 2 of \d+ · /)
  await page.getByRole('button', { name: 'Next layout' }).click()
  await expect.poll(() => line(page)).toMatch(/ · 3 of \d+ · /)
  await page.getByRole('button', { name: 'Previous layout' }).click()
  await expect.poll(() => line(page)).toMatch(/ · 2 of \d+ · /)

  // 2. Edit hero: just the hero above its fields, focus in the panel.
  await page.getByRole('button', { name: 'Edit hero', exact: true }).click()
  const title = page.getByRole('heading', { name: 'Your hero' })
  await title.waitFor()
  expect(await title.evaluate(el => el === document.activeElement)).toBe(true)
  await expect.poll(() => page.locator('.mm-band:visible').count()).toBe(1)
  // Headline suggestions: three, with the town; picking one updates the site above.
  const options = page.locator('.mm-headline-opt')
  expect(await options.count()).toBe(3)
  expect((await options.allTextContents()).filter(t => t.includes('Harrogate')).length).toBe(2)
  const picked = (await options.nth(0).textContent())!
  await options.nth(0).click()
  const h1 = page.locator('.mm-band.active h1')
  await expect.poll(() => h1.textContent(), { timeout: 30_000 }).toBe(picked)
  await check(page, '2-headline-suggestions')

  // The keyboard opens: the screen shrinks, and the headline being typed stays in view above the field.
  const own = page.getByLabel('Or write your own')
  await own.focus()
  await page.setViewportSize({ width: PHONE.width, height: 420 })
  await own.fill('Harrogate plumbing: log in to book online')
  await expect.poll(() => h1.textContent(), { timeout: 30_000 }).toBe('Harrogate plumbing: log in to book online')
  await page.waitForTimeout(400)
  const inView = async (selector: string) => {
    const box = await page.locator(selector).first().boundingBox()
    return !!box && box.y >= 0 && box.y + Math.min(box.height, 40) <= 420
  }
  expect(await inView('.mm-band.active h1')).toBe(true)
  expect(await own.boundingBox().then(b => !!b && b.y >= 0 && b.y + b.height <= 420)).toBe(true)
  await check(page, '3-edit-keyboard')
  await page.setViewportSize(PHONE)

  // A tall photo: "Add your photo", then tap the important part; every crop centres on it.
  expect(await page.getByText('No photo to hand? Carry on. We’ll remind you before you go live.').count()).toBe(1)
  await page.locator('.bd-phone-edit input[type=file]').first().setInputFiles({ name: 'van.jpg', mimeType: 'image/jpeg', buffer: await tallPhoto(page) })
  const focusPhoto = page.locator('.mm-focus-photo img')
  await focusPhoto.waitFor({ timeout: 30_000 })
  const box = (await focusPhoto.boundingBox())!
  await focusPhoto.click({ position: { x: box.width * 0.75, y: box.height * 0.25 } })
  await expect.poll(() => page.locator('.mm-band.active .sb-generated img').first().getAttribute('style'), { timeout: 30_000 })
    .toMatch(/object-position:(7[4-6])% (2[4-6])%/)
  await check(page, '4-focal-point')

  // The Computer preview: the desktop layout, scaled down.
  await page.getByRole('button', { name: 'Computer', exact: true }).click()
  await expect.poll(() => page.locator('.mm-zoom-inner').evaluate(el => el.getBoundingClientRect().width)).toBeLessThan(PHONE.width)
  await page.getByRole('button', { name: 'Phone', exact: true }).click()

  // 3. Done moves straight on to the next section's bar, focus on its Edit button.
  const editTrust = page.getByRole('button', { name: 'Edit trust bar', exact: true })
  await done(page, editTrust)
  expect(await editTrust.evaluate(el => el === document.activeElement)).toBe(true)

  // 4. Tapping an earlier section goes back to its bar, not its fields.
  await page.getByRole('button', { name: 'Edit Hero section' }).click()
  await page.getByRole('button', { name: 'Edit hero', exact: true }).waitFor({ timeout: 30_000 })
  expect(await page.getByRole('heading', { name: 'Your hero' }).count()).toBe(0)
  await (await nextReady(page)).click()
  await editTrust.waitFor({ timeout: 30_000 })

  // The bar never covers the end of the site: scrolled to the bottom, the last section clears it.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(300)
  const ends = await page.evaluate(() => ({
    site: [...document.querySelectorAll('.mm-band')].at(-1)!.getBoundingClientRect().bottom,
    bar: document.querySelector('.bd-bar')!.getBoundingClientRect().top,
  }))
  expect(ends.site).toBeLessThanOrEqual(ends.bar)

  // "Email me a link to finish on my computer": saved and emailed; the link opens it on a computer.
  await editTrust.click()
  await page.getByRole('button', { name: 'Email me a link to finish on my computer' }).click()
  await page.getByLabel('Email the link to').fill('joe@riverside.example')
  await page.getByLabel(/Remind me once/).check()
  await page.getByRole('button', { name: 'Email me the link' }).click()
  await page.getByText('We\'ve sent a link to joe@riverside.example.').waitFor({ timeout: 30_000 })
  await check(page, '5-resume-link')
  const resumeEmail = stripe.emailsTo('joe@riverside.example').find(e => e.subject === 'Finish your website on your computer')!
  expect(resumeEmail.text).not.toContain('Riverside')
  const resumeUrl = new RegExp(`${BUILDER}/build/#resume=[\\w.-]+`).exec(resumeEmail.text)![0]
  const computer = await browser.newContext({ viewport: { width: 1360, height: 900 }, ignoreHTTPSErrors: true })
  const desk = await computer.newPage()
  desk.on('pageerror', e => errors.push(e.message))
  await desk.goto(resumeUrl)
  await desk.getByRole('heading', { name: 'Hero' }).waitFor({ timeout: 30_000 })
  await desk.getByText('Harrogate plumbing: log in to book online').first().waitFor({ timeout: 30_000 })
  expect(desk.url()).not.toContain('#resume=')
  await computer.close()
  await done(page, page.getByRole('button', { name: 'Edit services', exact: true }))

  // Next skips editing, section after section, to Go live.
  for (let i = 0; i < 20; i++) {
    const next = await nextReady(page)
    const label = await next.textContent()
    await next.click()
    if (label?.includes('go live')) break
    // A Next just after Done is ignored (a double tap): press again until the section changes.
    await expect.poll(async () => {
      if (await next.textContent() !== label) return true
      if (await next.isEnabled()) await next.click()
      return await next.textContent() !== label
    }, { timeout: 30_000, interval: 500 }).toBe(true)
  }
  await page.getByRole('heading', { name: /Nearly there, Riverside Plumbing/ }).waitFor({ timeout: 60_000 })
  await check(page, '6-go-live')

  // Checkout flags the site's wording for review: the customer sees nothing of it.
  await page.getByLabel('Your email').fill('joe@riverside.example')
  await page.getByText(/riverside-plumbing\.localblocks\.localhost:8794 is free\./).waitFor({ timeout: 30_000 })
  await page.route('https://checkout.stripe.test/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Stripe</title><h1>Pay</h1>' }))
  await page.getByRole('button', { name: 'Go live for £99' }).click()
  await page.waitForURL(/checkout\.stripe\.test/, { timeout: 60_000 })
  const review = await stack.fetch(`https://api.${BASE}/v1/admin/review`, { headers: { 'X-Admin-Key': ADMIN } })
  expect(review.status).toBe(200)
  const { sites } = await review.json() as { sites: { slug: string | null; words: string[] }[] }
  expect(sites.find(s => s.words.includes('log in'))).toBeTruthy()

  expect(errors).toEqual([])
  await context.close()
}, 400_000)
