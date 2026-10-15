import { generateKeyPairSync, verify } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { finishedSite } from '../../src/publish/test/sites'
import { ADMIN, API, BASE, client, photoBytes } from './client'
import { DC_PROVIDER_ID, DOMAIN_VARS, fakeCloudflare, TARGET } from './fakeCloudflare'
import { fakeStripe, PAYMENT_VARS } from './fakeStripe'
import { startStack } from './stack'
import type { Stack } from './stack'

/**
 * Own domains under Miniflare, against a fake Cloudflare API, DNS and Domain Connect provider:
 * connect → waiting → live → disconnect, the free address's 301, the site worker serving the
 * domain, and refunds, disputes and the cron taking domains off Cloudflare.
 */

const GODADDY = ['ns01.domaincontrol.com', 'ns02.domaincontrol.com']
const CLOUDFLARE_NS = ['ada.ns.cloudflare.com', 'bob.ns.cloudflare.com']

const stripe = fakeStripe()
const cf = fakeCloudflare()
const outbound = async (req: Request) => (await cf.handle(req.clone())) ?? stripe.handle(req)

let s: Stack
let c: ReturnType<typeof client>
beforeAll(async () => {
  s = await startStack({ baseDomain: BASE, adminToken: ADMIN, vars: { ...PAYMENT_VARS, ...DOMAIN_VARS }, outbound })
  c = client(s)
}, 60_000)
afterAll(() => s?.close(), 60_000)

const send = async (event: unknown) => s.fetch(...await stripe.webhook(API, event))
const cron = async (stack: Stack, which: 'quick' | 'daily') => (await stack.mf.getWorker('api')).scheduled({ cron: which === 'quick' ? '*/15 * * * *' : '17 3 * * *' })
const page = (url: string) => s.fetch(url, { redirect: 'manual' })
/** As if the last check was long ago, so the cron and the page ask Cloudflare again. */
const ageChecks = async (stack = s) => (await stack.db()).prepare('UPDATE custom_domains SET checked_at = 1').run()

let n = 0
/** A paid, live site, as after checkout and the webhook. */
async function paidSite(slug: string, stack = s, cl = c) {
  const key = await cl.newDraft()
  const hero = await cl.upload(key)
  const about = await cl.upload(key, photoBytes('kitchen.jpg'))
  const email = `domains${++n}@example.com`
  await cl.save(key, finishedSite({ business: { email }, content: { photos: { hero: { url: hero, alt: 'A new boiler' }, about: { url: about, alt: 'The van' }, gallery: [] } } }))
  expect((await cl.checkout(key, slug)).status).toBe(201)
  const session = stripe.lastSession()
  expect((await stack.fetch(...await stripe.webhook(API, stripe.completed(session.id)))).status).toBe(200)
  return { key, email, session }
}

type View = { domain: Record<string, unknown> | null; available: boolean; freeUrl: string | null }
const status = async (key: string, cl = c) => (await (await cl.call('/v1/draft/domain', { key })).json()) as View
const connect = (key: string, domain: string, cl = c) => cl.call('/v1/draft/domain', { method: 'POST', key, json: { domain } })
const disconnect = (key: string) => c.call('/v1/draft/domain/disconnect', { method: 'POST', key })

