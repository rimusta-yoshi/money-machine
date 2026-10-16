import { MIRROR, parseTrashKey, SRC_UPLOADED, TRASH } from './keys'
import { listAll } from './listAll'
import type { Backups, ObjectInfo, ObjectStore } from './types'

/**
 * Putting one site's files back from the backup bucket: its published pages (sites/<slug>/)
 * and its photos (drafts/<ref>/photos/). Files are only ever written, never deleted: a file the
 * site has now that the backup doesn't is left alone.
 */

export interface Version {
  /** The live key this is a copy of. */
  key: string
  /** Where the copy is in the backup bucket. */
  from: string
  /** When the original was written (ms). */
  written: number
  /** When the copy was moved to the trash (deleted or rewritten); Infinity: still current. */
  until: number
}

const written = (o: ObjectInfo): number => Number(o.meta[SRC_UPLOADED] ?? o.uploaded)

/** Every backed-up version of the files under a live prefix. */
export async function versionsOf(store: ObjectStore, prefix: string): Promise<Version[]> {
  const current = (await listAll(store, MIRROR + prefix)).map(o => ({ key: o.key.slice(MIRROR.length), from: o.key, written: written(o), until: Infinity }))
  const old = (await listAll(store, TRASH + prefix)).flatMap(o => {
    const t = parseTrashKey(o.key)
    return t ? [{ key: t.key, from: o.key, written: written(o), until: t.trashedAt }] : []
  })
  return [...current, ...old]
}

/**
 * The version of each file to put back. With no time: the newest copy of every file the backup
 * has (deleted ones too). With a time: the files as they were then, as far as the backup knows.
 */
export function chooseVersions(versions: Version[], at?: number): Version[] {
  const best = new Map<string, Version>()
  for (const v of versions) {
    if (at !== undefined && !(v.written <= at && v.until > at)) continue
    const seen = best.get(v.key)
    if (!seen || v.written > seen.written) best.set(v.key, v)
  }
  return [...best.values()].sort((a, b) => a.key.localeCompare(b.key))
}

export interface FilesRestore { prefixes: string[]; files: { key: string; written: string }[]; restored: number }

export async function restoreFiles(b: Backups, prefixes: string[], o: { at?: number; dryRun: boolean }): Promise<FilesRestore> {
  const chosen = chooseVersions((await Promise.all(prefixes.map(p => versionsOf(b.store, p)))).flat(), o.at)
  let restored = 0
  if (!o.dryRun) {
    for (const v of chosen) {
      const got = await b.store.read(v.from)
      if (!got) continue
      await b.live.write(v.key, got.bytes, got.contentType)
      restored++
    }
  }
  return { prefixes, files: chosen.map(v => ({ key: v.key, written: new Date(v.written).toISOString() })), restored }
}
