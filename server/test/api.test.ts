import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { finishedSite } from '../../src/publish/test/sites'
import type { Site } from '../../src/site/schema'
import { ADMIN, API, BASE, BUILDER, client, freshIp, photoBytes } from './client'
import { startStack } from './stack'
import type { Stack } from './stack'

let s: Stack
let c: ReturnType<typeof client>
beforeAll(async () => {
  s = await startStack({ baseDomain: BASE, adminToken: ADMIN })
  c = client(s)
}, 60_000)
afterAll(() => s?.close(), 60_000)

const withPhotos = (site: Site, hero: string, gallery: string[] = []): Site =>
  ({ ...site, content: { ...site.content, photos: { hero: { url: hero, alt: 'A new boiler' }, about: null, gallery: gallery.map(url => ({ url, alt: 'Finished job' })) } } })

describe('drafts', () => {
  it('creates a draft with an unguessable key and loads it back', async () => {
    const key = await c.newDraft()
    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/)
    const res = await c.call('/v1/draft', { key })
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(await res.json()).toMatchObject({ record: null, slug: null, publishedUrl: null })
  })

  it('refuses a missing or wrong key', async () => {
    expect((await c.call('/v1/draft')).status).toBe(401)
    expect((await c.call('/v1/draft', { key: 'A'.repeat(43) })).status).toBe(401)
    expect((await c.call('/v1/draft', { key: 'short' })).status).toBe(401)
  })

  it('saves a valid record and returns it unchanged', async () => {
    const key = await c.newDraft()
    const site = finishedSite()
    expect((await c.save(key, site)).status).toBe(200)
    const body = (await (await c.call('/v1/draft', { key })).json()) as { record: Site }
    expect(body.record).toEqual(site)
  })

  it('migrates older records the same way the builder does', async () => {
    const key = await c.newDraft()
    const site = finishedSite()
    const v3 = { ...site, version: 3, style: { theme: 'professional', seed: site.style.seed, resolved: {} }, sections: {}, rhythm: {} }
    expect((await c.save(key, v3)).status).toBe(200)
    const body = (await (await c.call('/v1/draft', { key })).json()) as { record: Site }
    expect(body.record.version).toBe(4)
  })
})

describe('validation never trusts the builder', () => {
  let key: string
  beforeAll(async () => { key = await c.newDraft() })
  const site = () => JSON.parse(JSON.stringify(finishedSite())) as Site

  it.each<[string, (x: Site) => unknown]>([
    ['not a site', () => ({ hello: 'world' })],
    ['a bad brand colour', x => ({ ...x, brandColor: 'red' })],
    ['an unknown trade', x => ({ ...x, tradeId: 'astronaut' })],
    ['a name over the limit', x => ({ ...x, business: { ...x.business, name: 'x'.repeat(41) } })],
    ['an extra field in a layout', x => ({ ...x, sections: { ...x.sections, hero: { ...x.sections.hero!, spec: { ...x.sections.hero!.spec, html: '<script>' } } } })],
    ['a script photo URL', x => withPhotos(x, 'javascript:alert(1)')],
  ])('rejects %s with the issues listed', async (_label, mutate) => {
    const res = await c.save(key, mutate(site()))
    expect(res.status).toBe(422)
    const body = (await res.json()) as { error: string; issues: unknown[] }
    expect(body.error).toBe('invalid_site')
    expect(body.issues.length).toBeGreaterThan(0)
  })

  it('rejects photos that were not uploaded to this draft', async () => {
    const dataUrl = `data:image/jpeg;base64,${Buffer.from(photoBytes('painting-wall.jpg')).toString('base64')}`
    for (const url of [dataUrl, 'https://example.com/a.jpg', `https://preview.${BASE}/photos/${'0'.repeat(32)}/${'a'.repeat(32)}.jpg`]) {
      const res = await c.save(key, withPhotos(site(), url))
      expect(res.status, url.slice(0, 40)).toBe(422)
      expect(((await res.json()) as { error: string }).error).toBe('photo_not_uploaded')
    }
  })

  it('rejects bodies that are too big or not JSON', async () => {
    const big = { ...site(), padding: 'x'.repeat(300 * 1024) }
    expect((await c.save(key, big)).status).toBe(413)
    expect((await c.call('/v1/draft', { method: 'PUT', key, body: 'hello', type: 'text/plain' })).status).toBe(415)
    expect((await c.call('/v1/draft', { method: 'PUT', key, body: '{nope', type: 'application/json' })).status).toBe(400)
  })
})