describe('connecting a domain', () => {
  it('connects a paid site’s domain, waits for it, then puts the site live under it', async () => {
    const { key, email } = await paidSite('smith-plumbing')
    cf.addDomain('smithplumbing.co.uk', GODADDY)
    expect(await status(key)).toEqual({ domain: null, switchedOn: true, available: true, freeUrl: `https://smith-plumbing.${BASE}/` })

    const res = await connect(key, 'https://SmithPlumbing.co.uk/')
    expect(res.status, await res.clone().text()).toBe(200)
    const view = ((await res.json()) as View).domain!
    expect(view).toMatchObject({
      hostname: 'www.smithplumbing.co.uk', domain: 'smithplumbing.co.uk', host: 'www', apex: null, status: 'pending',
      provider: 'godaddy', providerName: 'GoDaddy', oneClick: null, liveUrl: null,
      records: [{ type: 'CNAME', name: 'www', value: TARGET }],
    })
    expect(cf.byName('www.smithplumbing.co.uk')).toMatchObject({ status: 'pending' })

    // Waiting: the domain already shows the site (only its owner can point it here), the free address doesn't move.
    expect((await page('https://www.smithplumbing.co.uk/')).status).toBe(200)
    expect((await page(`https://smith-plumbing.${BASE}/`)).status).toBe(200)

    // Pointing somewhere else is spotted, as a hint.
    cf.point('www.smithplumbing.co.uk', 'parked.godaddy.example')
    expect((await status(key)).domain).toMatchObject({ status: 'pending', pointsElsewhere: 'parked.godaddy.example' })

    // Cloudflare validates it: the background check (no page open) puts it live.
    cf.point('www.smithplumbing.co.uk', TARGET)
    cf.goLive('www.smithplumbing.co.uk')
    // Just checked by the page: the next background run leaves it alone…
    await cron(s, 'quick')
    expect(await (await s.db()).prepare("SELECT status FROM custom_domains WHERE hostname = 'www.smithplumbing.co.uk'").bind().first()).toEqual({ status: 'pending' })
    // …and picks it up once the check is ten minutes old.
    await ageChecks()
    await cron(s, 'quick')
    expect((await status(key)).domain).toMatchObject({ status: 'active', liveUrl: 'https://www.smithplumbing.co.uk/', pointsElsewhere: null })

    const live = await page('https://www.smithplumbing.co.uk/')
    expect(live.status).toBe(200)
    const html = await live.text()
    expect(html).toContain('<link rel="canonical" href="https://www.smithplumbing.co.uk/"')
    expect(html).toContain('Made with')

    // The free address sends visitors there; photos and fonts stay put (the download fetches them).
    const moved = await page(`https://smith-plumbing.${BASE}/privacy.html?x=1`)
    expect(moved.status).toBe(301)
    expect(moved.headers.get('Location')).toBe('https://www.smithplumbing.co.uk/privacy.html?x=1')
    expect((await page(`https://smith-plumbing.${BASE}/fonts/LICENSES.txt`)).status).toBe(200)
    const sitemap = await (await page('https://www.smithplumbing.co.uk/sitemap.xml')).text()
    if (sitemap.includes('<loc>')) expect(sitemap).toContain('https://www.smithplumbing.co.uk/')

    // One email, however many checks follow.
    await cron(s, 'daily')
    await status(key)
    const mails = stripe.emailsTo(email).filter(e => e.subject.startsWith('Your domain is live'))
    expect(mails).toHaveLength(1)
    expect(mails[0].text).toContain('https://www.smithplumbing.co.uk/')
    expect(mails[0].text).toContain('smithplumbing.co.uk (without the www)')
    expect(((await (await c.call('/v1/draft', { key })).json()) as { publishedUrl: string }).publishedUrl).toBe('https://www.smithplumbing.co.uk/')

    // Republishing keeps the domain.
    expect(await (await c.call('/v1/draft/publish', { method: 'POST', key, json: {} })).json()).toMatchObject({ url: 'https://www.smithplumbing.co.uk/' })

    // Disconnecting: off Cloudflare, back to the free address.
    expect(await (await disconnect(key)).json()).toMatchObject({ domain: null })
    expect(cf.byName('www.smithplumbing.co.uk')).toBeNull()
    expect((await page('https://www.smithplumbing.co.uk/')).status).toBe(404)
    const back = await page(`https://smith-plumbing.${BASE}/`)
    expect(back.status).toBe(200)
    expect(await back.text()).toContain(`<link rel="canonical" href="https://smith-plumbing.${BASE}/"`)
  })

  it('refuses what isn’t a domain, ours, unknown, taken or not paid for', async () => {
    const { key } = await paidSite('refuse-domains')
    const problem = async (domain: string) => (await (await connect(key, domain)).json()) as { error: string; message: string }
    expect(await problem('not a domain')).toMatchObject({ error: 'invalid_domain' })
    expect(await problem('co.uk')).toMatchObject({ error: 'invalid_domain' })
    expect(await problem('192.168.1.1')).toMatchObject({ error: 'invalid_domain' })
    expect(await problem('shop.localblocks.co.uk')).toMatchObject({ error: 'invalid_domain', message: expect.stringContaining('our own') })
    expect(await problem(TARGET)).toMatchObject({ error: 'invalid_domain' })
    expect(await problem('siteblocks.co.uk')).toMatchObject({ error: 'invalid_domain' })
    expect(await problem('never-registered-anywhere.co.uk')).toMatchObject({ error: 'no_such_domain' })
    expect((await connect(key, 'x'.repeat(400))).status).toBe(422)

    cf.addDomain('jonesbuilders.co.uk', GODADDY)
    const other = await paidSite('other-builders')
    expect((await connect(other.key, 'jonesbuilders.co.uk')).status).toBe(200)
    expect(await problem('www.jonesbuilders.co.uk')).toMatchObject({ error: 'domain_taken' })
    // One per site.
    cf.addDomain('jones2.co.uk', GODADDY)
    expect(((await (await connect(other.key, 'jones2.co.uk')).json()) as { error: string }).error).toBe('has_domain')

    const unpaid = await c.newDraft()
    await c.save(unpaid, finishedSite())
    expect(((await (await connect(unpaid, 'jones2.co.uk')).json()) as { error: string }).error).toBe('not_live')
    expect((await status(unpaid)).available).toBe(false)
    expect((await c.call('/v1/draft/domain')).status).toBe(401)
  })

  it('handles international domains in their plain-letters form', async () => {
    const { key } = await paidSite('cafe-domain')
    cf.addDomain('xn--caf-dma.co.uk', GODADDY)
    expect(((await (await connect(key, 'café.co.uk')).json()) as View).domain).toMatchObject({ hostname: 'www.xn--caf-dma.co.uk' })
  })

  it('connects the bare domain too when the DNS is on Cloudflare, and sends it to www', async () => {
    const { key } = await paidSite('flat-roofs')
    cf.addDomain('flatroofs.co.uk', CLOUDFLARE_NS)
    const view = ((await (await connect(key, 'flatroofs.co.uk')).json()) as View).domain!
    expect(view).toMatchObject({ apex: 'flatroofs.co.uk', provider: 'cloudflare', records: [{ name: 'www' }, { name: '@', value: TARGET }] })
    expect(cf.byName('flatroofs.co.uk')).not.toBeNull()
    cf.goLive('www.flatroofs.co.uk')
    await status(key)
    const bare = await page('https://flatroofs.co.uk/services?a=b')
    expect(bare.status).toBe(301)
    expect(bare.headers.get('Location')).toBe('https://www.flatroofs.co.uk/services?a=b')
  })

  it('goes back to the free address when the domain stops pointing at us', async () => {
    const { key } = await paidSite('moved-away')
    cf.addDomain('movedaway.co.uk', GODADDY)
    await connect(key, 'movedaway.co.uk')
    cf.goLive('www.movedaway.co.uk')
    await status(key)
    expect((await page(`https://moved-away.${BASE}/`)).status).toBe(301)
    cf.moveAway('www.movedaway.co.uk')
    await ageChecks()
    await cron(s, 'daily')
    expect((await status(key)).domain).toMatchObject({ status: 'pending' })
    expect((await page(`https://moved-away.${BASE}/`)).status).toBe(200)
  })
})

