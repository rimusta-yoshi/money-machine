import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { pickExport } from './client'
import type { Overview } from './client'
import { MONTHLY, SKIP_DAILY } from './dbExport'
import { continueFilesPass, EMPTY_PASS } from './files'
import { DAY, dailyId, idTime, trashKey } from './keys'
import { pruneBackups } from './retention'
import { chooseVersions } from './restoreFiles'
import type { Version } from './restoreFiles'
import { restoreTime } from './routes'
import { parentsFirst, pieces, restoreStatements } from './sql'
import type { Manifest } from './sql'
import { EMPTY_STATUS, health } from './status'
import type { Backups, ObjectStore, TableReader } from './types'

/** An in-memory bucket with a clock the test moves. */
function memoryStore(clock: { now: number }) {
  const objects = new Map<string, { bytes: Uint8Array; contentType: string; meta: Record<string, string>; uploaded: number }>()
  const store: ObjectStore = {
    async page(prefix, o = {}) {
      const keys = [...objects.keys()].filter(k => k.startsWith(prefix) && (!o.startAfter || k > o.startAfter)).sort()
      const limit = o.limit ?? 1000
      const slice = keys.slice(0, limit)
      return { objects: slice.map(key => ({ key, size: objects.get(key)!.bytes.length, uploaded: objects.get(key)!.uploaded, meta: objects.get(key)!.meta })), more: keys.length > limit }
    },
    async read(key) {
      const o = objects.get(key)
      return o ? { bytes: o.bytes.slice().buffer, contentType: o.contentType, meta: { ...o.meta } } : null
    },
    async write(key, bytes, contentType, meta = {}) {
      const data = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : new Uint8Array(bytes)
      objects.set(key, { bytes: data, contentType, meta: { ...meta }, uploaded: clock.now })
    },
    async remove(keys) { keys.forEach(k => objects.delete(k)) },
  }
  const text = (key: string) => (objects.has(key) ? new TextDecoder().decode(objects.get(key)!.bytes) : null)
  return { store, objects, text, keys: (prefix = '') => [...objects.keys()].filter(k => k.startsWith(prefix)).sort() }
}

const KEPT = 'a'.repeat(32)
const UNKEPT = 'b'.repeat(32)

function setup() {
  const clock = { now: Date.UTC(2026, 9, 16, 2, 47) }
  const live = memoryStore(clock)
  const store = memoryStore(clock)
  const db: TableReader = {
    schema: async () => [],
    rows: async () => [],
    keptRefs: async refs => new Set(refs.filter(r => r === KEPT)),
    refForSlug: async () => null,
    slugForRef: async () => null,
  }
  const b: Backups = { db, live: live.store, store: store.store }
  return { clock, live, store, b }
}

describe('files pass', () => {
  it('copies site files and paid sites\' photos, a budget at a time, and carries on where it stopped', async () => {
    const { clock, live, store, b } = setup()
    for (let i = 0; i < 12; i++) await live.store.write(`sites/joe/page${String(i).padStart(2, '0')}.html`, `page ${i}`, 'text/html')
    await live.store.write(`drafts/${KEPT}/photos/1.webp`, 'photo', 'image/webp')
    await live.store.write(`drafts/${UNKEPT}/photos/2.webp`, 'not paid', 'image/webp')
    await live.store.write('samples/bathroom.jpg', 'sample', 'image/jpeg')
    clock.now += 1000

    let state = EMPTY_PASS
    let runs = 0
    do {
      state = (await continueFilesPass(b, state, { now: clock.now, budget: 5, pageSize: 4 })).state
      runs++
    } while (state.startedAt !== null && runs < 50)
    expect(runs).toBeGreaterThan(1)
    expect(state.lastFullPassAt).not.toBeNull()
    expect(store.keys('files/')).toEqual([`files/drafts/${KEPT}/photos/1.webp`, ...Array.from({ length: 12 }, (_, i) => `files/sites/joe/page${String(i).padStart(2, '0')}.html`)])
  })

  it('keeps the old copy of a rewritten or deleted file in the trash', async () => {
    const { clock, live, store, b } = setup()
    await live.store.write('sites/joe/index.html', 'v1', 'text/html')
    await live.store.write('sites/joe/old.html', 'old', 'text/html')
    clock.now += 1000
    let state = (await continueFilesPass(b, EMPTY_PASS, { now: clock.now, budget: 100 })).state
    clock.now += DAY
    await live.store.write('sites/joe/index.html', 'v2', 'text/html')
    await live.store.remove(['sites/joe/old.html'])
    clock.now += 1000
    const second = await continueFilesPass(b, state, { now: clock.now, budget: 100 })
    state = second.state
    expect(second).toMatchObject({ done: true, copied: 1, trashed: 1 })
    expect(store.text('files/sites/joe/index.html')).toBe('v2')
    expect(store.text(trashKey('sites/joe/index.html', clock.now))).toBe('v1')
    expect(store.text(trashKey('sites/joe/old.html', clock.now))).toBe('old')
    expect(store.keys('files/')).toEqual(['files/sites/joe/index.html'])
    // Unchanged files aren't copied again.
    clock.now += DAY
    expect(await continueFilesPass(b, state, { now: clock.now, budget: 100 })).toMatchObject({ copied: 0, trashed: 0 })
  })
})

