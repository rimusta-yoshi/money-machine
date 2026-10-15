import { createHash } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { finishedSite } from '../../src/publish/test/sites'
import { API, BASE, client } from './client'
import { fakeStripe, PAYMENT_VARS } from './fakeStripe'
import { startStack } from './stack'
import type { Stack } from './stack'

/** The review flag under Miniflare: found at checkout and publish, never in the way, cleared by an admin. */

const ADMIN = 'review-admin-key-0123456789abcdef'

let s: Stack
let c: ReturnType<typeof client>
const stripe = fakeStripe()
beforeAll(async () => {
  s = await startStack({ baseDomain: BASE, adminToken: ADMIN, vars: PAYMENT_VARS, outbound: stripe.handle })
  c = client(s)
}, 60_000)
afterAll(() => s?.close(), 60_000)

const refOf = async (key: string) =>
  (await (await s.db()).prepare('SELECT ref FROM drafts WHERE key_hash = ?1').bind(createHash('sha256').update(key).digest('hex')).first<{ ref: string }>())!.ref

interface Flagged { ref: string; slug: string | null; name: string | null; words: string[]; flaggedAt: number; paid: boolean; refunded: boolean; published: boolean; url: string | null }
const toReview = async (): Promise<Flagged[]> => {
  const res = await c.call('/v1/admin/review', { admin: ADMIN })
  expect(res.status).toBe(200)
  return ((await res.json()) as { sites: Flagged[] }).sites
}
const listed = async (ref: string) => (await toReview()).find(f => f.ref === ref) ?? null
const clear = (ref: string, admin = ADMIN) => c.call('/v1/admin/review/clear', { method: 'POST', json: { ref }, admin })

let n = 0
async function draftWith(about: string, name = `Review Test ${++n}`) {
  const key = await c.newDraft()
  expect((await c.save(key, finishedSite({ business: { about, name } }))).status).toBe(200)
  return { key, ref: await refOf(key), name }
}

describe('the review flag', () => {
  it('is recorded at checkout, which still opens Stripe with nothing said', async () => {
    const d = await draftWith('Online Banking help: log in with your password')
    const res = await c.checkout(d.key, `review-flag-${n}`)
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ url: expect.stringMatching(/^https:\/\/checkout\.stripe\.test\//) })
    expect(await listed(d.ref)).toMatchObject({ name: d.name, words: ['banking', 'log in', 'password'], paid: false, refunded: false, published: false, slug: null, url: null })
  })

  it('leaves a clean site alone, embankments and bank holidays included', async () => {
    const d = await draftWith('Fencing on the embankment, open bank holidays')
    expect((await c.checkout(d.key, `review-clean-${n}`)).status).toBe(201)
    expect(await listed(d.ref)).toBeNull()
  })

  it('is recorded when a paid site goes live and when it is re-published, and an admin can clear it', async () => {
    const key = await c.newDraft()
    const email = `review${++n}@example.com`
    expect((await c.save(key, finishedSite({ business: { email } }))).status).toBe(200)
    const ref = await refOf(key)
    const slug = `review-paid-${n}`
    expect((await c.checkout(key, slug)).status).toBe(201)
    expect(await listed(ref)).toBeNull()
    expect((await s.fetch(...await stripe.webhook(API, stripe.completed(stripe.lastSession().id)))).status).toBe(200)
    expect(await listed(ref)).toBeNull()

    // Edited after paying, then re-published for free: the same answer as ever, and flagged.
    expect((await c.save(key, finishedSite({ business: { email, about: 'Verify your account here' } }))).status).toBe(200)
    const res = await c.call('/v1/draft/publish', { method: 'POST', key, json: {} })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ slug, url: `https://${slug}.${BASE}/` })
    expect(await listed(ref)).toMatchObject({ words: ['verify your account'], paid: true, published: true, slug, url: `https://${slug}.${BASE}/` })

    expect((await clear(ref)).status).toBe(200)
    expect(await listed(ref)).toBeNull()
    // The same text published again stays cleared; new text puts it back on the list.
    expect((await c.call('/v1/draft/publish', { method: 'POST', key, json: {} })).status).toBe(200)
    expect(await listed(ref)).toBeNull()
    expect((await c.save(key, finishedSite({ business: { email, about: 'Verify your account, then your PIN number' } }))).status).toBe(200)
    expect((await c.call('/v1/draft/publish', { method: 'POST', key, json: {} })).status).toBe(200)
    expect(await listed(ref)).toMatchObject({ words: ['verify your account', 'pin number'] })
  })

  it('is recorded on an admin-key publish', async () => {
    const d = await draftWith('Bitcoin wallet repairs')
    expect((await c.publish(d.key, `review-admin-${n}`, ADMIN)).status).toBe(200)
    expect(await listed(d.ref)).toMatchObject({ words: ['bitcoin', 'wallet'], paid: false, published: true, url: `https://review-admin-${n}.${BASE}/` })
  })

  it('is recorded when a preview link is made, which still works as ever', async () => {
    const d = await draftWith('Account suspended? Sign in here')
    const res = await c.call('/v1/draft/preview', { method: 'POST', key: d.key })
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ url: expect.stringContaining('https://preview.') })
    expect(await listed(d.ref)).toMatchObject({ words: ['sign in', 'account suspended'], published: false, url: null })
  })

  it('is for admins only', async () => {
    const d = await draftWith('Crypto advice')
    expect((await c.checkout(d.key, `review-admins-${n}`)).status).toBe(201)
    expect((await c.call('/v1/admin/review')).status).toBe(401)
    expect((await c.call('/v1/admin/review', { admin: 'wrong-key-0123456789' })).status).toBe(403)
    expect((await c.call('/v1/admin/review', { key: d.key })).status).toBe(401)
    expect((await clear(d.ref, '')).status).toBe(401)
    expect((await clear(d.ref, 'wrong-key-0123456789')).status).toBe(403)
    expect(await listed(d.ref)).not.toBeNull()
    expect((await clear('not-a-ref')).status).toBe(422)
    expect((await clear('f'.repeat(32))).status).toBe(404)
  })
})
