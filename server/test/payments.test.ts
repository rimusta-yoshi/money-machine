import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { finishedSite } from '../../src/publish/test/sites'
import { API, BASE, client, photoBytes } from './client'
import { fakeStripe, PAYMENT_VARS } from './fakeStripe'
import { startStack } from './stack'
import type { Stack } from './stack'

/** Phase 2 under Miniflare: checkout, the Stripe webhook, edit links, refunds and cleanup, against a fake Stripe. */

const ADMIN = 'payments-admin-key-0123456789abcdef'
const DAY = 24 * 60 * 60 * 1000

let s: Stack
let c: ReturnType<typeof client>
const stripe = fakeStripe()
beforeAll(async () => {
  s = await startStack({ baseDomain: BASE, adminToken: ADMIN, vars: PAYMENT_VARS, outbound: stripe.handle })
  c = client(s)
}, 60_000)
afterAll(() => s?.close(), 60_000)

const sql = async (query: string, ...values: unknown[]) => (await s.db()).prepare(query).bind(...values).run()
const site = (slug: string) => s.fetch(`https://${slug}.${BASE}/`)
const send = async (event: unknown, o?: Parameters<typeof stripe.webhook>[2]) => s.fetch(...await stripe.webhook(API, event, o))

let emailN = 0
/** A saved, checked draft with uploaded photos, as the builder sends it before checkout. */
async function ready() {
  const key = await c.newDraft()
  const hero = await c.upload(key)
  const about = await c.upload(key, photoBytes('kitchen.jpg'))
  const email = `owner${++emailN}@example.com`
  const record = finishedSite({ business: { email }, content: { photos: { hero: { url: hero, alt: 'A new boiler' }, about: { url: about, alt: 'The van' }, gallery: [] } } })
  expect((await c.save(key, record)).status).toBe(200)
  return { key, email }
}

/** Ready, checked out at `slug` and paid (the webhook delivered). */
async function paidSite(slug: string) {
  const d = await ready()
  const res = await c.checkout(d.key, slug)
  expect(res.status, await res.clone().text()).toBe(201)
  const session = stripe.lastSession()
  expect((await send(stripe.completed(session.id))).status).toBe(200)
  const welcome = stripe.emailsTo(d.email).find(e => e.subject.startsWith('Your site is live'))!
  const link = (kind: 'edit' | 'refund') => new RegExp(`#${kind}=([\\w.-]+)`).exec(welcome.text)![1]
  return { ...d, session, welcome, editToken: link('edit'), refundToken: link('refund') }
}