describe('switched off', () => {
  it('without the Cloudflare token the page says so, and nothing reaches Cloudflare', async () => {
    const off = await startStack({ baseDomain: BASE, adminToken: ADMIN, vars: { ...PAYMENT_VARS, CF_ZONE_ID: DOMAIN_VARS.CF_ZONE_ID }, outbound })
    try {
      const oc = client(off)
      const { key } = await paidSite('switched-off', off, oc)
      expect(await status(key, oc)).toMatchObject({ domain: null, switchedOn: false, available: false })
      const calls = cf.calls.length
      expect(((await (await connect(key, 'example.co.uk', oc)).json()) as { error: string }).error).toBe('domains_closed')
      expect(cf.calls.length).toBe(calls)
      // The free address is served as ever (the site worker's lookup finds nothing).
      expect((await off.fetch(`https://switched-off.${BASE}/`)).status).toBe(200)
    } finally {
      await off.close()
    }
  }, 60_000)
})

describe('when a site ends', () => {
  it('a refund takes the domain off Cloudflare', async () => {
    const { key, session } = await paidSite('refund-domain')
    cf.addDomain('refunddomain.co.uk', GODADDY)
    await connect(key, 'refunddomain.co.uk')
    cf.goLive('www.refunddomain.co.uk')
    await status(key)
    expect((await send(stripe.chargeRefunded(session.paymentIntent))).status).toBe(200)
    expect(cf.byName('www.refunddomain.co.uk')).toBeNull()
    expect((await page('https://www.refunddomain.co.uk/')).status).toBe(404)
    expect((await status(key)).domain).toBeNull()
  })

  it('a dispute pauses it, and a won dispute puts it back', async () => {
    const { key, session } = await paidSite('dispute-domain')
    cf.addDomain('disputedomain.co.uk', GODADDY)
    await connect(key, 'disputedomain.co.uk')
    cf.goLive('www.disputedomain.co.uk')
    await status(key)
    await send(stripe.dispute(session.paymentIntent, 'created'))
    expect(cf.byName('www.disputedomain.co.uk')).toBeNull()
    expect((await page('https://www.disputedomain.co.uk/')).status).toBe(404)
    expect((await status(key)).domain).toMatchObject({ status: 'paused' })
    expect(((await (await connect(key, 'other.co.uk')).json()) as { error: string }).error).toBe('disputed')

    await send(stripe.dispute(session.paymentIntent, 'closed', 'won'))
    expect(cf.byName('www.disputedomain.co.uk')).toMatchObject({ status: 'pending' })
    cf.goLive('www.disputedomain.co.uk')
    expect((await status(key)).domain).toMatchObject({ status: 'active' })
  })

  it('the cron finishes a removal Cloudflare refused at the time', async () => {
    const { key, session } = await paidSite('flaky-cloudflare')
    cf.addDomain('flakycf.co.uk', GODADDY)
    await connect(key, 'flakycf.co.uk')
    cf.failApi(true)
    try {
      expect((await send(stripe.chargeRefunded(session.paymentIntent))).status).toBe(200)
    } finally {
      cf.failApi(false)
    }
    // Never served meanwhile, then gone at the next run.
    expect((await page('https://www.flakycf.co.uk/')).status).toBe(404)
    expect(cf.byName('www.flakycf.co.uk')).not.toBeNull()
    await cron(s, 'quick')
    expect(cf.byName('www.flakycf.co.uk')).toBeNull()
    expect(await (await s.db()).prepare("SELECT 1 FROM custom_domains WHERE hostname = 'www.flakycf.co.uk'").bind().first()).toBeNull()
  })

  it('Cloudflare failing while connecting leaves nothing behind', async () => {
    const { key } = await paidSite('cf-down-connect')
    cf.addDomain('cfdown.co.uk', GODADDY)
    cf.failApi(true)
    try {
      expect((await connect(key, 'cfdown.co.uk')).status).toBe(502)
    } finally {
      cf.failApi(false)
    }
    expect((await status(key)).domain).toBeNull()
    expect((await connect(key, 'cfdown.co.uk')).status).toBe(200)
  })
})

