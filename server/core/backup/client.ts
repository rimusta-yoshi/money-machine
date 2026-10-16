/**
 * The admin side of backups, for `npm run backup` (plain Node) and the tests: reading the list
 * of exports, downloading one, checking it. Talks to the API's /v1/admin/backups endpoints
 * through `get`, so it never needs Cloudflare credentials. Imports only ./sql.ts (Node-runnable).
 */
import { gunzip, parseManifest, parsePart } from './sql.ts'
import type { Manifest, Part } from './sql.ts'

/** GET with the admin key; the path starts /v1/. */
export type AdminGet = (path: string) => Promise<Response>

export interface ExportEntry { id: string; key: string; writtenAt: number }

export interface Overview {
  health: { healthy: boolean; lastBackupAt: number | null; problems: string[] }
  status: { files: { lastFullPassAt: number | null; startedAt: number | null }; monthly: { id: string; at: number } | null }
  daily: ExportEntry[]
  monthly: ExportEntry[]
}

async function ok(res: Response, what: string): Promise<Response> {
  if (res.ok) return res
  const body = (await res.json().catch(() => ({}))) as { message?: string }
  throw new Error(`${what}: ${res.status} ${body.message ?? ''}`.trim())
}

export async function fetchOverview(get: AdminGet): Promise<Overview> {
  return (await (await ok(await get('/v1/admin/backups'), 'Reading the backups')).json()) as Overview
}

export interface Chosen { kind: 'daily' | 'monthly'; id: string }

/**
 * Which export `from` means: an export's exact id, YYYY-MM-DD (the newest daily export made that
 * day, else the newest monthly one before it), YYYY-MM (that month's monthly export) or "latest".
 */
export function pickExport(o: Overview, from: string): Chosen {
  const daily = [...o.daily].sort((a, b) => a.id.localeCompare(b.id))
  const monthly = [...o.monthly].sort((a, b) => a.id.localeCompare(b.id))
  if (from === 'latest') {
    const last = daily[daily.length - 1]
    if (!last) throw new Error('There are no daily backups yet.')
    return { kind: 'daily', id: last.id }
  }
  const exact = daily.find(e => e.id === from) ? 'daily' : monthly.find(e => e.id === from) ? 'monthly' : null
  if (exact) return { kind: exact, id: from }
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    const sameDay = daily.filter(e => e.id.startsWith(`${from}T`))
    if (sameDay.length) return { kind: 'daily', id: sameDay[sameDay.length - 1].id }
    const before = monthly.filter(e => e.id <= from.slice(0, 7))
    if (before.length) return { kind: 'monthly', id: before[before.length - 1].id }
  }
  throw new Error(`No backup for "${from}". Run "npm run backup -- list" to see them.`)
}

export interface Downloaded { manifest: Manifest; parts: Part[] }

const fileUrl = (key: string) => `/v1/admin/backups/file?key=${encodeURIComponent(key)}`

export async function downloadExport(get: AdminGet, c: Chosen): Promise<Downloaded> {
  const manifestText = await (await ok(await get(fileUrl(`db/${c.kind}/${c.id}/manifest.json`)), 'Reading the manifest')).text()
  const manifest = parseManifest(manifestText)
  const parts: Part[] = []
  for (const key of manifest.tables.flatMap(t => t.parts)) {
    const bytes = await (await ok(await get(fileUrl(key)), `Reading ${key}`)).arrayBuffer()
    parts.push(parsePart(await gunzip(bytes)))
  }
  return { manifest, parts }
}

/** Problems with a downloaded export: every part must parse and the row counts must match the manifest. */
export function checkExport(d: Downloaded): string[] {
  return d.manifest.tables.flatMap(t => {
    const rows = d.parts.filter(p => p.table === t.name).reduce((n, p) => n + p.rows.length, 0)
    return rows === t.rows ? [] : [`${t.name}: the manifest says ${t.rows} rows, the files hold ${rows}.`]
  })
}

/** `npm run backup -- verify`: the backups are healthy and the newest export downloads, parses and adds up. */
export async function verifyBackups(get: AdminGet): Promise<{ ok: boolean; lines: string[] }> {
  const o = await fetchOverview(get)
  if (!o.daily.length) return { ok: false, lines: [...o.health.problems, 'There is no daily export to check.'] }
  try {
    const d = await downloadExport(get, pickExport(o, 'latest'))
    const problems = checkExport(d)
    const rows = d.manifest.tables.reduce((n, t) => n + t.rows, 0)
    const summary = problems.length ? problems : [`Newest export ${d.manifest.id}: ${d.manifest.tables.length} tables, ${rows} rows, all readable.`]
    return { ok: o.health.healthy && !problems.length, lines: [...o.health.problems, ...summary] }
  } catch (err) {
    return { ok: false, lines: [...o.health.problems, `The newest export could not be read: ${err instanceof Error ? err.message : String(err)}`] }
  }
}
