import { exportDatabase } from './dbExport'
import { continueFilesPass } from './files'
import { dailyId, manifestKey, monthlyId } from './keys'
import { pruneBackups } from './retention'
import { readStatus, writeStatus } from './status'
import type { Backups, BackupStatus } from './types'

/**
 * The nightly backup (its own cron, before the cleanup) and the quarter-hourly catch-up that
 * carries an unfinished pass of the files on. Every step catches its own failure: one failing
 * never stops the others, and the failure shows on the dashboard.
 */

/** Storage calls per run, well inside the Worker's limits (1,000 on Workers Free, 10,000 on Paid). */
export const BUDGET = { nightly: 700, catchUp: 250 } as const
/** The catch-up leaves a pass alone if it ran this recently (the nightly run may still be going). */
const CATCH_UP_GAP = 10 * 60 * 1000

const message = (err: unknown): string => (err instanceof Error ? err.message : String(err)).slice(0, 300)

async function backUpDatabase(b: Backups, s: BackupStatus, now: number): Promise<BackupStatus> {
  try {
    const done = await exportDatabase(b.db, b.store, 'daily', dailyId(now), now)
    return { ...s, db: { ...done, at: now }, dbError: null }
  } catch (err) {
    console.error('Database backup failed', err)
    return { ...s, dbError: { at: now, error: message(err) } }
  }
}

/** One export a month, made the first night of the month (or the first night after that it works). */
async function backUpMonth(b: Backups, s: BackupStatus, now: number): Promise<BackupStatus> {
  const id = monthlyId(now)
  try {
    if ((await b.store.page(manifestKey('monthly', id), { limit: 1 })).objects.length) return s
    const done = await exportDatabase(b.db, b.store, 'monthly', id, now)
    return { ...s, monthly: { ...done, at: now } }
  } catch (err) {
    console.error('Monthly database backup failed', err)
    return s
  }
}

export interface RunSummary { db: string; files: string; pruned: string }

async function backUpFiles(b: Backups, s: BackupStatus, now: number, budget: number): Promise<[BackupStatus, string]> {
  try {
    const pass = await continueFilesPass(b, s.files, { now, budget })
    return [{ ...s, files: pass.state }, `${pass.done ? 'pass finished' : 'pass continues'}: ${pass.copied} copied, ${pass.trashed} kept as deleted`]
  } catch (err) {
    console.error('Backing up files failed', err)
    return [s, `failed: ${message(err)}`]
  }
}

async function prune(b: Backups, s: BackupStatus, now: number): Promise<[BackupStatus, string]> {
  try {
    const p = await pruneBackups(b.store, now)
    return [{ ...s, prunedAt: now }, `${p.exports} old exports and ${p.files} old files deleted`]
  } catch (err) {
    console.error('Deleting old backups failed', err)
    return [s, `failed: ${message(err)}`]
  }
}

export async function nightlyBackup(b: Backups, now: number, budget: number = BUDGET.nightly): Promise<RunSummary> {
  const exported = await backUpMonth(b, await backUpDatabase(b, await readStatus(b.store), now), now)
  await writeStatus(b.store, exported)
  const [copied, files] = await backUpFiles(b, exported, now, budget)
  await writeStatus(b.store, copied)
  const [s, pruned] = await prune(b, copied, now)
  await writeStatus(b.store, s)
  const db = s.dbError?.at === now ? `failed: ${s.dbError.error}` : `${s.db?.id} (${s.db?.rows} rows)`
  return { db, files, pruned }
}

/** Every 15 minutes: carries an unfinished pass of the files on, if there is one. Cheap when there isn't (one read). */
export async function catchUpFiles(b: Backups, now: number): Promise<string | null> {
  const s = await readStatus(b.store)
  if (s.files.startedAt === null || (s.files.lastRunAt !== null && now - s.files.lastRunAt < CATCH_UP_GAP)) return null
  const pass = await continueFilesPass(b, s.files, { now, budget: BUDGET.catchUp })
  // Read again: the nightly run may have recorded an export meanwhile.
  await writeStatus(b.store, { ...(await readStatus(b.store)), files: pass.state })
  return `${pass.done ? 'pass finished' : 'pass continues'}: ${pass.copied} copied, ${pass.trashed} kept as deleted`
}
