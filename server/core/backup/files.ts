import { FILE_PREFIXES, MIRROR, photoRef, SITE_REF, SRC_UPLOADED, trashKey } from './keys'
import type { Backups, FilesPassState, ObjectInfo, ObjectStore } from './types'

/**
 * Incremental copies of customers' files into the backup bucket. A pass walks the live
 * published sites (sites/) and the photos of paid or published sites (drafts/<ref>/photos/) in
 * key order next to their copies (files/<key>): new or rewritten files are copied, and a copy
 * whose original was deleted or rewritten moves to trash/<key>~<time>, kept 30 days. Each copy
 * notes when its original was written and which site it belongs to.
 * A pass stops when its budget of storage calls is spent and carries on from the same key next
 * run (state kept in state/status.json), so it never runs into the Worker's limits.
 */

export const EMPTY_PASS: FilesPassState = {
  startedAt: null, busyUntil: null, seen: 0, error: null, prefix: 0, after: null, copied: 0, trashed: 0, lastFullPassAt: null, lastRunAt: null,
}

/** D1 allows 100 bound values per query. */
const BATCH = 50

/**
 * A pass stops instead of moving more than this share of the copies it has seen to the trash
 * (past the first `min`): a wrong bucket or an empty database must not empty the backups.
 */
export const TRASH_GUARD = { min: 100, share: 0.25 }

export class TooManyDeletes extends Error {}

export interface PassOptions {
  now: number
  /** Storage and database calls to stop after. */
  budget: number
  pageSize?: number
  /** Saves where the pass got to (called after each page). */
  onProgress?: (s: FilesPassState) => Promise<void>
  /** Let the pass trash any number of copies (after checking a mass delete was meant). */
  allowDeletes?: boolean
}

export interface PassResult { state: FilesPassState; done: boolean; copied: number; trashed: number; calls: number }

interface Walk { calls: number }

/** The next page of live files after `after`: a page may come back empty with more to come. */
async function livePage(b: Backups, prefix: string, after: string | null, size: number, w: Walk): Promise<{ files: ObjectInfo[]; more: boolean }> {
  let page = await b.live.page(prefix, { startAfter: after ?? undefined, limit: size })
  w.calls++
  while (!page.objects.length && page.cursor) {
    page = await b.live.page(prefix, { cursor: page.cursor, limit: size })
    w.calls++
  }
  return { files: page.objects, more: !!page.cursor }
}

/** Copies under files/ in the key range (after, end]; end null: to the end of the prefix. */
async function mirrorRange(store: ObjectStore, prefix: string, after: string | null, end: string | null, w: Walk): Promise<ObjectInfo[]> {
  const out: ObjectInfo[] = []
  let page = await store.page(MIRROR + prefix, { startAfter: after === null ? undefined : MIRROR + after, meta: true })
  for (;;) {
    w.calls++
    const inRange = page.objects.filter(o => end === null || o.key <= MIRROR + end)
    out.push(...inRange)
    if (!page.cursor || inRange.length < page.objects.length) return out
    page = await store.page(MIRROR + prefix, { cursor: page.cursor, meta: true })
  }
}

/** The site each file belongs to, for the files worth keeping: every published site's, and paid or published sites' photos. */
async function owners(b: Backups, files: ObjectInfo[], w: Walk): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const photoRefs = [...new Set(files.map(f => photoRef(f.key)).filter((r): r is string => !!r))]
  for (let i = 0; i < photoRefs.length; i += BATCH) {
    const kept = await b.db.keptRefs(photoRefs.slice(i, i + BATCH))
    w.calls++
    for (const f of files) if (kept.has(photoRef(f.key) ?? '')) out.set(f.key, photoRef(f.key)!)
  }
  const slugOf = (key: string) => /^sites\/([^/]+)\//.exec(key)?.[1]
  const slugs = [...new Set(files.map(f => slugOf(f.key)).filter((s): s is string => !!s))]
  for (let i = 0; i < slugs.length; i += BATCH) {
    const refs = await b.db.refsForSlugs(slugs.slice(i, i + BATCH))
    w.calls++
    // A site file with no site in the database is still kept: the database may be the thing that broke.
    for (const f of files) if (slugOf(f.key)) out.set(f.key, refs.get(slugOf(f.key)!) ?? '')
  }
  return out
}

