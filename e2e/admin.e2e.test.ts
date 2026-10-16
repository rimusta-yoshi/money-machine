import { mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import type { Browser, Page } from 'playwright-core'
import { createServer } from 'vite'
import type { ViteDevServer } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { finishedSite } from '../src/publish/test/sites'
import { client } from '../server/test/client'
import { startStack } from '../server/test/stack'
import type { Stack } from '../server/test/stack'
import { launchBrowser } from '../scripts/browser.mjs'
import { seedSampleEvents } from '../scripts/sample-events'

/**
 * The admin dashboard in real Chrome, over 30 days of sample events (scripts/sample-events.ts):
 * the key is asked for and checked, the funnel, money and breakdowns show, the source filter
 * changes them, and axe (colour contrast on) finds nothing at desktop or phone width.
 * Screenshots land in e2e/screens.
 */
const PORT = 8792
const BASE = `localblocks.localhost:${PORT}`
const ADMIN = 'e2e-dashboard-key-0123456789abcdef'
const APP_PORT = 5196
const APP = `http://localhost:${APP_PORT}`
const SCREENS = join(process.cwd(), 'e2e', 'screens')
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')

let stack: Stack
let vite: ViteDevServer
let browser: Browser

beforeAll(async () => {
  mkdirSync(SCREENS, { recursive: true })
  stack = await startStack({ baseDomain: BASE, port: PORT, https: true, adminToken: ADMIN, builderOrigins: APP })
  await seedSampleEvents(stack, ADMIN, BASE)
  process.env.VITE_API_URL = `https://api.${BASE}`
  vite = await createServer({ server: { port: APP_PORT, strictPort: true }, logLevel: 'error' })
  await vite.listen()
  browser = await launchBrowser()
}, 120_000)
afterAll(async () => {
  await browser?.close()
  await vite?.close()
  await stack?.close()
}, 60_000)

async function axe(page: Page): Promise<string[]> {
  await page.evaluate(axeSource)
  return page.evaluate(async () => {
    const w = window as unknown as { axe: { run: (ctx: object, o: object) => Promise<{ violations: { id: string; nodes: { target: string[]; failureSummary?: string }[] }[] }> } }
    const r = await w.axe.run(document, { rules: { 'color-contrast': { enabled: true } } })
    return r.violations.flatMap(v => v.nodes.map(n => `${v.id}: ${n.target.join(' ')} ${n.failureSummary?.split('\n').slice(1).join(' ') ?? ''}`))
  })
}

async function open(viewport: { width: number; height: number }, isMobile = false) {
  const context = await browser.newContext({ viewport, isMobile, hasTouch: isMobile, ignoreHTTPSErrors: true })
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${APP}/admin/`)
  return { page, errors, close: () => context.close() }
}

const signIn = async (page: Page, key: string) => {
  await page.getByLabel('Admin key').fill(key)
  await page.getByRole('button', { name: 'Show the numbers' }).click()
}

describe('admin dashboard', () => {
  it('asks for the key, and refuses a wrong one', async () => {
    const { page, errors, close } = await open({ width: 1360, height: 900 })
    await expect.poll(() => page.getByLabel('Admin key').isVisible()).toBe(true)
    expect(await axe(page)).toEqual([])
    await signIn(page, 'not-the-key-0123456789abcdefgh')
    await page.getByRole('alert').getByText('That admin key is not right.').waitFor()
    expect(await page.getByRole('heading', { name: 'Funnel' }).count()).toBe(0)
    expect(errors).toEqual([])
    await close()
  })

  it('shows the funnel, money and breakdowns, filters by ad source, and passes axe', async () => {
    const { page, errors, close } = await open({ width: 1360, height: 900 })
    await signIn(page, ADMIN)
    await page.getByRole('heading', { name: 'Funnel' }).waitFor()
    const landed = () => page.getByRole('row', { name: /Landed on homepage/ }).locator('td').first().textContent()
    const all = Number((await landed())?.replace(/,/g, ''))
    expect(all).toBeGreaterThan(100)
    await expect.poll(() => page.locator('.ad-funnel .is-drop').count()).toBe(1)
    await page.getByText(/Biggest drop:/).waitFor()
    expect(await page.locator('.ad-tile').filter({ hasText: 'Sales' }).locator('.ad-big').textContent()).not.toBe('0')
    expect(await axe(page)).toEqual([])
    await page.screenshot({ path: join(SCREENS, 'admin-desktop.png'), fullPage: true })

    // Filtered to one ad: fewer landings, and every recent site came from it.
    await page.getByLabel('Ad source').selectOption('fb')
    await expect.poll(async () => Number((await landed())?.replace(/,/g, ''))).toBeLessThan(all)
    const sources = await page.locator('table').filter({ hasText: 'Status' }).locator('tbody tr td:nth-child(5)').allTextContents()
    expect(sources.length).toBeGreaterThan(0)
    expect(sources.every(s => s.startsWith('fb'))).toBe(true)

    // A custom range the wrong way round is refused, a right one loads.
    await page.getByRole('button', { name: 'Custom' }).click()
    await page.getByLabel('From').fill('2030-01-02')
    await page.getByLabel('To', { exact: true }).fill('2030-01-01')
    await page.getByText('Choose a start date on or before the end date.').waitFor()
    await page.getByRole('button', { name: 'Today' }).click()
    await page.getByRole('button', { name: 'Trade' }).click()
    // Which trades the random sample data has today (under the ad filter) varies: any trade row will do.
    await page.getByRole('cell', { name: /^(Plumber|Painter|Roofer|Electrician|Landscaper)$/ }).first().waitFor()
    expect(errors).toEqual([])
    await close()
  })

  it('reads on a phone: no sideways scrolling of the page, and passes axe', async () => {
    const { page, errors, close } = await open({ width: 390, height: 844 }, true)
    await signIn(page, ADMIN)
    await page.getByRole('heading', { name: 'Funnel' }).waitFor()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    expect(await axe(page)).toEqual([])
    await page.screenshot({ path: join(SCREENS, 'admin-phone.png'), fullPage: true })
    expect(errors).toEqual([])
    await close()
  })

  it('takes a site down by its address and restores it, and Sites to review can too, on a phone, passing axe', async () => {
    const c = client(stack, BASE)
    const key = await c.newDraft()
    expect((await c.save(key, finishedSite({ business: { name: 'E2E Bank Helpers', about: 'Online banking help: log in here' } }))).status).toBe(200)
    expect((await c.publish(key, 'e2e-takedown', ADMIN)).status).toBe(200)
    const siteUrl = `https://e2e-takedown.${BASE}/`
    expect((await stack.fetch(siteUrl)).status).toBe(200)

    const { page, errors, close } = await open({ width: 1360, height: 900 })
    await signIn(page, ADMIN)
    await page.getByLabel('Site address').fill(`e2e-takedown.${BASE}`)
    await page.getByRole('button', { name: 'Find', exact: true }).click()
    const found = page.getByRole('region', { name: 'Found: E2E Bank Helpers' })
    await found.getByText('Published (admin)').waitFor()
    await found.getByRole('button', { name: 'Take down E2E Bank Helpers' }).click()
    await page.getByLabel('Why is it coming down?').fill('E2E: phishing login page')
    expect(await axe(page)).toEqual([])
    await page.screenshot({ path: join(SCREENS, 'admin-takedown-desktop.png'), fullPage: true })
    await page.getByRole('button', { name: 'Yes, take it down' }).click()
    await page.getByText('E2E Bank Helpers is taken down.').waitFor()
    await found.getByText('E2E: phishing login page').waitFor()
    expect((await stack.fetch(siteUrl)).status).toBe(410)

    await found.getByRole('button', { name: 'Restore E2E Bank Helpers' }).click()
    await page.getByRole('button', { name: 'Yes, restore it' }).click()
    await page.getByText('E2E Bank Helpers is back online.').waitFor()
    expect((await stack.fetch(siteUrl)).status).toBe(200)
    expect(errors).toEqual([])
    await close()

    // On a phone, from its row in Sites to review: the form fits, and passes axe.
    const phone = await open({ width: 390, height: 844 }, true)
    await signIn(phone.page, ADMIN)
    const row = phone.page.getByRole('row').filter({ hasText: 'E2E Bank Helpers' })
    // The screen-reader-only part of the name may come with a space before it.
    await row.getByRole('button', { name: /^Take down\s*: E2E Bank Helpers$/ }).click()
    await phone.page.getByLabel('Why is it coming down?').fill('E2E: scam')
    // The phone's own width (a page wider than it would make a mobile browser zoom out, widening innerWidth too).
    expect(await phone.page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    expect(await axe(phone.page)).toEqual([])
    await phone.page.screenshot({ path: join(SCREENS, 'admin-takedown-phone.png'), fullPage: true })
    await phone.page.getByRole('button', { name: 'Yes, take it down' }).click()
    await row.getByText('Taken down').waitFor()
    expect((await stack.fetch(siteUrl)).status).toBe(410)
    await row.getByRole('button', { name: /^Restore\s*: E2E Bank Helpers$/ }).click()
    await phone.page.getByRole('button', { name: 'Yes, restore it' }).click()
    await phone.page.getByText('E2E Bank Helpers is back online.').waitFor()
    expect((await stack.fetch(siteUrl)).status).toBe(200)
    expect(phone.errors).toEqual([])
    await phone.close()
  })
})
