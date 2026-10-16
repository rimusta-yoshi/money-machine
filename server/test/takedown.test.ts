import { createHash } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { finishedSite } from '../../src/publish/test/sites'
import { ADMIN, API, BASE, client } from './client'
import { DOMAIN_VARS, fakeCloudflare } from './fakeCloudflare'
import { fakeStripe, PAYMENT_VARS } from './fakeStripe'
import { startStack } from './stack'
import type { Stack } from './stack'

/**
 * Admin take-down and restore under Miniflare, with a fake Stripe and Cloudflare: take-down →
 * every surface refuses (free address, own domain, edit link, saving, publishing, download,
 * previews, refund link) → restore → everything back. Refunds and disputes never bring a site
 * back by accident, and a restore only undoes the take-down.
 */

const GODADDY = ['ns01.domaincontrol.com', 'ns02.domaincontrol.com']
const stripe = fakeStripe()
const cf = fakeCloudflare()
const outbound = async (req: Request) => (await cf.handle(req.clone())) ?? stripe.handle(req)

let s: Stack
let c: ReturnType<typeof client>
beforeAll(async () => {
  s = await startStack({ baseDomain: BASE, adminToken: ADMIN, vars: { ...PAYMENT_VARS, ...DOMAIN_VARS, LAUNCHED: 'true' }, outbound })
  c = client(s)
}, 60_000)
afterAll(() => s?.close(), 60_000)

const send = async (event: unknown) => s.fetch(...await stripe.webhook(API, event))
const cron = async (which: 'quick' | 'daily') => (await s.mf.getWorker('api')).scheduled({ cron: which === 'quick' ? '*/15 * * * *' : '17 3 * * *' })
const page = (url: string) => s.fetch(url, { redirect: 'manual' })
const free = (slug: string, path = '/') => page(`https://${slug}.${BASE}${path}`)
const ageChecks = async () => (await s.db()).prepare('UPDATE custom_domains SET checked_at = 1').run()

let n = 0
/** A paid, live site (as after checkout and the webhook), with its edit and refund links. */
async function paidSite(slug: string) {
  const key = await c.newDraft()
  const hero = await c.upload(key)
  const email = `takedown${++n}@example.com`
  await c.save(key, finishedSite({ business: { email }, content: { photos: { hero: { url: hero, alt: 'A new boiler' }, about: null, gallery: [] } } }))
  expect((await c.checkout(key, slug)).status).toBe(201)
  const session = stripe.lastSession()
  expect((await send(stripe.completed(session.id))).status).toBe(200)
  const welcome = stripe.emailsTo(email).find(e => e.subject.startsWith('Your site is live'))!
  const link = (kind: 'edit' | 'refund') => new RegExp(`#${kind}=([\\w.-]+)`).exec(welcome.text)![1]
  const ref = session.ref
  return { key, email, session, ref, slug, edit: link('edit'), refundToken: link('refund') }
}

/** The same, with its own domain live on Cloudflare. */
async function withDomain(slug: string, domain: string) {
  const site = await paidSite(slug)
  cf.addDomain(domain, GODADDY)
  expect((await c.call('/v1/draft/domain', { method: 'POST', key: site.key, json: { domain } })).status).toBe(200)
  const host = `www.${domain}`
  cf.prove(host)
  cf.goLive(host)
  await c.call('/v1/draft/domain', { key: site.key })
  expect(await domainRow(site.ref)).toMatchObject({ status: 'active' })
  return { ...site, host }
}

const domainRow = async (ref: string) => (await s.db()).prepare('SELECT status, cf_id FROM custom_domains WHERE ref = ?1').bind(ref).first<{ status: string; cf_id: string | null }>()
const takedown = (body: unknown, admin = ADMIN) => c.call('/v1/admin/sites/takedown', { method: 'POST', json: body, admin })
const restore = (body: unknown, admin = ADMIN) => c.call('/v1/admin/sites/restore', { method: 'POST', json: body, admin })
const lookup = (q: string, admin = ADMIN) => c.call(`/v1/admin/sites/lookup?${q}`, { admin })

