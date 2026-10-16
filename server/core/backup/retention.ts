import { DAY, idTime, KEEP_DAYS, KEEP_MONTHS, monthIndex, monthlyId, parseTrashKey, TRASH } from './keys'
import { listAll } from './listAll'
import type { ObjectInfo, ObjectStore } from './types'

/**
 * Deletes backups past their time, for good: daily exports after 30 days, monthly ones after
 * 12 months, deleted or replaced files after 30 days. The newest daily export is always kept,
 * even if backups have stopped, so there's something to go back to.
 */

/** Keys of each export id under db/<kind>/. */
function byExport(objects: ObjectInfo[], kind: string): Map<string, string[]> {
  const out = new Map<string, string[]>()
  for (const o of objects) {
    const id = new RegExp(`^db/${kind}/([^/]+)/`).exec(o.key)?.[1]
    if (id) out.set(id, [...(out.get(id) ?? []), o.key])
  }
  return out
}

export interface PruneResult { exports: number; files: number }

export async function pruneBackups(store: ObjectStore, now: number): Promise<PruneResult> {
  const doomed: string[] = []
  let exports = 0

  const daily = byExport(await listAll(store, 'db/daily/'), 'daily')
  const finished = [...daily].filter(([, keys]) => keys.some(k => k.endsWith('/manifest.json'))).map(([id]) => id).sort()
  const newest = finished[finished.length - 1]
  for (const [id, keys] of daily) {
    const at = idTime(id)
    const unfinished = !finished.includes(id)
    // An unfinished export (no manifest) is dropped after a day; it's never a backup.
    const tooOld = Number.isNaN(at) || now - at > (unfinished ? DAY : KEEP_DAYS * DAY)
    if (id !== newest && tooOld) {
      doomed.push(...keys)
      exports++
    }
  }

  const thisMonth = monthIndex(monthlyId(now))
  for (const [id, keys] of byExport(await listAll(store, 'db/monthly/'), 'monthly')) {
    const m = monthIndex(id)
    if (Number.isNaN(m) || thisMonth - m >= KEEP_MONTHS) {
      doomed.push(...keys)
      exports++
    }
  }

  const trash = (await listAll(store, TRASH)).filter(o => {
    const t = parseTrashKey(o.key)
    return !t || now - t.trashedAt > KEEP_DAYS * DAY
  })
  doomed.push(...trash.map(o => o.key))

  for (let i = 0; i < doomed.length; i += 1000) await store.remove(doomed.slice(i, i + 1000))
  return { exports, files: trash.length }
}