describe('checkout', () => {
  it('opens a Stripe Checkout at the configured price, whatever the builder sends', async () => {
    const { key, email } = await ready()
    const res = await c.checkout(key, 'checkout-plumbing', { amount: 1, price: 1 })
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ url: expect.stringMatching(/^https:\/\/checkout\.stripe\.test\//) })
    const session = stripe.lastSession()
    expect(session).toMatchObject({ amount: 9900, currency: 'gbp', email, slug: 'checkout-plumbing' })
    expect(session.successUrl).toBe('https://app.siteblocks.test/build/?paid={CHECKOUT_SESSION_ID}')
    expect(session.cancelUrl).toBe('https://app.siteblocks.test/build/?checkout=cancelled')
    // Nothing is live until the webhook says it's paid.
    expect((await site('checkout-plumbing')).status).toBe(404)
    expect(await (await c.call(`/v1/checkouts/${session.id}`)).json()).toEqual({ state: 'waiting' })
  })

  it('needs a valid email and a checked site', async () => {
    const noEmail = await c.newDraft()
    await c.save(noEmail, finishedSite({ business: { email: '' } }))
    expect(((await (await c.checkout(noEmail, 'no-email-here')).json()) as { error: string }).error).toBe('not_ready')
    const unchecked = await c.newDraft()
    await c.save(unchecked, { ...finishedSite(), sections: {} })
    expect(((await (await c.checkout(unchecked, 'unchecked-here')).json()) as { error: string }).error).toBe('not_checked')
  })

  it('holds the address while a checkout is open, then lets it go', async () => {
    const first = await ready()
    expect((await c.checkout(first.key, 'held-address')).status).toBe(201)
    const second = await ready()
    expect(await (await c.call('/v1/slugs/held-address', { key: second.key })).json()).toMatchObject({ available: false })
    expect(((await (await c.checkout(second.key, 'held-address')).json()) as { error: string }).error).toBe('slug_taken')
    expect(await (await c.call('/v1/slugs/held-address', { key: first.key })).json()).toMatchObject({ available: true })
    await sql("UPDATE slugs SET held_until = 1 WHERE slug = 'held-address'")
    expect((await c.checkout(second.key, 'held-address')).status).toBe(201)
  })

  it('holds one address per site: trying another lets the last one go', async () => {
    const d = await ready()
    expect((await c.checkout(d.key, 'first-choice')).status).toBe(201)
    expect((await c.checkout(d.key, 'second-choice')).status).toBe(201)
    const other = await ready()
    expect(await (await c.call('/v1/slugs/first-choice', { key: other.key })).json()).toMatchObject({ available: true })
    expect(await (await c.call('/v1/slugs/second-choice', { key: other.key })).json()).toMatchObject({ available: false })
  })
})

describe('the webhook', () => {
  it('refuses unsigned, wrongly signed and stale events', async () => {
    const { key } = await ready()
    await c.checkout(key, 'unsigned-site')
    const event = stripe.completed(stripe.lastSession().id)
    for (const o of [{ header: null }, { header: 't=1,v1=abc' }, { secret: 'whsec_wrong0123456789' }, { at: Date.now() - 10 * 60 * 1000 }]) {
      const res = await send(event, o)
      expect(res.status, JSON.stringify(o)).toBe(400)
      expect(((await res.json()) as { error: string }).error).toBe('bad_signature')
    }
    expect((await site('unsigned-site')).status).toBe(404)
  })

  it('publishes a paid site, records the payment and sends the welcome email', async () => {
    const p = await paidSite('paid-plumbing')
    const home = await site('paid-plumbing')
    expect(home.status).toBe(200)
    // Paid sites stay out of search until the launch flag says otherwise.
    expect(home.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
    expect(await home.text()).toContain('<meta name="robots" content="noindex, nofollow">')
    expect(await (await c.call(`/v1/checkouts/${p.session.id}`)).json()).toEqual({ state: 'live', url: `https://paid-plumbing.${BASE}/` })
    expect(await (await c.call('/v1/draft', { key: p.key })).json()).toMatchObject({ paid: true, refunded: false, slug: 'paid-plumbing' })
    const row = await (await s.db()).prepare('SELECT paid_at, stripe_session_id, stripe_payment_intent, amount, currency, email FROM drafts WHERE stripe_session_id = ?1')
      .bind(p.session.id).first<Record<string, unknown>>()
    expect(row).toMatchObject({ stripe_payment_intent: p.session.paymentIntent, amount: 9900, currency: 'gbp', email: p.email })
    expect(row!.paid_at).toEqual(expect.any(Number))

    expect(p.welcome.from).toBe('Test Blocks <hello@siteblocks.test>')
    expect(p.welcome.text).toContain(`https://paid-plumbing.${BASE}/`)
    expect(p.welcome.text).toContain('https://app.siteblocks.test/build/#edit=')
    expect(p.welcome.text).toContain('https://app.siteblocks.test/build/#refund=')
    expect(p.welcome.text).toContain('14-day money-back guarantee, no questions asked.')
    expect(p.welcome.text).toContain(`https://pay.stripe.test/receipts/${p.session.paymentIntent}`)
    expect(p.welcome.html).toContain('Request a refund')
  })

  it('does nothing for a repeated event', async () => {
    const d = await ready()
    await c.checkout(d.key, 'duplicate-events')
    const event = stripe.completed(stripe.lastSession().id)
    expect(await (await send(event)).json()).toEqual({ received: true })
    expect(await (await send(event)).json()).toEqual({ received: true, duplicate: true })
    // A different delivery of the same payment (new event id) is safe too.
    expect(await (await send({ ...event, id: `${event.id}x` })).json()).toEqual({ received: true })
    expect(stripe.emailsTo(d.email)).toHaveLength(1)
    expect((await site('duplicate-events')).status).toBe(200)
  })

  it('gives the money back for a second payment, or one for a site already refunded', async () => {
    const d = await ready()
    expect((await c.checkout(d.key, 'two-tabs')).status).toBe(201)
    const tab1 = stripe.lastSession()
    expect((await c.checkout(d.key, 'two-tabs')).status).toBe(201)
    const tab2 = stripe.lastSession()
    await send(stripe.completed(tab1.id))
    await send(stripe.completed(tab2.id))
    expect([...stripe.refunds.entries()].find(([k]) => k === `duplicate-${tab2.paymentIntent}`)).toBeTruthy()

    const e = await ready()
    expect((await c.checkout(e.key, 'paid-after-refund')).status).toBe(201)
    const first = stripe.lastSession()
    expect((await c.checkout(e.key, 'paid-after-refund')).status).toBe(201)
    const late = stripe.lastSession()
    await send(stripe.completed(first.id))
    const token = /#refund=([\w.-]+)/.exec(stripe.emailsTo(e.email).at(-1)!.text)![1]
    expect((await c.call('/v1/refund', { method: 'POST', json: { token } })).status).toBe(200)
    expect((await send(stripe.completed(late.id))).status).toBe(200)
    expect([...stripe.refunds.keys()]).toContain(`late-${late.paymentIntent}`)
    expect((await site('paid-after-refund')).status).toBe(410)
  })

  it('tries again later when the welcome email could not be sent', async () => {
    const d = await ready()
    await c.checkout(d.key, 'email-down')
    const event = stripe.completed(stripe.lastSession().id)
    stripe.failEmails(true)
    const err = await send(event)
    stripe.failEmails(false)
    expect(err.status).toBe(500)
    expect((await site('email-down')).status).toBe(200)
    expect((await send(event)).status).toBe(200)
    expect(stripe.emailsTo(d.email)).toHaveLength(1)
  })

  it('ignores unpaid sessions and checkouts it did not open', async () => {
    const d = await ready()
    await c.checkout(d.key, 'not-paid-yet')
    expect((await send(stripe.completed(stripe.lastSession().id, { paymentStatus: 'unpaid' }))).status).toBe(200)
    expect((await site('not-paid-yet')).status).toBe(404)
    const stranger = { ...stripe.completed(stripe.lastSession().id), id: 'evt_stranger' }
    stranger.data.object = { ...stranger.data.object, id: 'cs_test_somebodyelse0123', metadata: { ref: 'f'.repeat(32), slug: 'x' } }
    expect((await send(stranger)).status).toBe(200)
  })
})

describe('edit links', () => {
  it('opens the paid site on any device and re-publishes for free', async () => {
    const p = await paidSite('edit-me')
    const opened = await c.call('/v1/draft', { key: p.editToken })
    expect(opened.status).toBe(200)
    expect(await opened.json()).toMatchObject({ paid: true, slug: 'edit-me', publishedUrl: `https://edit-me.${BASE}/` })
    const record = finishedSite({ business: { name: 'Edited Plumbing', email: p.email } })
    expect((await c.save(p.editToken, record)).status).toBe(200)
    const res = await c.call('/v1/draft/publish', { method: 'POST', key: p.editToken, json: {} })
    expect(res.status, await res.clone().text()).toBe(200)
    expect(await (await site('edit-me')).text()).toContain('Edited Plumbing')
    // The address it paid for stays put.
    const move = await c.call('/v1/draft/publish', { method: 'POST', key: p.editToken, json: { slug: 'somewhere-else' } })
    expect(((await move.json()) as { error: string }).error).toBe('address_fixed')
    expect(stripe.sessions.size).toBeGreaterThan(0)
  })

  it('refuses made-up and tampered links', async () => {
    const p = await paidSite('tamper-proof')
    const [kind, ref, sig] = p.editToken.split('.')
    for (const token of [`${kind}.${ref}.${sig[0] === 'A' ? 'B' : 'A'}${sig.slice(1)}`, `edit.${'a'.repeat(32)}.${sig}`, p.refundToken]) {
      expect((await c.call('/v1/draft', { key: token })).status, token).toBe(401)
    }
  })

  it('sends a fresh link to the payment email only, and says the same either way', async () => {
    const p = await paidSite('lost-link')
    const before = stripe.emails.length
    const ask = (email: string) => c.call('/v1/edit-link', { method: 'POST', json: { email } })
    const known = await ask(p.email.toUpperCase())
    const unknown = await ask('nobody@example.com')
    expect(known.status).toBe(200)
    expect(await known.json()).toEqual(await unknown.json())
    expect(stripe.emails.length).toBe(before + 1)
    const sent = stripe.emails.at(-1)!
    expect(sent.to).toEqual([p.email])
    expect(sent.text).toContain('https://app.siteblocks.test/build/#edit=')
    // Still within the guarantee: the refund link comes too.
    expect(sent.text).toContain('https://app.siteblocks.test/build/#refund=')
    // The fresh link works; the old one no longer does.
    const fresh = /#edit=([\w.-]+)/.exec(sent.text)![1]
    expect((await c.call('/v1/draft', { key: fresh })).status).toBe(200)
    expect((await c.call('/v1/draft', { key: p.editToken })).status).toBe(401)
    expect((await ask('not an email')).status).toBe(422)
  })
})

describe('refunds', () => {
  const status = (token: string) => c.call('/v1/refund/status', { method: 'POST', json: { token } })
  const refund = (token: string) => c.call('/v1/refund', { method: 'POST', json: { token } })

  it('within 14 days: refunds in full, takes the site down and confirms by email', async () => {
    const p = await paidSite('refund-me')
    expect(await (await status(p.refundToken)).json()).toMatchObject({ state: 'ok', amount: 9900, siteUrl: `https://refund-me.${BASE}/` })
    const res = await refund(p.refundToken)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ state: 'refunded', amount: 9900 })
    expect([...stripe.refunds.entries()].find(([, r]) => r.paymentIntent === p.session.paymentIntent)?.[0]).toBe(`refund-${p.session.paymentIntent}`)
    for (const path of ['/', '/privacy']) {
      const down = await s.fetch(`https://refund-me.${BASE}${path}`)
      expect(down.status).toBe(410)
      expect(await down.text()).toContain('This site is no longer available')
    }
    expect(stripe.emailsTo(p.email).map(e => e.subject)).toContain('Refund on its way: £99')
    expect(await (await c.call('/v1/draft', { key: p.key })).json()).toMatchObject({ refunded: true, publishedUrl: null })
    // Stripe's charge.refunded for the same refund arrives after: nothing more happens.
    expect((await send(stripe.chargeRefunded(p.session.paymentIntent))).status).toBe(200)
    expect(stripe.emailsTo(p.email).filter(e => e.subject.startsWith('Refund'))).toHaveLength(1)
    // A refunded site can't be put back up or edited.
    expect((await c.call('/v1/draft/publish', { method: 'POST', key: p.key, json: {} })).status).toBe(403)
    expect((await c.save(p.key, finishedSite())).status).toBe(403)
    expect((await c.call('/v1/draft/photos', { method: 'POST', key: p.key, body: photoBytes(), type: 'image/jpeg' })).status).toBe(403)
    expect(await (await c.call(`/v1/checkouts/${p.session.id}`)).json()).toEqual({ state: 'refunded' })
  })

  it('works once: a used link says already refunded', async () => {
    const p = await paidSite('refund-twice')
    expect((await refund(p.refundToken)).status).toBe(200)
    const again = await refund(p.refundToken)
    expect(again.status).toBe(409)
    expect(await again.json()).toEqual({ state: 'used' })
    expect(await (await status(p.refundToken)).json()).toEqual({ state: 'used' })
    expect([...stripe.refunds.values()].filter(r => r.paymentIntent === p.session.paymentIntent)).toHaveLength(1)
  })

  it('after 14 days: the guarantee has ended, nothing is refunded', async () => {
    const p = await paidSite('too-late')
    await sql('UPDATE drafts SET paid_at = paid_at - ?1 WHERE stripe_session_id = ?2', 15 * DAY, p.session.id)
    const expected = { state: 'expired', support: 'help@siteblocks.test' }
    expect(await (await status(p.refundToken)).json()).toEqual(expected)
    const res = await refund(p.refundToken)
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual(expected)
    expect([...stripe.refunds.values()].some(r => r.paymentIntent === p.session.paymentIntent)).toBe(false)
    expect((await site('too-late')).status).toBe(200)
  })

  it('refuses links that are not genuine', async () => {
    const p = await paidSite('fake-refund')
    for (const token of [p.editToken, `refund.${'a'.repeat(32)}.${'b'.repeat(43)}`, 'nonsense']) expect((await status(token)).status, token).toBe(404)
  })

  it('a refund from the Stripe dashboard takes the site down too; a partial one leaves it up', async () => {
    const partial = await paidSite('partly-refunded')
    expect((await send(stripe.chargeRefunded(partial.session.paymentIntent, { full: false }))).status).toBe(200)
    expect((await site('partly-refunded')).status).toBe(200)

    const p = await paidSite('dashboard-refund')
    expect((await send(stripe.chargeRefunded(p.session.paymentIntent))).status).toBe(200)
    expect((await site('dashboard-refund')).status).toBe(410)
    expect(stripe.emailsTo(p.email).map(e => e.subject)).toContain('Refund on its way: £99')
    expect(await (await status(p.refundToken)).json()).toEqual({ state: 'used' })
  })
})

