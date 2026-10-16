import { EMPTY_PASS } from './files'
import { STATUS_KEY } from './keys'
import type { BackupStatus, ObjectStore } from './types'

/** state/status.json in the backup bucket: what the last runs did, for the dashboard and `npm run backup -- verify`. */

export const EMPTY_STATUS: BackupStatus = { db: null, dbError: null, monthly: null, files: EMPTY_PASS, prunedAt: null }

const HOUR = 60 * 60 * 1000
/** The daily export runs every 24 hours; this allows for one late run. */
export const DB_STALE_AFTER = 36 * HOUR
/** A pass of the files normally ends the night it starts. */
export const FILES_STALE_AFTER = 48 * HOUR

export async function readStatus(store: ObjectStore): Promise<BackupStatus> {
  const got = await store.read(STATUS_KEY)
  if (!got) return EMPTY_STATUS
  try {
    const s = JSON.parse(new TextDecoder().decode(got.bytes)) as Partial<BackupStatus>
    return { ...EMPTY_STATUS, ...s, files: { ...EMPTY_PASS, ...s.files } }
  } catch {
    return EMPTY_STATUS
  }
}

export const writeStatus = (store: ObjectStore, s: BackupStatus): Promise<void> => store.write(STATUS_KEY, JSON.stringify(s), 'application/json')

export interface Health { healthy: boolean; lastBackupAt: number | null; problems: string[] }

/** Whether the backups are working: a good database export in the last 36 hours, and the files gone through in the last 48. */
export function health(s: BackupStatus, now: number): Health {
  const problems: string[] = []
  if (s.dbError) problems.push(`The last database backup failed: ${s.dbError.error}`)
  if (!s.db) problems.push('No database backup has been made yet.')
  else if (now - s.db.at > DB_STALE_AFTER) problems.push('The last good database backup is more than 36 hours old.')
  if (s.files.lastFullPassAt === null) problems.push('The photos and sites have not been backed up all the way through yet.')
  else if (now - s.files.lastFullPassAt > FILES_STALE_AFTER) problems.push('The photos and sites were last backed up all the way through more than 48 hours ago.')
  return { healthy: problems.length === 0, lastBackupAt: s.db?.at ?? null, problems }
}
