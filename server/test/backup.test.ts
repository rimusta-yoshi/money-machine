import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { finishedSite } from '../../src/publish/test/sites'
import { checkExport, downloadExport, fetchOverview, pickExport, verifyBackups } from '../core/backup/client'
import type { Overview } from '../core/backup/client'
import { restoreStatements } from '../core/backup/sql'
import { API, BASE, client, freshIp, photoBytes } from './client'
import { fakeStripe, PAYMENT_VARS } from './fakeStripe'
import { startStack } from './stack'
import type { D1Like, Stack } from './stack'

/**
 * Backups on the local stack: the nightly backup, a site deleted by mistake, and both its
 * database rows and its files put back (server/README.md "Backups and restore").
 */

const ADMIN = 'backup-admin-key-0123456789abcdef'
const NIGHTLY = '47 2 * * *'
let s: Stack
let c: ReturnType<typeof client>
const stripe = fakeStripe()
beforeAll(async () => {
  s = await startStack({ baseDomain: BASE, adminToken: ADMIN, vars: PAYMENT_VARS, outbound: stripe.handle })
  c = client(s)
}, 60_000)
afterAll(async () => { await s?.close() }, 60_000)

const headers = (extra: Record<string, string> = {}) => ({ 'X-Admin-Key': ADMIN, 'CF-Connecting-IP': freshIp(), ...extra })
const get = (path: string) => s.fetch(`${API}${path}`, { headers: headers() })
const post = (path: string, body: unknown) => s.fetch(`${API}${path}`, { method: 'POST', headers: headers({ 'Content-Type': 'application/json' }), body: JSON.stringify(body) })
const site = (slug: string) => s.fetch(`https://${slug}.${BASE}/`)

let n = 0
async function ready() {
  const key = await c.newDraft()
  const hero = await c.upload(key, photoBytes('kitchen.jpg'))
  const record = finishedSite({ business: { email: `backup${++n}@example.com` }, content: { photos: { hero: { url: hero, alt: 'A kitchen' }, about: null, gallery: [] } } })
  expect((await c.save(key, record)).status).toBe(200)
  return key
}
async function paid(slug: string) {
  const key = await ready()
  expect((await c.checkout(key, slug)).status).toBe(201)
  expect((await s.fetch(...await stripe.webhook(API, stripe.completed(stripe.lastSession().id)))).status).toBe(200)
  return key
}

/** Every pass of the files finished, as the quarter-hourly catch-up would. */
async function backUpEverything(): Promise<Overview> {
  await (await s.mf.getWorker('api')).scheduled({ cron: NIGHTLY })
  for (let i = 0; i < 20; i++) {
    const o = await fetchOverview(get)
    if (o.status.files.startedAt === null) return o
    expect((await post('/v1/admin/backups/run', { files: true })).status).toBe(200)
  }
  throw new Error('The files never finished backing up')
}

/** Runs restore SQL as `npm run backup -- restore-db` does on the local database. */
async function apply(db: D1Like, statements: string[]) {
  for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50).map(st => db.prepare(st)))
}

const backupKeys = async (prefix: string) => (await (await s.mf.getR2Bucket('BACKUPS', 'api')).list({ prefix })).objects.map(o => o.key)