describe('choosing versions to restore', () => {
  const v = (key: string, written: number, until = Infinity): Version => ({ key, from: `x/${key}/${written}`, written, until })
  const versions = [v('a', 10, 20), v('a', 20), v('b', 5, 15), v('c', 25)]

  it('takes the newest copy of everything, deleted files included, with no time given', () => {
    expect(chooseVersions(versions).map(x => [x.key, x.written])).toEqual([['a', 20], ['b', 5], ['c', 25]])
  })

  it('takes the files as they were at a time', () => {
    expect(chooseVersions(versions, 12).map(x => [x.key, x.written])).toEqual([['a', 10], ['b', 5]])
    expect(chooseVersions(versions, 22).map(x => [x.key, x.written])).toEqual([['a', 20]])
  })

  it('reads YYYY-MM-DD as the end of that day', () => {
    expect(restoreTime('2026-10-15')).toBe(Date.parse('2026-10-15T23:59:59.999Z'))
    expect(restoreTime('2026-10-15T10:00:00Z')).toBe(Date.parse('2026-10-15T10:00:00Z'))
    expect(restoreTime(undefined)).toBeUndefined()
    expect(() => restoreTime('soon')).toThrow()
  })
})

describe('retention', () => {
  it('deletes dailies after 30 days (never the newest), monthlies after 12 months and trash after 30 days', async () => {
    const { clock, store } = setup()
    const now = clock.now
    const daily = (daysAgo: number, finished = true) => {
      const id = dailyId(now - daysAgo * DAY)
      return Promise.all([
        store.store.write(`db/daily/${id}/drafts.0001.json.gz`, 'x', 'application/gzip'),
        ...(finished ? [store.store.write(`db/daily/${id}/manifest.json`, '{}', 'application/json')] : []),
      ]).then(() => id)
    }
    const fresh = await daily(1)
    const old = await daily(31)
    const broken = await daily(2, false)
    await store.store.write('db/monthly/2025-10/manifest.json', '{}', 'application/json')
    await store.store.write('db/monthly/2025-11/manifest.json', '{}', 'application/json')
    await store.store.write(trashKey('sites/joe/a.html', now - 31 * DAY), 'a', 'text/html')
    await store.store.write(trashKey('sites/joe/b.html', now - 29 * DAY), 'b', 'text/html')

    expect(await pruneBackups(store.store, now)).toEqual({ exports: 3, files: 1 })
    expect(store.keys('db/daily/').some(k => k.includes(fresh))).toBe(true)
    expect(store.keys('db/daily/').some(k => k.includes(old) || k.includes(broken))).toBe(false)
    expect(store.keys('db/monthly/')).toEqual(['db/monthly/2025-11/manifest.json'])
    expect(store.keys('trash/')).toEqual([trashKey('sites/joe/b.html', now - 29 * DAY)])
  })

  it('keeps the newest daily export even when backups have stopped', async () => {
    const { clock, store } = setup()
    const id = dailyId(clock.now - 90 * DAY)
    await store.store.write(`db/daily/${id}/manifest.json`, '{}', 'application/json')
    await pruneBackups(store.store, clock.now)
    expect(store.keys('db/daily/')).toEqual([`db/daily/${id}/manifest.json`])
    expect(idTime(id)).toBe(clock.now - 90 * DAY)
  })
})

describe('monthly exports', () => {
  it('decide on every table the migrations make (a new table must be listed in MONTHLY)', () => {
    const dir = join(process.cwd(), 'server', 'migrations')
    const tables = readdirSync(dir).flatMap(f => [...readFileSync(join(dir, f), 'utf8').matchAll(/CREATE TABLE (\w+)/g)].map(m => m[1]))
    expect(tables.length).toBeGreaterThan(5)
    expect(tables.filter(t => !(t in MONTHLY))).toEqual([])
    expect([...SKIP_DAILY].every(t => MONTHLY[t] === 'skip')).toBe(true)
  })
})

