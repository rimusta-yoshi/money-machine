/**
 * Backups (server/README.md "Backups and restore"): plain interfaces, so the logic is tested
 * without Cloudflare. server/cloudflare/backupStore.ts puts R2 and D1 behind them.
 */

export interface ObjectInfo {
  key: string
  size: number
  /** When this copy was written (ms). */
  uploaded: number
  /** The object's custom metadata (the backup's own notes: when the original was written). */
  meta: Record<string, string>
}

/** `cursor` is set when there are more keys (a page can be short, even empty, and still have more). */
export interface ObjectPage { objects: ObjectInfo[]; cursor?: string }

export interface StoredBytes {
  bytes: ArrayBuffer
  contentType: string
  meta: Record<string, string>
  /** When this object was written (ms). */
  uploaded: number
}

/** One bucket: the live one (what customers see) or the backup bucket. */
export interface ObjectStore {
  /**
   * Keys under a prefix in key order: from the start, after `startAfter`, or carrying on from a
   * page's `cursor`; at most `limit` (≤ 1000). `meta`: include each object's custom metadata.
   */
  page(prefix: string, o?: { startAfter?: string; cursor?: string; limit?: number; meta?: boolean }): Promise<ObjectPage>
  read(key: string): Promise<StoredBytes | null>
  write(key: string, bytes: ArrayBuffer | Uint8Array | string, contentType: string, meta?: Record<string, string>): Promise<void>
  remove(keys: readonly string[]): Promise<void>
}

export interface SchemaEntry { type: string; name: string; table: string; sql: string }

/** Read-only access to the database, for the daily export. */
export interface TableReader {
  /** CREATE statements of every table and index (SQLite's own and Cloudflare's left out). */
  schema(): Promise<SchemaEntry[]>
  /** A page of rows in rowid order, after `afterRowid`; `where` is a fixed filter from monthlyRules, never caller input. */
  rows(table: string, afterRowid: number, limit: number, where?: string): Promise<{ rowid: number; row: Record<string, unknown> }[]>
  /** Of these sites, the ones that were paid for or published: their photos are worth keeping. */
  keptRefs(refs: readonly string[]): Promise<Set<string>>
  /** The site each address belongs to now (claimed, or published there). */
  refsForSlugs(slugs: readonly string[]): Promise<Map<string, string>>
  /** A site's address, if it has one. */
  slugForRef(ref: string): Promise<string | null>
}

export interface Backups {
  db: TableReader
  /** The live bucket (siteblocks). */
  live: ObjectStore
  /** The backup bucket (siteblocks-backups-weur). */
  store: ObjectStore
}

export interface DbBackupStatus { id: string; at: number; tables: number; rows: number }

export interface FilesPassState {
  /** When the pass under way started (null: none under way). */
  startedAt: number | null
  /** A run is walking the files until then (ms): others leave the pass alone meanwhile. */
  busyUntil: number | null
  /** Copies seen in this pass, to notice a pass about to move most of them to the trash. */
  seen: number
  /** Why the last pass stopped short, if it did (shown on the dashboard). */
  error: string | null
  prefix: number
  after: string | null
  copied: number
  trashed: number
  /** When the last whole pass started: every file written before then is backed up. */
  lastFullPassAt: number | null
  lastRunAt: number | null
}

export interface BackupStatus {
  /** The last good daily export. */
  db: DbBackupStatus | null
  /** The last daily export that failed, if none has worked since. */
  dbError: { at: number; error: string } | null
  monthly: DbBackupStatus | null
  files: FilesPassState
  prunedAt: number | null
}
