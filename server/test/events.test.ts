import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { finishedSite } from '../../src/publish/test/sites'
import { BASE, BUILDER, client, photoBytes } from './client'
import { fakeStripe, PAYMENT_VARS } from './fakeStripe'
import { startStack } from './stack'
import type { Stack } from './stack'

/** The admin dashboard's events under Miniflare: what's recorded, what never is, and who can read it. */

const ADMIN = 'events-admin-key-0123456789abcdef'
const DAY = 24 * 60 * 60 * 1000

let s: Stack
let c: ReturnType<typeof client>
const stripe = fakeStripe()
beforeAll(async () => {
  s = await startStack({ baseDomain: BASE, adminToken: ADMIN, vars: PAYMENT_VARS, outbound: stripe.handle })
  c = client(s)
}, 60_000)
afterAll(() => s?.close(), 60_000)

type Row = Record<string, unknown>
const d1 = async () => (await s.db()) as unknown as D1Database
const rows = async (sql: string, ...values: unknown[]): Promise<Row[]> => (await (await d1()).prepare(sql).bind(...values).all<Row>()).results
const run = async (sql: string, ...values: unknown[]) => (await d1()).prepare(sql).bind(...values).run()

/** Events are written after the response: waits until the query finds what's expected. */
async function eventually(sql: string, values: unknown[], count: number): Promise<Row[]> {
  for (let i = 0; i < 60; i++) {
    const found = await rows(sql, ...values)
    if (found.length >= count) return found
    await new Promise(r => setTimeout(r, 50))
  }
  throw new Error(`Expected ${count} rows for ${sql}`)
}

let tagN = 0
/** A fresh tag per test (used as the campaign), so tests never count each other's events. */
const freshTag = () => `t${Date.now().toString(36)}${++tagN}`

const event = (body: unknown, o: { key?: string; type?: string; ip?: string; headers?: Record<string, string> } = {}) =>
  s.fetch(`https://api.${BASE}/v1/events`, {
    method: 'POST',
    headers: {
      'Content-Type': o.type ?? 'text/plain;charset=UTF-8', Origin: BUILDER, 'CF-Connecting-IP': o.ip ?? '203.0.113.7',
      ...(o.key ? { Authorization: `Bearer ${o.key}` } : {}), ...o.headers,
    },
    body: JSON.stringify(body),
  })

const stats = (q: Record<string, string>, admin: string | null = ADMIN) =>
  c.call(`/v1/admin/stats?${new URLSearchParams(q)}`, admin ? { admin } : {})

