import { z } from 'zod'
import { requireAdminKey } from '../admin'
import { HttpError, json, readJson } from '../http'
import { rateLimit, SIZE } from '../limits'
import type { Deps } from '../ports'
import { continueFilesPass } from './files'
import { listAll } from './listAll'
import { BUDGET, nightlyBackup } from './run'
import { restoreFiles } from './restoreFiles'
import { health, readStatus, writeStatus } from './status'
import type { Backups } from './types'

/**
 * Admin key only (`npm run backup` and the dashboard call these):
 *
 * GET  /v1/admin/backups                 health, last runs, the exports there are
 * GET  /v1/admin/backups/file?key=…      one export file (manifest or part), as stored
 * POST /v1/admin/backups/run             {files?: true}: back up now (or only carry the files on)
 * POST /v1/admin/backups/restore-files   {slug | ref, at?, dryRun}: put one site's files back
 */

const NO_STORE = { 'Cache-Control': 'no-store' }

async function backupsFor(req: Request, deps: Deps): Promise<Backups> {
  await rateLimit(deps, req, 'admin')
  await requireAdminKey(req, deps)
  if (!deps.backups) throw new HttpError(503, 'backups_off', 'Backups are not set up (no BACKUPS bucket bound to the API worker).')
  return deps.backups
}

const MANIFEST = /^db\/(daily|monthly)\/([0-9A-Za-z.-]+)\/manifest\.json$/
const EXPORT_FILE = /^db\/(daily|monthly)\/[0-9A-Za-z.-]+\/(manifest\.json|[a-z0-9_]+\.\d{4}\.json\.gz)$/

async function overview(deps: Deps, b: Backups): Promise<Response> {
  const status = await readStatus(b.store)
  const exports = (kind: string) => listAll(b.store, `db/${kind}/`).then(objects => objects.flatMap(o => {
    const m = MANIFEST.exec(o.key)
    return m ? [{ id: m[2], key: o.key, writtenAt: o.uploaded }] : []
  }))
  const [daily, monthly] = await Promise.all([exports('daily'), exports('monthly')])
  return json({ health: health(status, deps.now()), status, daily, monthly }, 200, NO_STORE)
}

async function exportFile(req: Request, b: Backups): Promise<Response> {
  const key = new URL(req.url).searchParams.get('key') ?? ''
  if (!EXPORT_FILE.test(key)) throw new HttpError(422, 'invalid_key', 'That is not a backup file.')
  const got = await b.store.read(key)
  if (!got) throw new HttpError(404, 'not_found', 'No such backup file.')
  return new Response(got.bytes, { headers: { 'Content-Type': got.contentType, ...NO_STORE } })
}

export async function backupGet(req: Request, deps: Deps, sub: string): Promise<Response> {
  const b = await backupsFor(req, deps)
  return sub === 'file' ? exportFile(req, b) : overview(deps, b)
}

const runBody = z.object({ files: z.boolean().optional() }).strict()

const restoreBody = z.object({
  slug: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/).optional(),
  ref: z.string().regex(/^[0-9a-f]{32}$/).optional(),
  /** YYYY-MM-DD (the end of that day, UTC) or an ISO time. None: the newest copy of everything. */
  at: z.string().max(40).optional(),
  dryRun: z.boolean(),
}).strict().refine(b => !!b.slug !== !!b.ref, 'Send a slug or a ref.')

/** A time to restore to, from YYYY-MM-DD (end of that day, UTC) or an ISO time. */
export function restoreTime(at: string | undefined): number | undefined {
  if (at === undefined) return undefined
  const t = /^\d{4}-\d{2}-\d{2}$/.test(at) ? Date.parse(`${at}T23:59:59.999Z`) : Date.parse(at)
  if (Number.isNaN(t)) throw new HttpError(422, 'invalid_time', 'Give the time as YYYY-MM-DD or an ISO time.')
  return t
}

async function run(req: Request, deps: Deps, b: Backups): Promise<Response> {
  const parsed = runBody.safeParse(await readJson(req, SIZE.smallJson))
  if (!parsed.success) throw new HttpError(422, 'invalid', 'Send {} or {"files": true}.')
  if (!parsed.data.files) return json({ ran: await nightlyBackup(b, deps.now()) }, 200, NO_STORE)
  const s = await readStatus(b.store)
  const pass = await continueFilesPass(b, s.files, { now: deps.now(), budget: BUDGET.nightly })
  await writeStatus(b.store, { ...(await readStatus(b.store)), files: pass.state })
  return json({ ran: { files: pass.done ? 'pass finished' : 'pass continues', copied: pass.copied, trashed: pass.trashed } }, 200, NO_STORE)
}

async function restore(req: Request, b: Backups): Promise<Response> {
  const parsed = restoreBody.safeParse(await readJson(req, SIZE.smallJson))
  if (!parsed.success) throw new HttpError(422, 'invalid', 'Send {"slug": …} or {"ref": …}, with "dryRun" true or false.')
  const { slug, ref, at, dryRun } = parsed.data
  const siteRef = ref ?? (await b.db.refForSlug(slug!))
  const siteSlug = slug ?? (await b.db.slugForRef(ref!))
  const prefixes = [...(siteSlug ? [`sites/${siteSlug}/`] : []), ...(siteRef ? [`drafts/${siteRef}/photos/`] : [])]
  const done = await restoreFiles(b, prefixes, { at: restoreTime(at), dryRun })
  return json({ dryRun, ...done }, 200, NO_STORE)
}

export async function backupPost(req: Request, deps: Deps, sub: string): Promise<Response> {
  const b = await backupsFor(req, deps)
  return sub === 'run' ? run(req, deps, b) : restore(req, b)
}
