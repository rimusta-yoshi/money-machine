import { unreachable } from '../api/client'

/** Whether backups are working (server/core/backup/status.ts). */
export interface BackupHealth { healthy: boolean; lastBackupAt: number | null; problems: string[] }

type Fetcher = typeof fetch
const defaultFetch: Fetcher = (...a) => fetch(...a)

/** GET /v1/admin/backups, health only. Throws an Error whose message can be shown. */
export async function fetchBackupHealth(base: string, key: string, fetcher: Fetcher = defaultFetch): Promise<BackupHealth> {
  let res: Response
  try {
    res = await fetcher(`${base}/v1/admin/backups`, { headers: { 'X-Admin-Key': key }, cache: 'no-store' })
  } catch {
    throw new Error(unreachable(base))
  }
  const body = (await res.json().catch(() => ({}))) as { health?: BackupHealth; message?: string }
  if (!res.ok || !body.health) throw new Error(body.message ?? 'The backup status could not be loaded.')
  return body.health
}