describe('restore SQL', () => {
  const manifest: Manifest = {
    version: 1, kind: 'daily', id: 'x', at: 0,
    schema: [
      { type: 'table', name: 'slugs', table: 'slugs', sql: 'CREATE TABLE slugs (slug TEXT PRIMARY KEY, ref TEXT NOT NULL REFERENCES drafts (ref) ON DELETE CASCADE)' },
      { type: 'table', name: 'drafts', table: 'drafts', sql: 'CREATE TABLE drafts (ref TEXT PRIMARY KEY, record TEXT)' },
      { type: 'table', name: 'events', table: 'events', sql: 'CREATE TABLE events (id INTEGER PRIMARY KEY, step TEXT)' },
      { type: 'index', name: 'slugs_ref', table: 'slugs', sql: 'CREATE INDEX slugs_ref ON slugs (ref)' },
    ],
    tables: [{ name: 'slugs', rows: 2, parts: [] }, { name: 'drafts', rows: 2, parts: [] }, { name: 'events', rows: 1, parts: [] }],
  }
  const parts = [
    { table: 'slugs', columns: ['slug', 'ref'], rows: [['joe', 'r1'], ['ann', 'r2']] },
    { table: 'drafts', columns: ['ref', 'record'], rows: [['r1', `{"name":"Joe's"}`], ['r2', null]] },
    { table: 'events', columns: ['id', 'step'], rows: [[1, 'paid']] },
  ]

  it('puts referenced tables first', () => {
    expect(parentsFirst(manifest)).toEqual(['drafts', 'slugs', 'events'])
  })

  it('recreates tables and indexes, then inserts with quotes escaped', () => {
    const sql = restoreStatements(manifest, parts, { kind: 'recreate' })
    expect(sql.slice(0, 3)).toEqual(['DROP TABLE IF EXISTS "events";', 'DROP TABLE IF EXISTS "slugs";', 'DROP TABLE IF EXISTS "drafts";'])
    expect(sql).toContain('CREATE INDEX slugs_ref ON slugs (ref);')
    expect(sql).toContain(`INSERT INTO "drafts" ("ref", "record") VALUES ('r1', '{"name":"Joe''s"}');`)
    expect(sql.indexOf(`INSERT INTO "drafts" ("ref", "record") VALUES ('r2', NULL);`)).toBeLessThan(sql.findIndex(s => s.startsWith('INSERT INTO "slugs"')))
  })

  it('restores one site without touching anything else', () => {
    const sql = restoreStatements(manifest, parts, { kind: 'site', ref: 'r1' })
    expect(sql).toEqual([
      `INSERT OR REPLACE INTO "drafts" ("ref", "record") VALUES ('r1', '{"name":"Joe''s"}');`,
      `INSERT OR REPLACE INTO "slugs" ("slug", "ref") VALUES ('joe', 'r1');`,
    ])
  })

  it('replaces every row in place, child tables emptied first', () => {
    const sql = restoreStatements(manifest, parts, { kind: 'replace' })
    expect(sql.slice(0, 4)).toEqual(['PRAGMA defer_foreign_keys = true;', 'DELETE FROM "events";', 'DELETE FROM "slugs";', 'DELETE FROM "drafts";'])
  })

  it('adds long text in pieces, never splitting a character', () => {
    const text = `${'x'.repeat(9)}😀${'y'.repeat(10)}`
    expect(pieces(text, 10)).toEqual(['x'.repeat(9), `😀${'y'.repeat(8)}`, 'yy'])
    const sql = restoreStatements(manifest, [{ table: 'drafts', columns: ['ref', 'record'], rows: [['r1', 'abcdefghij']] }], { kind: 'site', ref: 'r1' }, 4)
    expect(sql).toEqual([
      `INSERT OR REPLACE INTO "drafts" ("ref", "record") VALUES ('r1', '');`,
      `UPDATE "drafts" SET "record" = "record" || 'abcd' WHERE rowid = last_insert_rowid();`,
      `UPDATE "drafts" SET "record" = "record" || 'efgh' WHERE rowid = last_insert_rowid();`,
      `UPDATE "drafts" SET "record" = "record" || 'ij' WHERE rowid = last_insert_rowid();`,
    ])
  })
})

describe('health and choosing an export', () => {
  const now = Date.UTC(2026, 9, 16, 12)
  it('is healthy only with a recent good export and a recent full pass of the files', () => {
    expect(health(EMPTY_STATUS, now).healthy).toBe(false)
    const good = { ...EMPTY_STATUS, db: { id: 'x', at: now - 10 * 3600_000, tables: 9, rows: 100 }, files: { ...EMPTY_PASS, lastFullPassAt: now - 10 * 3600_000 } }
    expect(health(good, now)).toEqual({ healthy: true, lastBackupAt: good.db.at, problems: [] })
    expect(health({ ...good, dbError: { at: now, error: 'D1 down' } }, now).problems[0]).toContain('D1 down')
    expect(health(good, now + 2 * DAY).healthy).toBe(false)
  })

  it('reads a date as that day\'s newest export, else the monthly before it', () => {
    const o = {
      daily: [{ id: '2026-10-15T024700.000Z' }, { id: '2026-10-15T150000.000Z' }, { id: '2026-10-16T024700.000Z' }],
      monthly: [{ id: '2026-08' }, { id: '2026-09' }],
    } as Overview
    expect(pickExport(o, 'latest')).toEqual({ kind: 'daily', id: '2026-10-16T024700.000Z' })
    expect(pickExport(o, '2026-10-15')).toEqual({ kind: 'daily', id: '2026-10-15T150000.000Z' })
    expect(pickExport(o, '2026-09-20')).toEqual({ kind: 'monthly', id: '2026-09' })
    expect(pickExport(o, '2026-08')).toEqual({ kind: 'monthly', id: '2026-08' })
    expect(() => pickExport(o, '2025-01-01')).toThrow()
  })
})