describe('photos', () => {
  it('stores an upload under the draft, named by its content, and serves it from the preview host', async () => {
    const key = await c.newDraft()
    const url = await c.upload(key)
    expect(url).toMatch(new RegExp(`^https://preview\\.${BASE}/photos/[0-9a-f]{32}/[0-9a-f]{32}\\.jpg$`))
    expect(await c.upload(key)).toBe(url)
    const res = await s.fetch(url)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/jpeg')
    expect(res.headers.get('Cross-Origin-Resource-Policy')).toBe('cross-origin')
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(photoBytes())
    expect((await c.save(key, withPhotos(finishedSite(), url))).status).toBe(200)
  })

  it('refuses files that are not photos, whatever they claim to be', async () => {
    const key = await c.newDraft()
    const res = await c.call('/v1/draft/photos', { method: 'POST', key, body: '<svg onload=alert(1)>', type: 'image/jpeg' })
    expect(res.status).toBe(415)
  })

  it('refuses photos over the size limit', async () => {
    const key = await c.newDraft()
    const big = new Uint8Array(2 * 1024 * 1024 + 1)
    big.set([0xff, 0xd8, 0xff])
    expect((await c.call('/v1/draft/photos', { method: 'POST', key, body: big, type: 'image/jpeg' })).status).toBe(413)
  })
})

describe('preview links', () => {
  it('shows the latest save, marked as a preview and kept out of search', async () => {
    const key = await c.newDraft()
    const photo = await c.upload(key)
    await c.save(key, withPhotos(finishedSite(), photo))
    const { url, expiresAt } = await c.preview(key)
    expect(url).toMatch(new RegExp(`^https://preview\\.${BASE}/[A-Za-z0-9_-]{32}/$`))
    expect(new Date(expiresAt).getTime() - Date.now()).toBeGreaterThan(29 * 24 * 3600 * 1000)

    const res = await s.fetch(url)
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'none'")
    const html = await res.text()
    expect(html).toContain('Preview — not live yet')
    expect(html).toContain('<meta name="robots" content="noindex, nofollow">')
    expect(html).toContain(photo)
    const token = new URL(url).pathname.split('/')[1]
    expect(html).toContain(`href="/${token}/privacy"`)

    const base = new URL(url).pathname.replace(/\/$/, '')
    for (const [path, type] of [['/privacy', 'text/html'], ['/site.css', 'text/css'], ['/favicon.svg', 'image/svg+xml']]) {
      const r = await s.fetch(`https://preview.${BASE}${base}${path}`)
      expect(r.status, path).toBe(200)
      expect(r.headers.get('Content-Type')).toContain(type)
    }

    await c.save(key, finishedSite({ business: { name: 'Renamed Plumbing' } }))
    expect(await (await s.fetch(url)).text()).toContain('Renamed Plumbing')
  })

  it('stops working when it expires, and for made-up tokens', async () => {
    const key = await c.newDraft()
    await c.save(key, finishedSite())
    const { url } = await c.preview(key)
    const db = await s.db()
    await db.prepare('UPDATE previews SET expires_at = 0').run()
    const res = await s.fetch(url)
    expect(res.status).toBe(404)
    expect(await res.text()).toContain('expired')
    expect((await s.fetch(`https://preview.${BASE}/${'x'.repeat(32)}/`)).status).toBe(404)
    expect((await s.fetch(`https://preview.${BASE}/robots.txt`)).headers.get('Content-Type')).toContain('text/plain')
  })
})

