import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { SiteExport } from '../../src/publish/siteZip'
import { buildSiteZip } from '../../src/publish/siteZip'
import { portableCss, portableHtml } from '../../src/publish/portable'
import { finishedSite } from '../../src/publish/test/sites'
import { unzipStored } from '../../src/publish/zip'
import { DOWNLOADS_PER_DAY } from '../core/export'
import { API, BASE, client, freshIp, photoBytes } from './client'
import { fakeStripe, PAYMENT_VARS } from './fakeStripe'
import { startStack } from './stack'
import type { Stack } from './stack'

/** "Download your site" under Miniflare: who may download, the daily allowance, and what's in the zip. */

const ADMIN = 'export-admin-key-0123456789abcdef'
let s: Stack
let c: ReturnType<typeof client>
const stripe = fakeStripe()
beforeAll(async () => {
  s = await startStack({ baseDomain: BASE, adminToken: ADMIN, vars: PAYMENT_VARS, outbound: stripe.handle })
  c = client(s)
}, 60_000)
afterAll(() => s?.close(), 60_000)

const send = async (event: unknown) => s.fetch(...await stripe.webhook(API, event))
const exportOf = (key: string) => c.call('/v1/draft/export', { key })

let n = 0
async function ready() {
  const key = await c.newDraft()
  const hero = await c.upload(key)
  const about = await c.upload(key, photoBytes('kitchen.jpg'))
  const email = `exporter${++n}@example.com`
  const record = finishedSite({ business: { email }, content: { photos: { hero: { url: hero, alt: 'A new boiler' }, about: { url: about, alt: 'The van' }, gallery: [] } } })
  expect((await c.save(key, record)).status).toBe(200)
  return { key, email }
}

async function paidSite(slug: string) {
  const d = await ready()
  expect((await c.checkout(d.key, slug)).status).toBe(201)
  const session = stripe.lastSession()
  expect((await send(stripe.completed(session.id))).status).toBe(200)
  const welcome = stripe.emailsTo(d.email).find(e => e.subject.startsWith('Your site is live'))!
  return { ...d, session, welcome, editToken: /#edit=([\w.-]+)/.exec(welcome.text)![1] }
}

describe('download your site', () => {
  it('gives the live site, portable, and the zip opens to exactly it', async () => {
    const p = await paidSite('zip-me')
    const res = await exportOf(p.key)
    expect(res.status, await res.clone().text()).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    const exp = await res.json() as SiteExport
    expect(exp.name).toBe('zip-me.zip')
    const paths = exp.files.map(f => f.path)
    expect(paths).toEqual(['index.html', 'privacy.html', expect.stringMatching(/^site-[0-9a-f]{12}\.css$/), 'favicon.svg', 'README.txt'])
    expect(exp.fetch.map(f => f.path)).toEqual(expect.arrayContaining([expect.stringMatching(/^photos\/.+\.(webp|jpg)$/), expect.stringMatching(/^fonts\/.+\.woff2$/), 'fonts/LICENSES.txt']))
    expect(exp.fetch.filter(f => f.path.startsWith('photos/'))).toHaveLength(2)

    // The same as what's published, links aside.
    const live = (path: string) => s.fetch(`https://zip-me.${BASE}${path}`).then(r => r.text())
    const css = exp.files[2]
    expect(exp.files[0].text).toBe(portableHtml(await live('/')))
    expect(exp.files[1].text).toBe(portableHtml(await live('/privacy')))
    expect(css.text).toBe(portableCss(await live(`/${css.path}`)))
    expect(exp.files[4].text).toContain(`/guide/host-your-own-site/`)

    // Photos may be fetched from the builder (CORS), and the zip holds every file the pages use.
    const photo = await s.fetch(exp.fetch.find(f => f.path.startsWith('photos/'))!.url)
    expect(photo.headers.get('Access-Control-Allow-Origin')).toBe('*')
    const zip = unzipStored(await buildSiteZip(exp, url => s.fetch(url)))
    expect([...zip.keys()].sort()).toEqual([...paths, ...exp.fetch.map(f => f.path)].sort())
    const text = (name: string) => new TextDecoder().decode(zip.get(name))
    for (const page of ['index.html', 'privacy.html']) {
      const html = text(page)
      // Nothing points at the old address or a server root; every local link is in the zip.
      expect(html).not.toMatch(/(?:href|src)="\/|rel="canonical"|og:url|og:image|name="robots"/)
      expect(html).not.toMatch(/<script/)
      for (const [, ref] of html.matchAll(/(?:href|src)="([^"#:]+)"/g)) expect(zip.has(ref), `${page} -> ${ref}`).toBe(true)
    }
    for (const [, font] of text(css.path).matchAll(/url\('([^']+)'\)/g)) expect(zip.has(font), font).toBe(true)
    expect(text('fonts/LICENSES.txt')).toContain('SIL OPEN FONT LICENSE Version 1.1')
  })

  it('works with the edit link from the welcome email, whose download link uses the same key', async () => {
    const p = await paidSite('zip-by-link')
    expect(p.welcome.text).toContain(`#download=${p.editToken}`)
    expect(p.welcome.text).toContain('/privacy/')
    expect(p.welcome.text).toContain('/terms/')
    expect((await exportOf(p.editToken)).status).toBe(200)
  })

  it('allows ten downloads a day per site', async () => {
    const p = await paidSite('zip-often')
    for (let i = 0; i < DOWNLOADS_PER_DAY; i++) expect((await c.call('/v1/draft/export', { key: p.key, ip: freshIp() })).status).toBe(200)
    const res = await c.call('/v1/draft/export', { key: p.key, ip: freshIp() })
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toMatch(/^\d+$/)
  })

  it('is closed to unpaid, refunded and disputed sites', async () => {
    const unpaid = await ready()
    expect((await c.publish(unpaid.key, 'zip-unpaid', ADMIN)).status).toBe(200)
    expect(await (await exportOf(unpaid.key)).json()).toMatchObject({ error: 'not_paid' })

    const refunded = await paidSite('zip-refunded')
    expect((await send(stripe.chargeRefunded(refunded.session.paymentIntent))).status).toBe(200)
    const r = await exportOf(refunded.key)
    expect(r.status).toBe(403)
    expect(await r.json()).toMatchObject({ error: 'refunded' })

    const disputed = await paidSite('zip-disputed')
    expect((await send(stripe.dispute(disputed.session.paymentIntent, 'created'))).status).toBe(200)
    expect(await (await exportOf(disputed.key)).json()).toMatchObject({ error: 'disputed' })

    expect((await c.call('/v1/draft/export')).status).toBe(401)
  })
})