/** Moves a copy to the trash (its original was deleted or rewritten). */
async function toTrash(store: ObjectStore, copy: ObjectInfo, now: number, w: Walk): Promise<void> {
  const got = await store.read(copy.key)
  if (got) await store.write(trashKey(copy.key.slice(MIRROR.length), now), got.bytes, got.contentType, got.meta)
  await store.remove([copy.key])
  w.calls += 3
}

/** Copies a live file in, noting when the bytes actually read were written. */
async function copyIn(b: Backups, key: string, owner: string, w: Walk): Promise<boolean> {
  const got = await b.live.read(key)
  w.calls += 2
  if (!got) return false
  await b.store.write(MIRROR + key, got.bytes, got.contentType, { [SRC_UPLOADED]: String(got.uploaded), ...(owner ? { [SITE_REF]: owner } : {}) })
  return true
}

const fresh = (copy: ObjectInfo | undefined, file: ObjectInfo): boolean => !!copy && copy.meta[SRC_UPLOADED] === String(file.uploaded)

/**
 * One page of live files and their copies, in key order, until the budget runs out. Returns
 * the last key dealt with (the pass carries on after it) or null if the whole page was.
 */
async function walkPage(b: Backups, s: FilesPassState, files: ObjectInfo[], copies: ObjectInfo[], o: PassOptions, w: Walk): Promise<{ s: FilesPassState; stopped: boolean }> {
  const owner = await owners(b, files, w)
  const live = new Map(files.filter(f => owner.has(f.key)).map(f => [f.key, f]))
  const copyOf = new Map(copies.map(c => [c.key.slice(MIRROR.length), c]))
  const keys = [...new Set([...files.map(f => f.key), ...copyOf.keys()])].sort()
  let next = s
  for (const key of keys) {
    // Out of budget: carry on after the last key dealt with.
    if (w.calls >= o.budget) return { s: next, stopped: true }
    const file = live.get(key)
    const copy = copyOf.get(key)
    if (copy) next = { ...next, seen: next.seen + 1 }
    if (file && fresh(copy, file)) {
      next = { ...next, after: key }
      continue
    }
    if (copy) {
      if (!file && !o.allowDeletes && next.trashed + 1 > TRASH_GUARD.min && next.trashed + 1 > TRASH_GUARD.share * next.seen) {
        throw new TooManyDeletes(`Stopped: this pass would move ${next.trashed + 1} of ${next.seen} backed-up files to the trash. Check the BUCKET and DB bindings; if the deletes are meant, run "npm run backup -- run --allow-deletes".`)
      }
      await toTrash(b.store, copy, o.now, w)
      if (!file) next = { ...next, trashed: next.trashed + 1 }
    }
    if (file && (await copyIn(b, key, owner.get(key) ?? '', w))) next = { ...next, copied: next.copied + 1 }
    next = { ...next, after: key }
  }
  return { s: next, stopped: false }
}

/** Carries the pass on (or starts one) until the budget is spent or the pass is done. */
export async function continueFilesPass(b: Backups, state: FilesPassState, o: PassOptions): Promise<PassResult> {
  let s: FilesPassState = state.startedAt === null
    ? { ...state, startedAt: o.now, prefix: 0, after: null, copied: 0, trashed: 0, seen: 0 }
    : { ...state }
  s = { ...s, error: null }
  const w: Walk = { calls: 0 }
  while (s.prefix < FILE_PREFIXES.length && w.calls < o.budget) {
    const prefix = FILE_PREFIXES[s.prefix]
    const page = await livePage(b, prefix, s.after, o.pageSize ?? 100, w)
    const end = page.more ? page.files[page.files.length - 1].key : null
    const copies = await mirrorRange(b.store, prefix, s.after, end, w)
    const walked = await walkPage(b, s, page.files, copies, o, w)
    s = walked.s
    if (!walked.stopped) s = end === null ? { ...s, prefix: s.prefix + 1, after: null } : { ...s, after: end }
    await o.onProgress?.({ ...s, lastRunAt: o.now })
  }
  const done = s.prefix >= FILE_PREFIXES.length
  const next: FilesPassState = done
    ? { ...s, startedAt: null, prefix: 0, after: null, lastFullPassAt: s.startedAt, lastRunAt: o.now }
    : { ...s, lastRunAt: o.now }
  return { state: next, done, copied: s.copied, trashed: s.trashed, calls: w.calls }
}
