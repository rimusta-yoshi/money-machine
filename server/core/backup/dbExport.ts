import { exportPrefix, manifestKey } from './keys'
import { FORMAT_VERSION, gzip } from './sql'
import type { Manifest, ManifestTable } from './sql'
import type { ObjectStore, TableReader } from './types'

/**
 * The daily logical export of the database: every table's rows as gzipped JSON in the backup
 * bucket, the manifest written last. Secrets are never in the database (only hashes of keys and
 * links), so there's nothing to leave out for that reason.
 */

/** Rows per query: drafts hold a site record each (up to 256 KB). */
const PAGE = 50
/** A part file is closed at about this much JSON. */
const PART_BYTES = 4 * 1024 * 1024

/** Never exported: per-hour counters, worthless after a day. */
export const SKIP_DAILY = new Set(['rate_limits'])

const KEPT_DRAFT = 'paid_at IS NOT NULL OR published_at IS NOT NULL'
const OF_KEPT_DRAFT = `ref IN (SELECT ref FROM drafts WHERE ${KEPT_DRAFT})`

/**
 * What the monthly export (kept 12 months) holds. Only paid or published sites and anonymous
 * dashboard numbers: unfinished sites, preview links, checkouts and the "finish on your
 * computer" email are kept no longer than the 30 days of daily exports. A table not listed here
 * is left out of monthlies (backup.test.ts makes every new table be listed here or in SKIP_DAILY).
 */
export const MONTHLY: Record<string, { where?: string; blank?: string[] } | 'skip'> = {
  drafts: { where: KEPT_DRAFT, blank: ['resume_email'] },
  slugs: { where: OF_KEPT_DRAFT },
  custom_domains: { where: OF_KEPT_DRAFT },
  events: {},
  layout_picks: {},
  requested_types: {},
  d1_migrations: {},
  previews: 'skip',
  checkouts: 'skip',
  stripe_events: 'skip',
  rate_limits: 'skip',
}

/** `calls`: database and storage calls made, counted against the nightly run's budget. */
export interface ExportResult { id: string; tables: number; rows: number; calls: number }

async function exportTable(db: TableReader, store: ObjectStore, prefix: string, table: string, rule: { where?: string; blank?: string[] }): Promise<ManifestTable & { calls: number }> {
  let calls = 0
  const parts: string[] = []
  let columns: string[] | null = null
  let rows: unknown[][] = []
  let bytes = 0
  let total = 0
  const flush = async () => {
    if (!rows.length || !columns) return
    const key = `${prefix}${table}.${String(parts.length + 1).padStart(4, '0')}.json.gz`
    await store.write(key, await gzip(JSON.stringify({ table, columns, rows })), 'application/gzip')
    calls++
    parts.push(key)
    rows = []
    bytes = 0
  }
  let after = Number.MIN_SAFE_INTEGER
  for (;;) {
    const page = await db.rows(table, after, PAGE, rule.where)
    calls++
    for (const { rowid, row } of page) {
      columns ??= Object.keys(row)
      const values = columns.map(c => (rule.blank?.includes(c) ? null : row[c] ?? null))
      rows.push(values)
      bytes += JSON.stringify(values).length
      total++
      after = rowid
      if (bytes >= PART_BYTES) await flush()
    }
    if (page.length < PAGE) break
  }
  await flush()
  return { name: table, rows: total, parts, calls }
}

/** Writes one export. A failure part-way leaves no manifest, so it never counts as a backup. */
export async function exportDatabase(db: TableReader, store: ObjectStore, kind: 'daily' | 'monthly', id: string, now: number): Promise<ExportResult> {
  const schema = await db.schema()
  const prefix = exportPrefix(kind, id)
  const tables: ManifestTable[] = []
  let calls = 2
  for (const name of schema.filter(s => s.type === 'table').map(s => s.name)) {
    const rule = kind === 'daily' ? (SKIP_DAILY.has(name) ? 'skip' : {}) : MONTHLY[name] ?? 'skip'
    if (rule === 'skip') continue
    const { calls: used, ...table } = await exportTable(db, store, prefix, name, rule)
    tables.push(table)
    calls += used
  }
  const kept = new Set(tables.map(t => t.name))
  const manifest: Manifest = { version: FORMAT_VERSION, kind, id, at: now, schema: schema.filter(s => kept.has(s.table)), tables }
  await store.write(manifestKey(kind, id), JSON.stringify(manifest), 'application/json')
  return { id, tables: tables.length, rows: tables.reduce((n, t) => n + t.rows, 0), calls }
}