describe('recording events', () => {
  it('counts a homepage visit with its ad source and nothing else', async () => {
    const tag = freshTag()
    const res = await event({ kind: 'step', step: 'landed', src: 'FB', campaign: `Oct Test ${tag}` }, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Secret Browser)', Referer: 'https://ads.example/?email=jo@example.com' },
    })
    expect(res.status).toBe(204)
    const [row] = await eventually('SELECT * FROM events WHERE campaign = ?1', [`oct-test-${tag}`], 1)
    expect(row).toMatchObject({ step: 'landed', src: 'fb', ref: null, trade: null, theme: null })
  })

  it('keeps only the listed ad sources: anything else is "other", none or "direct" is direct', async () => {
    const cases: [string | undefined, string | null][] = [
      ['ig', 'ig'], ['Google', 'google'], ['tiktok', 'tiktok'], ['leaflet', 'leaflet'], ['facebook', 'fb'], ['instagram', 'ig'],
      ['newsletter', 'other'], ['my-cousins-blog', 'other'], ['direct', null], [undefined, null],
    ]
    for (const [src, stored] of cases) {
      const tag = freshTag()
      expect((await event({ kind: 'step', step: 'landed', src, campaign: tag })).status).toBe(204)
      expect((await eventually('SELECT src FROM events WHERE campaign = ?1', [tag], 1))[0].src, String(src)).toBe(stored)
    }
    // A new draft keeps to the same list.
    const { key } = (await (await c.call('/v1/drafts', { method: 'POST', json: { src: 'reddit', campaign: 'x' } })).json()) as { key: string }
    const tag = freshTag()
    await event({ kind: 'step', step: 'build_done', campaign: tag }, { key })
    expect((await eventually('SELECT src FROM events WHERE campaign = ?1', ['x'], 1)).every(r => r.src === 'other')).toBe(true)
  })

  it('stores no personal data: only these columns, and no IP, browser or email in any of them', async () => {
    const cols = async (table: string) => (await rows(`PRAGMA table_info(${table})`)).map(r => r.name)
    expect(await cols('events')).toEqual(['id', 'step', 'at', 'trade', 'theme', 'src', 'campaign', 'ref'])
    expect(await cols('layout_picks')).toEqual(['id', 'at', 'section', 'layout', 'theme', 'trade', 'src', 'ref'])
    const tag = freshTag()
    await event({ kind: 'step', step: 'started', src: 'ig', campaign: tag, trade: 'plumber' }, { ip: '198.51.100.23', headers: { 'User-Agent': 'UniqueAgent/9.9' } })
    await eventually('SELECT * FROM events WHERE campaign = ?1', [tag], 1)
    const everything = JSON.stringify([...await rows('SELECT * FROM events'), ...await rows('SELECT * FROM layout_picks')])
    expect(everything).not.toContain('198.51.100.23')
    expect(everything).not.toContain('UniqueAgent')
    expect(everything).not.toMatch(/@|example\.com/)
  })

  it('refuses events carrying anything extra (a name, an email, a phone number)', async () => {
    for (const extra of [{ email: 'jo@example.com' }, { name: 'Jo Bloggs' }, { phone: '07700 900123' }, { ip: '1.2.3.4' }]) {
      expect((await event({ kind: 'step', step: 'started', ...extra })).status).toBe(422)
    }
    // An email or phone number used as an ad source is never stored: it counts as "other".
    for (const src of ['jo@example.com', '07700900123']) {
      const marker = freshTag()
      expect((await event({ kind: 'step', step: 'landed', src, campaign: marker })).status).toBe(204)
      expect((await eventually('SELECT * FROM events WHERE campaign = ?1', [marker], 1))[0].src).toBe('other')
    }
    // Nor as a campaign: that's dropped.
    expect((await event({ kind: 'step', step: 'landed', src: 'fb', campaign: 'jo@example.com' })).status).toBe(204)
    await new Promise(r => setTimeout(r, 200))
    expect(await rows("SELECT * FROM events WHERE campaign LIKE '%example%' OR campaign LIKE '%jo%'")).toEqual([])
  })

  it('refuses unknown steps, steps only the server records, and odd values', async () => {
    for (const body of [
      { kind: 'step', step: 'paid' }, { kind: 'step', step: 'checkout_started' }, { kind: 'step', step: 'hacked' },
      { kind: 'step', step: 'started', trade: 'astronaut' }, { kind: 'step', step: 'started', theme: 'neon' },
      { kind: 'layout', section: 'hero', layout: 'no-such-layout' }, { kind: 'layout', section: 'nope', layout: 'split' },
    ]) expect((await event(body)).status, JSON.stringify(body)).toBe(422)
    expect((await event({ kind: 'step', step: 'started' }, { type: 'application/x-www-form-urlencoded' })).status).toBe(415)
    expect((await s.fetch(`https://api.${BASE}/v1/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{nope' })).status).toBe(400)
  })

  it('ties builder steps to the site id once it has one, once per step, with the source the site started with', async () => {
    const tag = freshTag()
    const { key } = (await (await c.call('/v1/drafts', { method: 'POST', json: { src: 'google', campaign: tag } })).json()) as { key: string }
    await event({ kind: 'step', step: 'build_done', src: 'tiktok', campaign: 'later-link', trade: 'roofer', theme: 'workwear' }, { key })
    await event({ kind: 'step', step: 'build_done', src: 'fb', trade: 'roofer', theme: 'workwear' }, { key })
    const [row] = await eventually('SELECT * FROM events WHERE campaign = ?1', [tag], 1)
    expect(row).toMatchObject({ step: 'build_done', src: 'google', trade: 'roofer', theme: 'workwear' })
    expect(row.ref).toMatch(/^[0-9a-f]{32}$/)
    expect((await rows('SELECT src FROM drafts WHERE ref = ?1', row.ref))[0].src).toBe('google')
    expect(await rows("SELECT * FROM events WHERE campaign = 'later-link'")).toEqual([])
    await new Promise(r => setTimeout(r, 200))
    expect(await rows('SELECT * FROM events WHERE ref = ?1', row.ref)).toHaveLength(1)
    // The draft key itself is never stored.
    expect(JSON.stringify(await rows('SELECT * FROM events'))).not.toContain(key)
  })

  it('records layout picks with section, layout and theme', async () => {
    const since = Date.now()
    expect((await event({ kind: 'layout', section: 'hero', layout: 'split', theme: 'clean-pro', trade: 'painter', src: 'fb' })).status).toBe(204)
    expect((await eventually("SELECT * FROM layout_picks WHERE at >= ?1 AND trade = 'painter'", [since], 1))[0])
      .toMatchObject({ section: 'hero', layout: 'split', theme: 'clean-pro', trade: 'painter', src: 'fb', ref: null })
  })

  it('answers at once whatever happens to the write', async () => {
    await run('ALTER TABLE events RENAME TO events_away')
    try {
      expect((await event({ kind: 'step', step: 'landed' })).status).toBe(204)
    } finally {
      await new Promise(r => setTimeout(r, 100))
      await run('ALTER TABLE events_away RENAME TO events')
    }
  })
})

describe('the ad source follows a site to paying', () => {
  it('from the new draft through checkout, payment and refund, with Stripe\'s fee', async () => {
    // tiktok is used by this test only, so the dashboard filtered to it shows just this site.
    const src = 'tiktok'
    const tag = freshTag()
    const since = Date.now()
    const created = await c.call('/v1/drafts', { method: 'POST', json: { src, campaign: tag } })
    expect(created.status).toBe(201)
    const { key } = (await created.json()) as { key: string }
    const hero = await c.upload(key)
    const about = await c.upload(key, photoBytes('kitchen.jpg'))
    const email = `buyer-${tag}@example.com`
    const record = finishedSite({ business: { email }, content: { photos: { hero: { url: hero, alt: 'A new boiler' }, about: { url: about, alt: 'The van' }, gallery: [] } } })
    expect((await c.save(key, record)).status).toBe(200)
    expect((await c.call('/v1/draft/preview', { method: 'POST', key })).status).toBe(201)
    expect((await c.checkout(key, tag)).status).toBe(201)
    const session = stripe.lastSession()
    expect((await s.fetch(...await stripe.webhook(`https://api.${BASE}`, stripe.completed(session.id)))).status).toBe(200)
    expect((await s.fetch(...await stripe.webhook(`https://api.${BASE}`, stripe.chargeRefunded(session.paymentIntent)))).status).toBe(200)

    const events = await eventually('SELECT * FROM events WHERE campaign = ?1 ORDER BY id', [tag], 4)
    expect(events.map(e => e.step)).toEqual(['preview_shared', 'checkout_started', 'paid', 'refunded'])
    for (const e of events) expect(e).toMatchObject({ src, campaign: tag, trade: record.tradeId, theme: record.style.theme })
    expect(JSON.stringify(events)).not.toContain(email)

    // Stripe's fee is read after the payment (the fake Stripe charges 169p).
    await eventually('SELECT * FROM drafts WHERE src = ?1 AND stripe_fee = 169', [src], 1)
    // The dashboard, filtered to this source, shows the sale, the refund and the fee Stripe kept.
    const res = await stats({ from: String(since), to: String(Date.now() + DAY), src })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { money: Record<string, number>; funnel: { step: string; count: number }[]; recent: { status: string; src: string }[] }
    expect(body.money).toMatchObject({ sales: 1, revenue: 9900, refunds: 1, refunded: 9900, net: 0, refundRate: 1, stripeFees: 169, feesUnknown: 0, netAfterFees: -169 })
    expect(body.funnel.find(f => f.step === 'paid')?.count).toBe(1)
    expect(body.recent).toEqual([expect.objectContaining({ status: 'refunded', src })])
  })
})

describe('Stripe fees', () => {
  it('are filled in by the daily cron when Stripe had not settled them at payment', async () => {
    const tag = freshTag()
    const { key } = (await (await c.call('/v1/drafts', { method: 'POST', json: { src: 'ig', campaign: tag } })).json()) as { key: string }
    const hero = await c.upload(key)
    const record = finishedSite({ business: { email: `fees-${tag}@example.com` }, content: { photos: { hero: { url: hero, alt: 'A new boiler' }, about: null, gallery: [] } } })
    expect((await c.save(key, record)).status).toBe(200)
    stripe.setFee(null)
    try {
      expect((await c.checkout(key, tag)).status).toBe(201)
      expect((await s.fetch(...await stripe.webhook(`https://api.${BASE}`, stripe.completed(stripe.lastSession().id)))).status).toBe(200)
      await new Promise(r => setTimeout(r, 300))
      expect((await rows('SELECT stripe_fee FROM drafts WHERE campaign = ?1', tag))[0].stripe_fee).toBeNull()
      stripe.setFee(205)
      await (await s.mf.getWorker('api')).scheduled({ cron: '17 3 * * *' })
      expect((await rows('SELECT stripe_fee FROM drafts WHERE campaign = ?1', tag))[0].stripe_fee).toBe(205)
    } finally {
      stripe.setFee(169)
    }
  })
})

describe('the dashboard', () => {
  it('is refused without the admin key, or with a wrong one', async () => {
    const q = { from: '0', to: String(Date.now()) }
    expect((await stats(q, null)).status).toBe(401)
    expect((await stats(q, 'wrong-key-0123456789abcdefghij')).status).toBe(403)
    expect((await stats(q)).status).toBe(200)
    // Another site can't read it even with the key.
    const elsewhere = await c.call(`/v1/admin/stats?${new URLSearchParams(q)}`, { admin: ADMIN, origin: 'https://evil.example' })
    expect(elsewhere.status).toBe(403)
  })

  it('is closed when no admin key is set', async () => {
    const closed = await startStack({ baseDomain: BASE })
    try {
      const res = await client(closed).call('/v1/admin/stats?from=0&to=1', { admin: ADMIN })
      expect(res.status).toBe(403)
    } finally {
      await closed.close()
    }
  }, 60_000)

  it('counts the funnel for a date range and source, with breakdowns and the daily chart', async () => {
    // leaflet is used by this test only.
    const src = 'leaflet'
    const tag = freshTag()
    const since = Date.now()
    const steps = ['landed', 'landed', 'landed', 'landed', 'started', 'started', 'basics_done', 'look_picked'] as const
    for (const step of steps) await event({ kind: 'step', step, src, campaign: tag, trade: step === 'landed' ? undefined : 'plumber', theme: step === 'look_picked' ? 'workwear' : undefined })
    await eventually('SELECT * FROM events WHERE campaign = ?1', [tag], steps.length)
    // One landing long ago: outside the range.
    await run("INSERT INTO events (step, at, src) VALUES ('landed', ?1, ?2)", Date.now() - 400 * DAY, src)

    const body = (await (await stats({ from: String(since), to: String(Date.now() + DAY), src, tz: '60' })).json()) as {
      funnel: { step: string; count: number; fromPrev: number | null; fromLanded: number | null; biggestDrop: boolean }[]
      breakdowns: { src: { key: string; base: number }[]; trade: { key: string; base: number }[]; theme: { key: string }[] }
      daily: { day: number; step: string; n: number }[]; sources: string[]; layouts: { section: string; layouts: unknown[] }[]
    }
    const f = Object.fromEntries(body.funnel.map(r => [r.step, r]))
    expect(f.landed).toMatchObject({ count: 4, fromPrev: null, fromLanded: 1 })
    expect(f.started).toMatchObject({ count: 2, fromPrev: 0.5, fromLanded: 0.5 })
    expect(f.basics_done).toMatchObject({ count: 1, fromPrev: 0.5, fromLanded: 0.25 })
    expect(f.build_done).toMatchObject({ count: 0, fromPrev: 0, biggestDrop: true })
    expect(body.breakdowns.src).toEqual([expect.objectContaining({ key: src, base: 4 })])
    // Landings come before a trade is chosen: they're the row with no trade.
    expect(body.breakdowns.trade).toEqual([expect.objectContaining({ key: 'plumber', base: 1 }), expect.objectContaining({ key: null, base: 0 })])
    expect(body.breakdowns.theme.map(r => r.key)).toContain('workwear')
    expect(body.daily.filter(d => d.step === 'landed').reduce((a, d) => a + d.n, 0)).toBe(4)
    expect(body.sources).toContain(src)
    expect(body.layouts.map(l => l.section)).toContain('hero')
  })

  it('refuses a range that makes no sense', async () => {
    expect((await stats({ from: '10', to: '5' })).status).toBe(422)
    expect((await stats({ from: 'yesterday', to: '5' })).status).toBe(422)
  })
})

describe('retention', () => {
  it('the daily cleanup deletes events and picks older than 13 months', async () => {
    const src = freshTag()
    const old = Date.now() - 400 * DAY
    const recent = Date.now() - 300 * DAY
    await run("INSERT INTO events (step, at, src) VALUES ('landed', ?1, ?3), ('landed', ?2, ?3)", old, recent, src)
    await run("INSERT INTO layout_picks (at, section, layout, src) VALUES (?1, 'hero', 'split', ?3), (?2, 'hero', 'split', ?3)", old, recent, src)
    await (await s.mf.getWorker('api')).scheduled({ cron: '17 3 * * *' })
    expect((await rows('SELECT at FROM events WHERE src = ?1', src)).map(r => r.at)).toEqual([recent])
    expect((await rows('SELECT at FROM layout_picks WHERE src = ?1', src)).map(r => r.at)).toEqual([recent])
  })
})
