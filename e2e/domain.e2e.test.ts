import { generateKeyPairSync } from 'node:crypto'
import { mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import type { Browser, Page } from 'playwright-core'
import { createServer } from 'vite'
import type { ViteDevServer } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { finishedSite } from '../src/publish/test/sites'
import { client, photoBytes } from '../server/test/client'
import { DC_PROVIDER_ID, DOMAIN_VARS, fakeCloudflare } from '../server/test/fakeCloudflare'
import { fakeStripe, PAYMENT_VARS } from '../server/test/fakeStripe'
import { startStack } from '../server/test/stack'
import type { Stack } from '../server/test/stack'
import { launchBrowser } from '../scripts/browser.mjs'

/**
 * "Use your own domain" in real Chrome, against both workers and a fake Cloudflare, DNS and
 * domain company: opened from the welcome email's link, a domain typed and connected, the
 * company's own steps (and one-click where it's offered), then live. axe with colour contrast at
 * desktop and phone width on every state. Phone screenshots go to docs/pm/screenshots/.
 */
const PORT = 8793
const BASE = `localblocks.localhost:${PORT}`
const ADMIN = 'e2e-domains-key-0123456789abcdef'
const APP_PORT = 5197
const APP = `http://localhost:${APP_PORT}`
const SHOTS = join(process.cwd(), 'docs', 'pm', 'screenshots')
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')
const VIEWPORTS = [
  { name: 'desktop', viewport: { width: 1280, height: 900 }, isMobile: false },
  { name: 'phone', viewport: { width: 390, height: 844 }, isMobile: true },
] as const

const stripe = fakeStripe()
const cf = fakeCloudflare()
const dcKey = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } })
let stack: Stack
let vite: ViteDevServer
let browser: Browser

beforeAll(async () => {
  mkdirSync(SHOTS, { recursive: true })
  stack = await startStack({
    baseDomain: BASE, port: PORT, https: true, adminToken: ADMIN, builderOrigins: APP,
    vars: { ...PAYMENT_VARS, ...DOMAIN_VARS, DC_PROVIDERS: 'godaddy', DC_PROVIDER_ID, DC_PRIVATE_KEY: dcKey.privateKey },
    outbound: async req => (await cf.handle(req.clone())) ?? stripe.handle(req),
  })
  cf.addDcProvider('api.dc.godaddy.test', 'GoDaddy', 'GoDaddy')
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

let n = 0
/** A paid, live site; resolves to its edit link's token, from the welcome email. */
async function paidSite(slug: string): Promise<string> {
  const c = client(stack, BASE)
  const key = await c.newDraft()
  const hero = await c.upload(key)
  const about = await c.upload(key, photoBytes('kitchen.jpg'))
  const email = `e2e-domain${++n}@example.com`
  await c.save(key, finishedSite({ business: { email }, content: { photos: { hero: { url: hero, alt: 'A new boiler' }, about: { url: about, alt: 'The van' }, gallery: [] } } }))
  expect((await c.checkout(key, slug)).status).toBe(201)
  expect((await stack.fetch(...await stripe.webhook(`https://api.${BASE}`, stripe.completed(stripe.lastSession().id)))).status).toBe(200)
  const welcome = stripe.emailsTo(email).find(e => e.subject.startsWith('Your site is live'))!
  return /#domain=([\w.-]+)/.exec(welcome.text)![1]
}

async function open(token: string, vp: typeof VIEWPORTS[number]) {
  const context = await browser.newContext({ viewport: vp.viewport, isMobile: vp.isMobile, hasTouch: vp.isMobile, ignoreHTTPSErrors: true })
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${APP}/build/#domain=${token}`)
  await page.getByRole('heading', { name: 'Use your own domain' }).waitFor()
  return { page, errors, close: () => context.close() }
}

/** axe clean, no sideways scrolling on a phone, and (phone) a full-page screenshot for the PM. */
async function check(page: Page, vp: typeof VIEWPORTS[number], shot: string) {
  expect(await axe(page), `${shot} @${vp.name}`).toEqual([])
  if (vp.isMobile) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${shot} scrolls sideways`).toBe(true)
    await page.screenshot({ path: join(SHOTS, `own-domain-${shot}-phone.png`), fullPage: true })
  }
}

describe('use your own domain', () => {
  for (const vp of VIEWPORTS) {
    it(`connects a domain step by step, then shows it live (${vp.name})`, async () => {
      const token = await paidSite(`e2e-own-${vp.name}`)
      const domain = `e2e-${vp.name}-plumbing.co.uk`
      cf.addDomain(domain, ['ns1045.ui-dns.com', 'ns1083.ui-dns.org'])
      const { page, errors, close } = await open(token, vp)
      // The key leaves the address bar.
      expect(new URL(page.url()).hash).toBe('#domain')
      await page.getByLabel('Your domain').waitFor()
      await check(page, vp, '1-enter')

      await page.getByLabel('Your domain').fill(`https://www.${domain}/`)
      await page.getByRole('button', { name: 'Connect my domain' }).click()
      await page.getByText('Waiting for your domain').waitFor()
      expect(await page.getByRole('heading', { name: 'At IONOS' }).isVisible()).toBe(true)
      expect(await page.getByText('domains.localblocks.test').first().isVisible()).toBe(true)
      await check(page, vp, '2-steps')

      // Cloudflare says it's live: coming back to the page shows it.
      cf.goLive(`www.${domain}`)
      // (The server asks Cloudflare at most every 15 seconds: as if that long has passed.)
      await (await stack.db()).prepare('UPDATE custom_domains SET checked_at = 1').run()
      await page.getByRole('button', { name: 'Check now' }).click()
      await page.getByText('Live', { exact: true }).waitFor()
      expect(await page.getByRole('link', { name: `www.${domain}` }).getAttribute('href')).toBe(`https://www.${domain}/`)
      await check(page, vp, '4-live')
      expect(errors).toEqual([])
      await close()
    }, 180_000)
  }

  it('offers one click where the domain company takes our template', async () => {
    const token = await paidSite('e2e-one-click')
    cf.addDomain('e2e-oneclick.co.uk', ['ns01.domaincontrol.com'], { domainConnect: 'api.dc.godaddy.test' })
    for (const vp of VIEWPORTS) {
      const { page, errors, close } = await open(token, vp)
      if (vp.name === 'desktop') {
        await page.getByLabel('Your domain').fill('e2e-oneclick.co.uk')
        await page.getByRole('button', { name: 'Connect my domain' }).click()
      }
      const button = page.getByRole('link', { name: 'Connect automatically with GoDaddy' })
      await button.waitFor()
      expect(await button.getAttribute('href')).toMatch(/^https:\/\/dcc\.api\.dc\.godaddy\.test\/v2\/domainTemplates\/providers\/localblocks\.test\/services\/website\/apply\?domain=e2e-oneclick\.co\.uk&host=www&/)
      await check(page, vp, '3-one-click')
      expect(errors).toEqual([])
      await close()
    }
  }, 180_000)
})