describe('publishing', () => {
  /** A draft saved with uploaded photos, its layouts picked with those photos in place (as the builder would). */
  async function ready(o: Parameters<typeof finishedSite>[0] = {}) {
    const key = await c.newDraft()
    const photo = await c.upload(key)
    const about = await c.upload(key, photoBytes('kitchen.jpg'))
    const photos = { hero: { url: photo, alt: 'A new boiler' }, about: { url: about, alt: 'The van' }, gallery: [] }
    await c.save(key, finishedSite({ ...o, content: { ...o.content, photos } }))
    return { key, photo }
  }

  it('is closed without the admin key', async () => {
    const { key } = await ready()
    expect((await c.publish(key, 'no-admin-plumbing', '')).status).toBe(403)
    expect((await c.publish(key, 'no-admin-plumbing', 'wrong-key-0123456789abcdef')).status).toBe(403)
  })

  it('needs the business details and every section checked', async () => {
    const noEmail = await ready({ business: { email: '' } })
    expect(((await (await c.publish(noEmail.key, 'no-email-plumbing')).json()) as { error: string }).error).toBe('not_ready')
    const unchecked = await c.newDraft()
    await c.save(unchecked, { ...finishedSite(), sections: {} })
    expect(((await (await c.publish(unchecked, 'unchecked-plumbing')).json()) as { error: string }).error).toBe('not_checked')
  })

  it('refuses reserved and malformed addresses', async () => {
    const { key } = await ready()
    for (const slug of ['www', 'admin', 'Joes', 'a', 'shit-plumbing', '../etc']) {
      const res = await c.publish(key, slug)
      expect(res.status, slug).toBe(422)
    }
  })

  it('publishes static files to the subdomain, with photos copied and security headers set', async () => {
    const { key, photo } = await ready()
    const res = await c.publish(key, 'joes-plumbing')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ slug: 'joes-plumbing', url: `https://joes-plumbing.${BASE}/` })

    const home = await s.fetch(`https://joes-plumbing.${BASE}/`)
    expect(home.status).toBe(200)
    expect(home.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
    expect(home.headers.get('Cache-Control')).toBe('public, max-age=60, must-revalidate')
    expect(home.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
    expect(home.headers.get('Content-Security-Policy')).toContain("default-src 'none'")
    expect(home.headers.get('X-Frame-Options')).toBe('DENY')
    const html = await home.text()
    expect(html).not.toContain('preview.')
    expect(html).not.toContain('Preview — not live yet')
    const photoPath = `/photos/${photo.split('/').pop()}`
    expect(html).toContain(`<meta property="og:image" content="https://joes-plumbing.${BASE}${photoPath}">`)
    expect([...html.matchAll(/<img[^>]* src="([^"]+)"/g)].every(m => m[1].startsWith('/photos/'))).toBe(true)

    const etag = home.headers.get('ETag')!
    expect((await s.fetch(`https://joes-plumbing.${BASE}/`, { headers: { 'If-None-Match': etag } })).status).toBe(304)

    const css = html.match(/href="(\/site-[0-9a-f]+\.css)"/)![1]
    const get = (p: string) => s.fetch(`https://joes-plumbing.${BASE}${p}`)
    expect((await get(css)).headers.get('Cache-Control')).toContain('immutable')
    expect((await get(photoPath)).headers.get('Content-Type')).toBe('image/jpeg')
    expect(await (await get('/privacy')).text()).toContain('Privacy notice')
    expect(await (await get('/robots.txt')).text()).toBe('User-agent: *\nDisallow: /\n')
    expect(await (await get('/sitemap.xml')).text()).toContain(`<loc>https://joes-plumbing.${BASE}/privacy</loc>`)
    expect((await get('/favicon.svg')).headers.get('Content-Type')).toBe('image/svg+xml')
    expect((await get('/fonts/inter-400.woff2')).headers.get('Content-Type')).toBe('font/woff2')
    expect((await get('/fonts/LICENSES.txt')).status).toBe(200)
    for (const p of ['/nope', '/photos/..%2findex.html', '/%2e%2e/x.css', '/.env', '/index.php']) expect((await get(p)).status, p).toBe(404)
    expect((await s.fetch(`https://joes-plumbing.${BASE}/`, { method: 'POST' })).status).toBe(405)
    expect((await s.fetch(`https://nobody-here.${BASE}/`)).status).toBe(404)
    const www = await s.fetch(`https://www.${BASE}/build/?x=1`, { redirect: 'manual' })
    expect(www.status).toBe(301)
    expect(www.headers.get('Location')).toBe(`https://${BASE}/build/?x=1`)

    const draft = (await (await c.call('/v1/draft', { key })).json()) as { slug: string; publishedUrl: string }
    expect(draft).toMatchObject({ slug: 'joes-plumbing', publishedUrl: `https://joes-plumbing.${BASE}/` })
  })

  it('keeps addresses unique, and offers a free one', async () => {
    const first = await ready()
    expect((await c.publish(first.key, 'pipes-r-us')).status).toBe(200)
    const second = await ready()
    const status = (await (await c.call('/v1/slugs/pipes-r-us', { key: second.key })).json()) as { available: boolean; suggestion: string }
    expect(status.available).toBe(false)
    expect(status.suggestion).toBe('joes-plumbing-leeds')
    const res = await c.publish(second.key, 'pipes-r-us')
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ error: 'slug_taken', suggestion: 'joes-plumbing-leeds' })
    // Its own address is free to the draft that holds it.
    expect(await (await c.call('/v1/slugs/pipes-r-us', { key: first.key })).json()).toMatchObject({ available: true })
    expect(await (await c.call('/v1/slugs/admin', { key: first.key })).json()).toMatchObject({ available: false })
  })

  it('moves the site when the address changes, freeing the old one', async () => {
    const { key } = await ready()
    expect((await c.publish(key, 'old-address')).status).toBe(200)
    expect((await c.publish(key, 'new-address')).status).toBe(200)
    expect((await s.fetch(`https://old-address.${BASE}/`)).status).toBe(404)
    expect((await s.fetch(`https://new-address.${BASE}/`)).status).toBe(200)
    const other = await ready()
    expect((await c.publish(other.key, 'old-address')).status).toBe(200)
  })

  it('frees a new address again when publishing to it fails', async () => {
    const { key } = await ready()
    expect((await c.publish(key, 'first-home')).status).toBe(200)
    // A photo vanishes from storage between saving and publishing.
    const bucket = await s.mf.getR2Bucket('BUCKET', 'api')
    const photos = await bucket.list({ prefix: 'drafts/' })
    const draft = (await (await c.call('/v1/draft', { key })).json()) as { record: Site }
    const name = draft.record.content.photos.hero!.url.split('/').pop()!
    await bucket.delete(photos.objects.filter(o => o.key.endsWith(name)).map(o => o.key))
    const res = await c.publish(key, 'second-home')
    expect(((await res.json()) as { error: string }).error).toBe('photo_missing')
    const other = await ready()
    expect(await (await c.call('/v1/slugs/second-home', { key: other.key })).json()).toMatchObject({ available: true })
    expect((await s.fetch(`https://first-home.${BASE}/`)).status).toBe(200)
  })

  it('republishing replaces the files and drops photos no longer used', async () => {
    const { key, photo } = await ready()
    expect((await c.publish(key, 'republish-test')).status).toBe(200)
    const oldPhoto = `https://republish-test.${BASE}/photos/${photo.split('/').pop()}`
    expect((await s.fetch(oldPhoto)).status).toBe(200)
    const other = await c.upload(key, photoBytes('roof-tiles.jpg'))
    await c.save(key, withPhotos(finishedSite({ business: { name: 'Republished Ltd' } }), other))
    expect((await c.publish(key, 'republish-test')).status).toBe(200)
    expect(await (await s.fetch(`https://republish-test.${BASE}/`)).text()).toContain('Republished Ltd')
    expect((await s.fetch(oldPhoto)).status).toBe(404)
  })
})