async function expectUnavailable(res: Response) {
  expect(res.status).toBe(410)
  expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
  expect(res.headers.get('Cache-Control')).toBe('no-store')
  const html = await res.text()
  expect(html).toContain('This site isn’t available')
  expect(html).toContain('<meta name="robots" content="noindex">')
}

describe('taking a site down and restoring it', () => {
  it('pulls every surface at once without deleting anything, and restore puts it all back', async () => {
    const site = await withDomain('takedown-full', 'takedownfull.co.uk')
    const live = await page(`https://${site.host}/`)
    expect(live.status).toBe(200)
    const before = await live.text()
    const photoPath = /src="(\/photos\/[^"]+)"/.exec(before)![1]

    const res = await takedown({ address: `https://takedown-full.${BASE}/privacy.html`, reason: 'Phishing page copying a bank login', by: 'rob' })
    expect(res.status, await res.clone().text()).toBe(200)
    const body = await res.json() as { site: Record<string, unknown>; domainPaused: boolean }
    expect(body.domainPaused).toBe(true)
    expect(body.site).toMatchObject({
      ref: site.ref, url: `https://${site.slug}.${BASE}/`, email: site.email, paid: true, takenDown: true, refunded: false,
      ownDomain: { hostname: site.host, status: 'paused' },
      takedown: { reason: 'Phishing page copying a bank login', by: 'rob', restoredAt: null, log: [{ action: 'takedown', by: 'rob', reason: 'Phishing page copying a bank login' }] },
    })

    // Every page, photo and font of the free address; the own domain is off Cloudflare, and says so if reached.
    for (const path of ['/', '/privacy.html', photoPath, '/fonts/LICENSES.txt', '/nothing-here']) await expectUnavailable(await free(site.slug, path))
    expect(cf.byName(site.host)).toBeNull()
    expect(await domainRow(site.ref)).toMatchObject({ status: 'paused', cf_id: null })
    await expectUnavailable(await page(`https://${site.host}/`))

    // The edit link opens a "taken down" screen; nothing can be changed, published, previewed or downloaded.
    const opened = await c.call('/v1/draft', { key: site.edit })
    expect(opened.status).toBe(200)
    expect(await opened.json()).toMatchObject({ takenDown: true, record: null, publishedUrl: null, support: 'help@localblocks.test', message: expect.stringContaining('help@localblocks.test') })
    const refusedEverywhere = [
      () => c.save(site.edit, finishedSite({ business: { email: site.email } })),
      () => c.call('/v1/draft/publish', { method: 'POST', key: site.edit, json: {} }),
      () => c.call('/v1/draft/export', { key: site.edit }),
      () => c.call('/v1/draft/preview', { method: 'POST', key: site.key }),
      () => c.call('/v1/draft/domain', { key: site.key }),
      () => c.call('/v1/draft/domain/disconnect', { method: 'POST', key: site.key }),
      () => c.call('/v1/draft/resume-link', { method: 'POST', key: site.key, json: { email: site.email, remind: false } }),
      () => c.call(`/v1/slugs/other-${n}`, { key: site.key }),
    ]
    for (const call of refusedEverywhere) {
      const r = await call()
      expect(r.status).toBe(403)
      expect(await r.json()).toMatchObject({ error: 'taken_down' })
    }
    // No self-serve refund while it's down: a person decides.
    const refund = await c.call('/v1/refund/status', { method: 'POST', json: { token: site.refundToken } })
    expect(await refund.json()).toEqual({ state: 'taken_down', support: 'help@localblocks.test' })
    expect((await c.call('/v1/refund', { method: 'POST', json: { token: site.refundToken } })).status).toBe(409)
    // No email went to the owner.
    expect(stripe.emailsTo(site.email).map(e => e.subject)).toEqual([expect.stringMatching(/^Your site is live/), expect.stringMatching(/^Your domain is live/)])

    // Taken down twice: refused, nothing changes.
    expect((await takedown({ ref: site.ref, reason: 'again' })).status).toBe(409)
    // The cron leaves the paused domain alone while the site is down.
    await cron('quick')
    expect(await domainRow(site.ref)).toMatchObject({ status: 'paused' })

    const back = await restore({ ref: site.ref, by: 'rob' })
    expect(back.status, await back.clone().text()).toBe(200)
    const restored = await back.json() as { site: Record<string, unknown>; domainResumed: boolean; stillDown: boolean }
    expect(restored).toMatchObject({ domainResumed: true, stillDown: false, site: { takenDown: false, takedown: { reason: 'Phishing page copying a bank login', restoredBy: 'rob' } } })
    expect((restored.site.takedown as { log: unknown[] }).log).toHaveLength(2)

    // Exactly as it was: the same files, the domain back on Cloudflare (served while it validates,
    // as after a won dispute) and live again once it has.
    expect((await free(site.slug)).status).toBe(200)
    expect((await free(site.slug, photoPath)).status).toBe(200)
    expect(cf.byName(site.host)).toMatchObject({ status: 'pending' })
    expect((await page(`https://${site.host}/`)).status).toBe(200)
    cf.goLive(site.host)
    await ageChecks()
    await c.call('/v1/draft/domain', { key: site.key })
    expect(await domainRow(site.ref)).toMatchObject({ status: 'active' })
    const again = await free(site.slug)
    expect(again.status).toBe(301)
    expect(again.headers.get('Location')).toBe(`https://${site.host}/`)
    expect(await (await page(`https://${site.host}/`)).text()).toBe(before)
    expect((await c.call('/v1/draft', { key: site.edit })).status).toBe(200)
    expect((await c.call('/v1/draft/publish', { method: 'POST', key: site.edit, json: {} })).status).toBe(200)
    expect((await c.call('/v1/draft/export', { key: site.key })).status).toBe(200)
    expect(await (await c.call('/v1/refund/status', { method: 'POST', json: { token: site.refundToken } })).json()).toMatchObject({ state: 'ok' })
    expect((await restore({ ref: site.ref })).status).toBe(409)
  })

  it('finds a site by its free address, its own domain or the bare domain', async () => {
    const site = await withDomain('takedown-find', 'takedownfind.co.uk')
    for (const q of [`address=takedown-find.${BASE}`, 'address=takedown-find', 'address=https%3A%2F%2Fwww.takedownfind.co.uk%2Fprivacy.html', 'address=TakedownFind.co.uk', `ref=${site.ref}`]) {
      const res = await lookup(q)
      expect(res.status, q).toBe(200)
      expect(await res.json()).toMatchObject({ site: { ref: site.ref, takenDown: false, ownDomain: { hostname: site.host, status: 'active' }, takedown: { log: [] } } })
    }
    expect((await lookup('address=nobody-here')).status).toBe(404)
    expect((await lookup('address=www.not-ours.co.uk')).status).toBe(404)
    expect((await lookup(`ref=${'f'.repeat(32)}`)).status).toBe(404)
    expect((await lookup('')).status).toBe(422)
    expect((await lookup(`ref=${site.ref}&address=x`)).status).toBe(422)
    // Taken down by its own domain.
    expect((await takedown({ address: 'takedownfind.co.uk', reason: 'Scam shop' })).status).toBe(200)
    await expectUnavailable(await free('takedown-find'))
    expect((await restore({ address: site.host })).status).toBe(200)
  })

  it('needs the admin key, and checks what it is sent', async () => {
    const site = await paidSite('takedown-checks')
    expect((await c.call('/v1/admin/sites/takedown', { method: 'POST', json: { ref: site.ref, reason: 'Scam' } })).status).toBe(401)
    expect((await takedown({ ref: site.ref, reason: 'Scam' }, 'wrong-key-0123456789abcdefgh')).status).toBe(403)
    expect((await restore({ ref: site.ref }, 'wrong-key-0123456789abcdefgh')).status).toBe(403)
    expect((await lookup(`ref=${site.ref}`, 'wrong-key-0123456789abcdefgh')).status).toBe(403)
    // A draft's own key is no admin key.
    expect((await c.call('/v1/admin/sites/takedown', { method: 'POST', key: site.key, json: { ref: site.ref, reason: 'Scam' } })).status).toBe(401)
    for (const bad of [
      {}, { ref: site.ref }, { ref: site.ref, reason: '' }, { ref: site.ref, reason: 'x'.repeat(501) }, { ref: 'nope', reason: 'Scam' },
      { ref: site.ref, address: `takedown-checks.${BASE}`, reason: 'Scam' }, { ref: site.ref, reason: 'Scam', extra: 1 }, { ref: site.ref, reason: 'Scam\u0007' },
    ]) expect((await takedown(bad)).status, JSON.stringify(bad)).toBe(422)
    expect((await c.call('/v1/admin/sites/takedown', { method: 'POST', body: 'not json', type: 'text/plain', admin: ADMIN })).status).toBe(415)
    expect((await takedown({ address: 'no-such-site', reason: 'Scam' })).status).toBe(404)
    expect((await restore({ ref: site.ref })).status).toBe(409)
    expect((await free(site.slug)).status).toBe(200)
  })

  it('a refund while taken down keeps it down after a restore, domain gone', async () => {
    const site = await withDomain('takedown-refund', 'takedownrefund.co.uk')
    expect((await takedown({ ref: site.ref, reason: 'Fraud' })).status).toBe(200)
    expect((await send(stripe.chargeRefunded(site.session.paymentIntent))).status).toBe(200)
    await expectUnavailable(await free(site.slug))
    expect(await domainRow(site.ref)).toBeNull()

    const res = await restore({ ref: site.ref })
    expect(await res.json()).toMatchObject({ stillDown: true, domainResumed: false, site: { takenDown: false, refunded: true } })
    // Refunded: "no longer available", as any refunded site.
    expect((await free(site.slug)).status).toBe(410)
    expect(await (await free(site.slug)).text()).toContain('no longer available')
    expect(cf.byName(site.host)).toBeNull()
    expect((await c.call('/v1/draft/publish', { method: 'POST', key: site.edit, json: {} })).status).toBe(403)
  })

  it('a dispute won while taken down does not bring it back; restore does', async () => {
    const site = await withDomain('takedown-won', 'takedownwon.co.uk')
    expect((await takedown({ ref: site.ref, reason: 'Fake reviews and stolen photos' })).status).toBe(200)
    expect((await send(stripe.dispute(site.session.paymentIntent, 'created'))).status).toBe(200)
    const sentBefore = stripe.emailsTo(site.email).length
    expect((await send(stripe.dispute(site.session.paymentIntent, 'closed', 'won'))).status).toBe(200)
    await expectUnavailable(await free(site.slug))
    expect(cf.byName(site.host)).toBeNull()
    // Not live, so no "your site is back" email.
    expect(stripe.emailsTo(site.email)).toHaveLength(sentBefore)
    expect(await domainRow(site.ref)).toMatchObject({ status: 'paused' })
    await cron('quick')
    expect(cf.byName(site.host)).toBeNull()

    expect(await (await restore({ ref: site.ref })).json()).toMatchObject({ stillDown: false, domainResumed: true })
    expect((await page(`https://${site.host}/`)).status).toBe(200)
    expect(cf.byName(site.host)).toMatchObject({ status: 'pending' })
  })

  it('a restore while a dispute is open leaves it down until the dispute is won; a lost one keeps it down', async () => {
    const site = await withDomain('takedown-open', 'takedownopen.co.uk')
    expect((await takedown({ ref: site.ref, reason: 'Scam' })).status).toBe(200)
    expect((await send(stripe.dispute(site.session.paymentIntent, 'created'))).status).toBe(200)
    expect(await (await restore({ ref: site.ref })).json()).toMatchObject({ stillDown: true, domainResumed: false })
    expect((await free(site.slug)).status).toBe(410)
    expect(cf.byName(site.host)).toBeNull()
    expect((await send(stripe.dispute(site.session.paymentIntent, 'closed', 'won'))).status).toBe(200)
    // Back on the free address at once; the domain once Cloudflare validates it again.
    expect((await free(site.slug)).status).toBe(200)
    expect(cf.byName(site.host)).toMatchObject({ status: 'pending' })

    const lost = await paidSite('takedown-lost')
    expect((await takedown({ ref: lost.ref, reason: 'Scam' })).status).toBe(200)
    expect((await send(stripe.dispute(lost.session.paymentIntent, 'closed', 'lost'))).status).toBe(200)
    expect(await (await restore({ ref: lost.ref })).json()).toMatchObject({ stillDown: true })
    expect((await free(lost.slug)).status).toBe(410)
    expect((await c.call('/v1/draft/export', { key: lost.key })).status).toBe(403)
  })

  it('the cron pauses the domain if Cloudflare was down at the take-down, and the domain says so meanwhile', async () => {
    const site = await withDomain('takedown-flaky', 'takedownflaky.co.uk')
    cf.failApi(true)
    try {
      expect(await (await takedown({ ref: site.ref, reason: 'Phishing' })).json()).toMatchObject({ domainPaused: false })
    } finally {
      cf.failApi(false)
    }
    expect(await domainRow(site.ref)).toMatchObject({ status: 'active' })
    await expectUnavailable(await page(`https://${site.host}/`))
    // Never sends visitors from the free address to the domain meanwhile.
    await expectUnavailable(await free(site.slug))
    await cron('quick')
    expect(await domainRow(site.ref)).toMatchObject({ status: 'paused' })
    expect(cf.byName(site.host)).toBeNull()
  })

  it('a checkout paid after the take-down is recorded, but the site stays hidden and no welcome email goes', async () => {
    const key = await c.newDraft()
    const email = `takedown${++n}@example.com`
    await c.save(key, finishedSite({ business: { email } }))
    expect((await c.checkout(key, 'takedown-late-pay')).status).toBe(201)
    const session = stripe.lastSession()
    expect((await takedown({ ref: session.ref, reason: 'Scam shop' })).status).toBe(200)
    expect((await send(stripe.completed(session.id))).status).toBe(200)
    expect(await (await lookup(`ref=${session.ref}`)).json()).toMatchObject({ site: { paid: true, takenDown: true } })
    await expectUnavailable(await free('takedown-late-pay'))
    expect(stripe.emailsTo(email)).toEqual([])
  })

  it('an unpaid draft taken down: its preview links stop, and the daily cleanup keeps it as evidence', async () => {
    const key = await c.newDraft()
    expect((await c.save(key, finishedSite({ business: { about: 'Verify your bank account here' } }))).status).toBe(200)
    const { url } = await c.preview(key)
    expect((await s.fetch(url)).status).toBe(200)
    const hash = createHash('sha256').update(key).digest('hex')
    const ref = (await (await s.db()).prepare('SELECT ref FROM drafts WHERE key_hash = ?1').bind(hash).first<{ ref: string }>())!.ref
    expect((await takedown({ ref, reason: 'Phishing preview link' })).status).toBe(200)
    const res = await s.fetch(url)
    expect(res.status).toBe(410)
    expect(await res.text()).toContain('This site isn’t available')
    expect(await (await c.call('/v1/draft', { key })).json()).toMatchObject({ takenDown: true })

    await (await s.db()).prepare('UPDATE drafts SET updated_at = 1, seen_at = 1 WHERE ref = ?1').bind(ref).run()
    await cron('daily')
    expect(await (await s.db()).prepare('SELECT ref FROM drafts WHERE ref = ?1').bind(ref).first()).toEqual({ ref })
  })
})
