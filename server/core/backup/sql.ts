/**
 * The database export's format, and turning an export back into SQL. Self-contained (no
 * imports) so `npm run backup` (scripts/backup.ts, plain Node) uses exactly the same code as
 * the worker and the tests.
 */

export const FORMAT_VERSION = 1

export interface ManifestTable { name: string; rows: number; parts: string[] }

/** db/<kind>/<id>/manifest.json, written last: an export without one is unfinished. */
export interface Manifest {
  version: number
  kind: 'daily' | 'monthly'
  id: string
  /** When the export started (ms). */
  at: number
  schema: { type: string; name: string; table: string; sql: string }[]
  tables: ManifestTable[]
}

/** One part file (gzipped JSON): rows as arrays in `columns` order. */
export interface Part { table: string; columns: string[]; rows: unknown[][] }

export async function gzip(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

export async function gunzip(bytes: ArrayBuffer | Uint8Array): Promise<string> {
  const stream = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).text()
}

export function parseManifest(text: string): Manifest {
  const m = JSON.parse(text) as Manifest
  if (m?.version !== FORMAT_VERSION || !Array.isArray(m.tables) || !Array.isArray(m.schema) || typeof m.id !== 'string') {
    throw new Error('Not a backup manifest this version can read.')
  }
  return m
}

export function parsePart(text: string): Part {
  const p = JSON.parse(text) as Part
  if (typeof p?.table !== 'string' || !Array.isArray(p.columns) || !Array.isArray(p.rows)) throw new Error('Not a backup part file.')
  return p
}

const ident = (name: string): string => `"${name.replace(/"/g, '""')}"`

/** Long text is inserted in pieces: D1 refuses statements over 100 KB. */
export const DEFAULT_CHUNK = 20_000

function literal(v: unknown): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error('A number in the backup is not finite.')
    return String(v)
  }
  if (typeof v === 'boolean') return v ? '1' : '0'
  if (Array.isArray(v)) return `X'${v.map(b => Number(b).toString(16).padStart(2, '0')).join('')}'`
  return `'${String(v).replace(/'/g, "''")}'`
}

/** Splits text into pieces of about `size` characters, never inside a surrogate pair. */
export function pieces(text: string, size: number): string[] {
  const out: string[] = []
  let i = 0
  while (i < text.length) {
    let end = Math.min(i + size, text.length)
    const last = text.charCodeAt(end - 1)
    if (end < text.length && last >= 0xd800 && last <= 0xdbff) end--
    out.push(text.slice(i, end))
    i = end
  }
  return out
}

/** INSERT for one row, with any long text added afterwards in UPDATEs on the row just inserted. */
function insertRow(table: string, columns: string[], row: unknown[], verb: string, chunk: number): string[] {
  const long = row.map(v => typeof v === 'string' && v.length > chunk)
  const values = row.map((v, i) => (long[i] ? "''" : literal(v)))
  const out = [`${verb} INTO ${ident(table)} (${columns.map(ident).join(', ')}) VALUES (${values.join(', ')});`]
  row.forEach((v, i) => {
    if (!long[i]) return
    for (const p of pieces(v as string, chunk)) {
      out.push(`UPDATE ${ident(table)} SET ${ident(columns[i])} = ${ident(columns[i])} || ${literal(p)} WHERE rowid = last_insert_rowid();`)
    }
  })
  return out
}

/** Tables in an order where every table comes after the ones it references. */
export function parentsFirst(m: Manifest): string[] {
  const names = m.tables.map(t => t.name)
  const sqlOf = new Map(m.schema.filter(s => s.type === 'table').map(s => [s.name, s.sql]))
  const refs = (t: string) => names.filter(o => o !== t && new RegExp(`REFERENCES\\s+"?${o}"?\\b`, 'i').test(sqlOf.get(t) ?? ''))
  const out: string[] = []
  const visit = (t: string, seen: Set<string>) => {
    if (out.includes(t) || seen.has(t)) return
    refs(t).forEach(r => visit(r, new Set([...seen, t])))
    out.push(t)
  }
  names.forEach(t => visit(t, new Set()))
  return out
}

export type RestoreMode =
  /** A fresh copy (the local dev database): tables dropped and created from the export's schema. */
  | { kind: 'recreate' }
  /** Every row replaced, schema and migrations left as they are (production, after Time Travel can't reach). */
  | { kind: 'replace' }
  /** One site's rows only, put back over whatever is there; nothing else touched. */
  | { kind: 'site'; ref: string }

/** Tables that are never replaced in place: wrangler's own record of applied migrations. */
const KEEP_IN_PLACE = new Set(['d1_migrations'])

/** The SQL statements that put an export back, in order. */
export function restoreStatements(m: Manifest, parts: Part[], mode: RestoreMode, chunk = DEFAULT_CHUNK): string[] {
  const order = parentsFirst(m)
  const byTable = new Map<string, Part[]>(order.map(t => [t, parts.filter(p => p.table === t)]))
  const out: string[] = []
  if (mode.kind === 'recreate') {
    for (const t of [...order].reverse()) out.push(`DROP TABLE IF EXISTS ${ident(t)};`)
    for (const t of order) for (const s of m.schema.filter(x => x.table === t && x.type === 'table')) out.push(`${s.sql};`)
    for (const t of order) for (const s of m.schema.filter(x => x.table === t && x.type !== 'table')) out.push(`${s.sql};`)
  }
  if (mode.kind === 'replace') {
    out.push('PRAGMA defer_foreign_keys = true;')
    for (const t of [...order].reverse()) if (!KEEP_IN_PLACE.has(t)) out.push(`DELETE FROM ${ident(t)};`)
  }
  for (const t of order) {
    if (mode.kind === 'replace' && KEEP_IN_PLACE.has(t)) continue
    for (const p of byTable.get(t) ?? []) {
      const refAt = p.columns.indexOf('ref')
      if (mode.kind === 'site' && refAt < 0) continue
      for (const row of p.rows) {
        if (mode.kind === 'site' && row[refAt] !== mode.ref) continue
        out.push(...insertRow(t, p.columns, row, mode.kind === 'site' ? 'INSERT OR REPLACE' : 'INSERT', chunk))
      }
    }
  }
  return out
}
