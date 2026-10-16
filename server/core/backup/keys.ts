/** Where things live in the backup bucket, and how long they're kept. */

export const DAY = 24 * 60 * 60 * 1000

/** Daily database exports, and deleted or replaced files, are kept this long. */
export const KEEP_DAYS = 30
/** One export a month (paid and published sites only) is kept this many months. */
export const KEEP_MONTHS = 12

/** Live prefixes worth backing up. Sample photos and "no longer available" markers are not. */
export const FILE_PREFIXES = ['drafts/', 'sites/'] as const

export const STATUS_KEY = 'state/status.json'
export const MIRROR = 'files/'
export const TRASH = 'trash/'

export const exportPrefix = (kind: 'daily' | 'monthly', id: string): string => `db/${kind}/${id}/`
export const manifestKey = (kind: 'daily' | 'monthly', id: string): string => `${exportPrefix(kind, id)}manifest.json`

/** 2026-10-16T024700.123Z: sorts by time and is safe in a key or a URL. */
export const dailyId = (now: number): string => new Date(now).toISOString().replace(/:/g, '')
export const monthlyId = (now: number): string => new Date(now).toISOString().slice(0, 7)

/** The time a daily id stands for (ms), or NaN. */
export function idTime(id: string): number {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2})(\d{2})(\d{2}\.\d{3})Z$/.exec(id)
  return m ? Date.parse(`${m[1]}T${m[2]}:${m[3]}:${m[4]}Z`) : NaN
}

/** Months since year 0 of a YYYY-MM id, or NaN. */
export function monthIndex(id: string): number {
  const m = /^(\d{4})-(\d{2})$/.exec(id)
  return m ? Number(m[1]) * 12 + Number(m[2]) - 1 : NaN
}

/** A deleted or replaced file: trash/<its key>~<when it was moved here, ms>. */
export const trashKey = (key: string, at: number): string => `${TRASH}${key}~${at}`

export function parseTrashKey(trash: string): { key: string; trashedAt: number } | null {
  const m = /^trash\/(.+)~(\d+)$/.exec(trash)
  return m ? { key: m[1], trashedAt: Number(m[2]) } : null
}

/** Metadata on every backed-up file: when the original was written (ms). */
export const SRC_UPLOADED = 'src_uploaded'
/** Metadata on every backed-up file: the site (ref) it belonged to when copied, if known. */
export const SITE_REF = 'site_ref'

/** A draft's photos (drafts/<ref>/photos/…): the site's ref, else null. */
export const photoRef = (key: string): string | null => /^drafts\/([0-9a-f]{32})\/photos\//.exec(key)?.[1] ?? null