describe('backups', () => {
  let first: Overview
  let ref: string
  let key: string
  let unpaidRef: string
  let html: string
  let saved: unknown

  it('backs up the database and the paid site\'s files every night, and says so', async () => {
    key = await paid('safe-site')
    await ready()
    html = await (await site('safe-site')).text()
    saved = await (await c.call('/v1/draft', { key })).json()
    expect(html).toContain('</html>')
    const sites = (await (await get('/v1/admin/sites')).json()) as { sites: { ref: string; url: string | null }[] }
    ref = sites.sites.find(x => x.url === `https://safe-site.${BASE}/`)!.ref
    unpaidRef = (await (await s.db()).prepare('SELECT ref FROM drafts WHERE paid_at IS NULL AND published_at IS NULL').bind().first<{ ref: string }>())!.ref

    first = await backUpEverything()
    expect(first.health).toMatchObject({ healthy: true, problems: [] })
    expect(first.daily).toHaveLength(1)
    expect(first.monthly).toHaveLength(1)
    const verified = await verifyBackups(get)
    expect(verified.ok, verified.lines.join('\n')).toBe(true)

    // The paid site's pages and photos are copied; an unfinished site's photos are not.
    expect((await backupKeys('files/sites/safe-site/')).some(k => k.endsWith('index.html'))).toBe(true)
    expect(await backupKeys(`files/drafts/${ref}/photos/`)).toHaveLength(1)
    expect(await backupKeys(`files/drafts/${unpaidRef}/`)).toEqual([])
    expect(await backupKeys('files/samples/')).toEqual([])
  })

  it('keeps unfinished sites out of the monthly export, and counters out of every export', async () => {
    const daily = await downloadExport(get, pickExport(first, 'latest'))
    expect(checkExport(daily)).toEqual([])
    const tables = daily.manifest.tables.map(t => t.name)
    expect(tables).toContain('drafts')
    expect(tables).not.toContain('rate_limits')
    const refs = (d: typeof daily) => {
      const p = d.parts.find(x => x.table === 'drafts')!
      return p.rows.map(r => r[p.columns.indexOf('ref')])
    }
    expect(refs(daily)).toEqual(expect.arrayContaining([ref, unpaidRef]))

    const monthly = await downloadExport(get, { kind: 'monthly', id: first.monthly[0].id })
    expect(refs(monthly)).toContain(ref)
    expect(refs(monthly)).not.toContain(unpaidRef)
    expect(monthly.manifest.tables.map(t => t.name)).not.toContain('checkouts')
  })

  it('puts back a site deleted by mistake: its rows, pages and photos', async () => {
    expect((await post('/v1/admin/sites/delete', { refs: [ref] })).status).toBe(200)
    expect((await site('safe-site')).status).toBe(404)
    expect((await c.call('/v1/draft', { key })).status).toBe(401)

    // The next night: the copies of the deleted files are kept (30 days), not dropped.
    await backUpEverything()
    expect(await backupKeys('files/sites/safe-site/')).toEqual([])
    expect((await backupKeys('trash/sites/safe-site/')).length).toBeGreaterThan(0)

    // The rows, from the export made before the delete (small pieces: long text goes in several statements).
    const before = await downloadExport(get, { kind: 'daily', id: first.daily[0].id })
    await apply(await s.db(), restoreStatements(before.manifest, before.parts, { kind: 'site', ref }, 1000))
    const restored = await c.call('/v1/draft', { key })
    expect(restored.status).toBe(200)
    expect(await restored.json()).toEqual(saved)

    // The files: a dry run says what it would put back and writes nothing.
    const dry = await post('/v1/admin/backups/restore-files', { ref, dryRun: true })
    const planned = (await dry.json()) as { files: { key: string }[]; restored: number }
    expect(planned.restored).toBe(0)
    expect(planned.files.map(f => f.key)).toEqual(expect.arrayContaining(['sites/safe-site/index.html']))
    expect(planned.files.some(f => f.key.startsWith(`drafts/${ref}/photos/`))).toBe(true)
    expect((await site('safe-site')).status).toBe(404)

    const done = (await (await post('/v1/admin/backups/restore-files', { slug: 'safe-site', dryRun: false })).json()) as { restored: number }
    expect(done.restored).toBe(planned.files.length)
    const back = await site('safe-site')
    expect(back.status).toBe(200)
    expect(await back.text()).toBe(html)
  })

  it('rebuilds a whole database from an export, as the local copy to inspect', async () => {
    const fresh = await startStack({ baseDomain: BASE })
    try {
      const d = await downloadExport(get, { kind: 'daily', id: first.daily[0].id })
      const db = await fresh.db()
      await apply(db, restoreStatements(d.manifest, d.parts, { kind: 'recreate' }))
      const count = await db.prepare('SELECT COUNT(*) AS n FROM drafts').bind().first<{ n: number }>()
      expect(count?.n).toBe(d.manifest.tables.find(t => t.name === 'drafts')!.rows)
    } finally {
      await fresh.close()
    }
  }, 60_000)

  it('needs the admin key, and hands out only backup files', async () => {
    expect((await s.fetch(`${API}/v1/admin/backups`, { headers: { 'CF-Connecting-IP': freshIp() } })).status).toBe(401)
    expect((await get('/v1/admin/backups/file?key=state/status.json')).status).toBe(422)
    expect((await get(`/v1/admin/backups/file?key=${encodeURIComponent('files/sites/safe-site/index.html')}`)).status).toBe(422)
    expect((await post('/v1/admin/backups/restore-files', { slug: 'safe-site', ref, dryRun: true })).status).toBe(422)
    expect((await post('/v1/admin/backups/restore-files', { slug: 'safe-site', at: 'last tuesday', dryRun: true })).status).toBe(422)
  })
})