describe('cleanup', () => {
  it('deletes only unpaid server copies (and their photos) unused for 30 days', async () => {
    const bucket = await s.mf.getR2Bucket('BUCKET', 'api')
    const refOf = async (key: string) => ((await (await c.call('/v1/draft', { key })).json()) as { record: { content: { photos: { hero: { url: string } } } } }).record.content.photos.hero.url.split('/').at(-2)!
    const old = async (ref: string) => sql('UPDATE drafts SET updated_at = 1, seen_at = 1 WHERE ref = ?1', ref)
    const photos = async (ref: string) => (await bucket.list({ prefix: `drafts/${ref}/` })).objects.length

    const stale = await ready()
    const staleRef = await refOf(stale.key)
    const recent = await ready()
    const recentRef = await refOf(recent.key)
    const paid = await paidSite('cleanup-paid')
    const paidRef = await refOf(paid.key)
    const adminPublished = await ready()
    const adminRef = await refOf(adminPublished.key)
    expect((await c.publish(adminPublished.key, 'cleanup-admin', ADMIN)).status).toBe(200)
    for (const ref of [staleRef, paidRef, adminRef]) await old(ref)
    const orphan = `drafts/${'e'.repeat(32)}/photos/${'a'.repeat(32)}.jpg`
    await bucket.put(orphan, photoBytes())

    const worker = await s.mf.getWorker('api')
    await worker.scheduled({ cron: '17 3 * * *' })

    expect((await c.call('/v1/draft', { key: stale.key })).status).toBe(401)
    expect(await photos(staleRef)).toBe(0)
    expect(await bucket.head(orphan)).toBeNull()
    for (const [key, ref] of [[recent.key, recentRef], [paid.key, paidRef], [adminPublished.key, adminRef]]) {
      expect((await c.call('/v1/draft', { key })).status).toBe(200)
      expect(await photos(ref)).toBeGreaterThan(0)
    }
    expect((await site('cleanup-paid')).status).toBe(200)
    expect((await site('cleanup-admin')).status).toBe(200)
  })
})
