import { FILE_PREFIXES, MIRROR, photoRef, SRC_UPLOADED, trashKey } from './keys'
import type { Backups, FilesPassState, ObjectInfo, ObjectStore } from './types'

/**
 * Incremental copies of customers' files into the backup bucket. A pass walks the live
 * published sites (sites/) and the photos of paid or published sites (drafts/<ref>/photos/) in
 * key order next to their copies (files/<key>): new or rewritten files are copied, and a copy
 * whose original was deleted or rewritten moves to trash/<key>~<time>, kept 30 days.
 * A pass stops when its budget of storage calls is spent and carries on from the same key next
 * run (state kept in state/status.json), so it never runs into the Worker's limits.
 */

export const EMPTY_PASS: FilesPassState = { startedAt: null, prefix: 0, after: null, copied: 0, trashed: 0, lastFullPassAt: null, lastRunAt: null }

/** D1 allows 100 bound values per query. */
const REF_BATCH = 50

export interface PassOptions {
  now: number
  /** Storage and database calls to stop after (a page in progress is finished first). */
  budget: number
  pageSize?: number
}

export interface PassResult { state: FilesPassState; done: boolean; copied: number; trashed: number; calls: number }

/** Copies under files/ in the key range (after, end]; end null: to the end of the prefix. */
async function mirrorRange(store: ObjectStore, prefix: string, after: string | null, end: string | null, count: () => void): Promise<ObjectInfo[]> {
  const out: ObjectInfo[] = []
  let startAfter = after === null ? undefined : MIRROR + after
  for (;;) {
    const page = await store.page(MIRROR + prefix, { startAfter })
    count()
    const inRange = page.objects.filter(o => end === null || o.key <= MIRROR + end)
    out.push(...inRange)
    if (!page.more || inRange.length < page.objects.length || !page.objects.length) return out
    startAfter = page.objects[page.objects.length - 1].key
  }
}

/** The files of this page worth keeping: every site file, and photos of paid or published sites only. */
async function worthKeeping(b: Backups, objects: ObjectInfo[], count: () => void): Promise<ObjectInfo[]> {
  const refs = [...new Set(objects.map(o => photoRef(o.key)).filter((r): r is string => !!r))]
  const kept = new Set<string>()
  for (let i = 0; i < refs.length; i += REF_BATCH) {
    for (const r of await b.db.keptRefs(refs.slice(i, i + REF_BATCH))) kept.add(r)
    count()
  }
  return objects.filter(o => o.key.startsWith('sites/') || kept.has(photoRef(o.key) ?? ''))
}

/** Moves a copy to the trash (its original was deleted or rewritten). */
async function toTrash(store: ObjectStore, copy: ObjectInfo, now: number): Promise<void> {
  const got = await store.read(copy.key)
  if (got) await store.write(trashKey(copy.key.slice(MIRROR.length), now), got.bytes, got.contentType, got.meta)
  await store.remove([copy.key])
}

async function copyIn(b: Backups, file: ObjectInfo): Promise<boolean> {
  const got = await b.live.read(file.key)
  if (!got) return false
  await b.store.write(MIRROR + file.key, got.bytes, got.contentType, { [SRC_UPLOADED]: String(file.uploaded) })
  return true
}

/** Carries the pass on (or starts one) until the budget is spent or the pass is done. */
export async function continueFilesPass(b: Backups, state: FilesPassState, o: PassOptions): Promise<PassResult> {
  let s: FilesPassState = state.startedAt === null ? { ...state, startedAt: o.now, prefix: 0, after: null, copied: 0, trashed: 0 } : { ...state }
  let calls = 0
  let copied = 0
  let trashed = 0
  const count = (n = 1) => { calls += n }
  while (s.prefix < FILE_PREFIXES.length && calls < o.budget) {
    const prefix = FILE_PREFIXES[s.prefix]
    const page = await b.live.page(prefix, { startAfter: s.after ?? undefined, limit: o.pageSize ?? 100 })
    count()
    const end = page.more && page.objects.length ? page.objects[page.objects.length - 1].key : null
    const copies = new Map((await mirrorRange(b.store, prefix, s.after, end, count)).map(c => [c.key.slice(MIRROR.length), c]))
    const wanted = await worthKeeping(b, page.objects, count)
    for (const file of wanted) {
      const copy = copies.get(file.key)
      if (copy && copy.uploaded >= file.uploaded) continue
      if (copy) {
        await toTrash(b.store, copy, o.now)
        count(3)
      }
      if (await copyIn(b, file)) copied++
      count(2)
    }
    const wantedKeys = new Set(wanted.map(f => f.key))
    for (const [key, copy] of copies) {
      if (wantedKeys.has(key)) continue
      await toTrash(b.store, copy, o.now)
      count(3)
      trashed++
    }
    s = end === null ? { ...s, prefix: s.prefix + 1, after: null } : { ...s, after: end }
    s = { ...s, copied: s.copied + copied, trashed: s.trashed + trashed }
    copied = 0
    trashed = 0
  }
  const done = s.prefix >= FILE_PREFIXES.length
  const total = { copied: s.copied, trashed: s.trashed }
  const next: FilesPassState = done
    ? { ...s, startedAt: null, prefix: 0, after: null, lastFullPassAt: s.startedAt, lastRunAt: o.now }
    : { ...s, lastRunAt: o.now }
  return { state: next, done, ...total, calls }
}