describe('admin', () => {
  it('counts domains against the free allowance and disconnects one with the admin key', async () => {
    const { key } = await paidSite('admin-domain')
    cf.addDomain('admindomain.co.uk', GODADDY)
    await connect(key, 'admindomain.co.uk')
    const stats = await (await c.call('/v1/admin/stats?from=0&to=9999999999999', { admin: ADMIN })).json() as { domains: { counts: Record<string, number>; freeLimit: number; recent: { hostname: string }[] } }
    expect(stats.domains.freeLimit).toBe(100)
    expect(stats.domains.counts.pending).toBeGreaterThan(0)
    expect(stats.domains.recent.map(d => d.hostname)).toContain('www.admindomain.co.uk')

    const off = (admin?: string) => c.call('/v1/admin/domains/disconnect', { method: 'POST', admin, json: { hostname: 'www.admindomain.co.uk' } })
    expect((await off()).status).toBe(401)
    expect((await off('wrong-admin-key-0123456789abcdef')).status).toBe(403)
    expect((await off(ADMIN)).status).toBe(200)
    expect(cf.byName('www.admindomain.co.uk')).toBeNull()
    expect((await off(ADMIN)).status).toBe(404)
  })
})

describe('one-click connecting (Domain Connect)', () => {
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } })
  let dc: Stack
  let dcc: ReturnType<typeof client>
  beforeAll(async () => {
    dc = await startStack({
      baseDomain: BASE, adminToken: ADMIN, outbound,
      vars: { ...PAYMENT_VARS, ...DOMAIN_VARS, DC_PROVIDERS: 'godaddy', DC_PROVIDER_ID, DC_PRIVATE_KEY: keys.privateKey },
    })
    dcc = client(dc)
    cf.addDcProvider('api.dc.godaddy.test', 'GoDaddy', 'GoDaddy')
    cf.addDcProvider('api.dc.ionos.test', 'IONOS', 'IONOS')
  }, 60_000)
  afterAll(() => dc?.close(), 60_000)

  it('offers a signed one-click link for a provider that is switched on and takes our template', async () => {
    const { key } = await paidSite('one-click', dc, dcc)
    cf.addDomain('oneclick.co.uk', GODADDY, { domainConnect: 'api.dc.godaddy.test' })
    const view = ((await (await connect(key, 'oneclick.co.uk', dcc)).json()) as View).domain as { oneClick: { name: string; url: string } }
    expect(view.oneClick.name).toBe('GoDaddy')
    const url = new URL(view.oneClick.url)
    expect(`${url.origin}${url.pathname}`).toBe(`https://dcc.api.dc.godaddy.test/v2/domainTemplates/providers/${DC_PROVIDER_ID}/services/website/apply`)
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ domain: 'oneclick.co.uk', host: 'www', redirect_uri: 'https://app.localblocks.test/build/?domain=back', state: 'domain', key: '_dck1' })
    // sig is last, over everything before key=.
    const [signed, rest] = url.search.slice(1).split('&key=')
    expect(rest).toMatch(/^_dck1&sig=[^&]+$/)
    const sig = decodeURIComponent(rest.split('&sig=')[1])
    expect(verify('sha256', Buffer.from(signed), keys.publicKey, Buffer.from(sig, 'base64'))).toBe(true)
  })

  it('falls back to the guide for providers not switched on, or without our template', async () => {
    const { key } = await paidSite('no-one-click', dc, dcc)
    cf.addDomain('ionosdomain.co.uk', ['ns1045.ui-dns.com'], { domainConnect: 'api.dc.ionos.test' })
    expect(((await (await connect(key, 'ionosdomain.co.uk', dcc)).json()) as View).domain).toMatchObject({ provider: 'ionos', oneClick: null })
    cf.addDcProvider('api.dc.nottemplate.test', 'godaddy', 'GoDaddy', false)
    const other = await paidSite('no-template', dc, dcc)
    cf.addDomain('notemplate.co.uk', GODADDY, { domainConnect: 'api.dc.nottemplate.test' })
    expect(((await (await connect(other.key, 'notemplate.co.uk', dcc)).json()) as View).domain).toMatchObject({ provider: 'godaddy', oneClick: null })
    // The main stack has one-click off altogether.
    const plain = await paidSite('dc-off')
    cf.addDomain('dcoff.co.uk', GODADDY, { domainConnect: 'api.dc.godaddy.test' })
    expect(((await (await connect(plain.key, 'dcoff.co.uk')).json()) as View).domain).toMatchObject({ oneClick: null })
  })
})