describe('the API edge', () => {
  it('lets only the builder call it from a browser', async () => {
    const pre = await s.fetch(`${API}/v1/drafts`, { method: 'OPTIONS', headers: { Origin: BUILDER, 'Access-Control-Request-Method': 'POST' } })
    expect(pre.status).toBe(204)
    expect(pre.headers.get('Access-Control-Allow-Origin')).toBe(BUILDER)
    expect(pre.headers.get('Access-Control-Allow-Headers')).toContain('Authorization')
    const evil = await s.fetch(`${API}/v1/drafts`, { method: 'POST', headers: { Origin: 'https://evil.example' } })
    expect(evil.status).toBe(403)
    expect(evil.headers.get('Access-Control-Allow-Origin')).toBeNull()
    const ok = await c.call('/v1/drafts', { method: 'POST', origin: BUILDER })
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe(BUILDER)
  })

  it('rate limits each caller', async () => {
    const ip = freshIp()
    const codes: number[] = []
    for (let i = 0; i < 21; i++) codes.push((await c.call('/v1/drafts', { method: 'POST', ip })).status)
    expect(codes.slice(0, 20).every(x => x === 201)).toBe(true)
    expect(codes[20]).toBe(429)
    const last = await c.call('/v1/drafts', { method: 'POST', ip })
    expect(Number(last.headers.get('Retry-After'))).toBeGreaterThan(0)
    expect((await c.call('/v1/drafts', { method: 'POST' })).status).toBe(201)
  })

  it('answers unknown paths, methods and hosts plainly', async () => {
    expect((await c.call('/v1/nope')).status).toBe(404)
    expect((await c.call('/v1/drafts')).status).toBe(405)
    const key = await c.newDraft()
    expect((await c.call('/v1/slugs/%E0', { key })).status).toBe(400)
    expect((await s.fetch(`https://unknown.example/`)).status).toBe(404)
  })

  it('serves the builder sample photos only once uploaded, and only listed files', async () => {
    expect((await s.fetch(`${API}/samples/bathroom.jpg`)).status).toBe(404)
    await s.mf.getR2Bucket('BUCKET', 'api').then(b => b.put('samples/bathroom.jpg', photoBytes(), { httpMetadata: { contentType: 'image/jpeg' } }))
    const res = await s.fetch(`${API}/samples/bathroom.jpg`, { headers: { Origin: BUILDER } })
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(BUILDER)
    expect((await s.fetch(`${API}/samples/secret.jpg`)).status).toBe(404)
  })
})
