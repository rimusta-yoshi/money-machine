import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { finishedSite } from '../../src/publish/test/sites'
import { API, BASE, client, photoBytes } from './client'
import { fakeStripe, PAYMENT_VARS } from './fakeStripe'
import { startStack } from './stack'
import type { Stack } from './stack'

/** Clearing test sites before launch: admin key only, and never once launched. */

const ADMIN = 'sites-admin-key-0123456789abcdef'
let s: Stack
let launched: Stack
let c: ReturnType<typeof client>
const stripe = fakeStripe()
beforeAll(async () => {
  s = await startStack({ baseDomain: BASE, adminToken: ADMIN, vars: PAYMENT_VARS, outbound: stripe.handle })
  launched = await startStack({ baseDomain: BASE, adminToken: ADMIN, vars: { ...PAYMENT_VARS, LAUNCHED: 'true' }, outbound: stripe.handle })
  c = client(s)
}, 60_000)
afterAll(async () => { await s?.close(); await launched?.close() }, 60_000)

type Listed = { ref: string; url: string | null; paid: boolean; refunded: boolean }
const list = async (stack = s) => (await client(stack).call('/v1/admin/sites', { admin: ADMIN }).then(r => r.json())) as { sites: Listed[]; launched: boolean }
const del = (body: unknown, stack = s, admin = ADMIN) => client(stack).call('/v1/admin/sites/delete', { method: 'POST', json: body, admin })

let n = 0
async function ready() {
  const key = await c.newDraft()
  const hero = await c.upload(key, photoBytes('kitchen.jpg'))
  const record = finishedSite({ business: { email: `tester${++n}@example.com` }, content: { photos: { hero: { url: hero, alt: 'A kitchen' }, about: null, gallery: [] } } })
  expect((await c.save(key, record)).status).toBe(200)
  return key
}
async function paid(slug: string) {
  const key = await ready()
  expect((await c.checkout(key, slug)).status).toBe(201)
  expect((await s.fetch(...await stripe.webhook(API, stripe.completed(stripe.lastSession().id)))).status).toBe(200)
  return key
}
const site = (slug: string) => s.fetch(`https://${slug}.${BASE}/`)

describe('test sites', () => {
  it('lists published and paid sites, and deletes the chosen ones for good', async () => {
    const keepKey = await paid('keep-me')
    const goKey = await paid('test-gone')
    const unpaid = await ready()
    expect((await c.publish(unpaid, 'test-unpaid', ADMIN)).status).toBe(200)
    const before = await list()
    expect(before.launched).toBe(false)
    const byUrl = (slug: string) => before.sites.find(x => x.url === `https://${slug}.${BASE}/`)!
    expect(byUrl('keep-me')).toMatchObject({ paid: true })
    expect(byUrl('test-unpaid')).toMatchObject({ paid: false })

    const res = await del({ refs: [byUrl('test-gone').ref, byUrl('test-unpaid').ref] })
    expect(res.status, await res.clone().text()).toBe(200)
    expect((await res.json() as { deleted: { addresses: string[] }[] }).deleted.flatMap(d => d.addresses).sort()).toEqual(['test-gone', 'test-unpaid'])
    // Gone everywhere: the site, the record (its key no longer opens anything), and the address is free again.
    expect((await site('test-gone')).status).toBe(404)
    expect((await site('test-unpaid')).status).toBe(404)
    expect((await c.call('/v1/draft', { key: goKey })).status).toBe(401)
    expect((await site('keep-me')).status).toBe(200)
    expect((await c.call('/v1/draft', { key: keepKey })).status).toBe(200)
    const other = await ready()
    expect((await c.checkout(other, 'test-gone')).status).toBe(201)

    expect((await del({ all: true })).status).toBe(200)
    expect((await list()).sites).toEqual([])
    expect((await site('keep-me')).status).toBe(404)
  })

  it('needs the admin key, and refuses to delete anything once launched', async () => {
    expect((await del({ all: true }, s, 'wrong-key-0123456789abcdefghij')).status).toBe(403)
    expect((await client(s).call('/v1/admin/sites')).status).toBe(401)
    const res = await del({ all: true }, launched)
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ error: 'launched' })
    expect((await list(launched)).launched).toBe(true)
  })
})
