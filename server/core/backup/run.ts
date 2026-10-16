import { exportDatabase } from './dbExport'
import { continueFilesPass } from './files'
import type { PassResult } from './files'
import { dailyId, manifestKey, monthlyId } from './keys'
import { pruneBackups } from './retention'
import { readStatus, writeStatus } from './status'
import type { Backups, BackupStatus } from './types'

/**
 * The nightly backup (its own cron, before the cleanup) and the quarter-hourly catch-up that
 * carries an unfinished pass of the files on. Every step catches its own failure: one failing
 * never stops the others, and the failure shows on the dashboard.
 */

/**
 * Storage and database calls per run, well inside the Worker's limits (1,000 per run on Workers
 * Free, 10,000 on Paid). The nightly one is shared: what the exports use comes off the files.
 */
export const BUDGET = { nightly: 700, catchUp: 250, minFiles: 100 } as const
/** A run walking the files holds them this long (a cron run can't outlive 15 minutes). */
const LEASE = 15 * 60 * 1000

const message = (err: unknown): string => (err instanceof Error ? err.message : String(err)).slice(0, 300)

async function backUpDatabase(b: Backups, s: BackupStatus, now: number): Promise<[BackupStatus, number]> {
  try {
    const done = await exportDatabase(b.db, b.store, 'daily', dailyId(now), now)
    return [{ ...s, db: { id: done.id, tables: done.tables, rows: done.rows, at: now }, dbError: null }, done.calls]
  } catch (err) {
    console.error('Database backup failed', err)
    return [{ ...s, dbError: { at: now, error: message(err) } }, 0]
  }
}

/** One export a month, made the first night of the month (or the first night after that it works). */
async function backUpMonth(b: Backups, s: BackupStatus, now: number): Promise<[BackupStatus, number]> {
  const id = monthlyId(now)
  try {
    if ((await b.store.page(manifestKey('monthly', id), { limit: 1 })).objects.length) return [s, 1]
    const done = await exportDatabase(b.db, b.store, 'monthly', id, now)
    return [{ ...s, monthly: { id: done.id, tables: done.tables, rows: done.rows, at: now } }, done.calls + 1]
  } catch (err) {
    console.error('Monthly database backup failed', err)
    return [s, 0]
  }
}

export interface FilesRun { result: PassResult | null; summary: string }

/**
 * Walks the files under a lease, saving where it got to after every page, so two runs never
 * walk at once and a run cut short loses nothing. `force`: ignore the gap since the last run.
 */
export async function runFiles(b: Backups, now: number, budget: number, o: { allowDeletes?: boolean } = {}): Promise<FilesRun> {
  const s = await readStatus(b.store)
  if (s.files.busyUntil !== null && s.files.busyUntil > now) return { result: null, summary: 'skipped: another run is backing up the files' }
  await writeStatus(b.store, { ...s, files: { ...s.files, busyUntil: now + LEASE } })
  const save = async (files: BackupStatus['files']) => writeStatus(b.store, { ...(await readStatus(b.store)), files })
  try {
    const result = await continueFilesPass(b, s.files, {
      now, budget, allowDeletes: o.allowDeletes,
      onProgress: progress => save({ ...progress, busyUntil: now + LEASE }),
    })
    await save({ ...result.state, busyUntil: null })
    return { result, summary: `${result.done ? 'pass finished' : 'pass continues'}: ${result.copied} copied, ${result.trashed} kept as deleted` }
  } catch (err) {
    console.error('Backing up files failed', err)
    // Where it got to was saved after the last page; only the lease and the reason change.
    const latest = (await readStatus(b.store)).files
    await save({ ...latest, busyUntil: null, error: message(err) })
    return { result: null, summary: `failed: ${message(err)}` }
  }
}

async function prune(b: Backups, now: number): Promise<string> {
  try {
    const p = await pruneBackups(b.store, now)
    await writeStatus(b.store, { ...(await readStatus(b.store)), prunedAt: now })
    return `${p.exports} old exports and ${p.files} old files deleted`
  } catch (err) {
    console.error('Deleting old backups failed', err)
    return `failed: ${message(err)}`
  }
}

export interface RunSummary { db: string; files: string; pruned: string }

export async function nightlyBackup(b: Backups, now: number, o: { allowDeletes?: boolean } = {}): Promise<RunSummary> {
  const [daily, dailyCalls] = await backUpDatabase(b, await readStatus(b.store), now)
  const [exported, monthlyCalls] = await backUpMonth(b, daily, now)
  await writeStatus(b.store, { ...(await readStatus(b.store)), db: exported.db, dbError: exported.dbError, monthly: exported.monthly })
  const files = await runFiles(b, now, Math.max(BUDGET.minFiles, BUDGET.nightly - dailyCalls - monthlyCalls), o)
  const pruned = await prune(b, now)
  const db = exported.dbError?.at === now ? `failed: ${exported.dbError.error}` : `${exported.db?.id} (${exported.db?.rows} rows)`
  return { db, files: files.summary, pruned }
}

/** Every 15 minutes: carries an unfinished pass of the files on, if there is one. Cheap when there isn't (one read). */
export async function catchUpFiles(b: Backups, now: number): Promise<string | null> {
  const s = await readStatus(b.store)
  if (s.files.startedAt === null || s.files.error) return null
  return (await runFiles(b, now, BUDGET.catchUp)).summary
}
