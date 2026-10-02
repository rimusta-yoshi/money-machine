import type { Config } from './config'

/**
 * Everything the server needs from its host, as plain interfaces. The Cloudflare adapter
 * (server/cloudflare) implements them with D1, R2 and Workers assets; another host would
 * implement them with SQLite and any S3-compatible store. Nothing in server/core knows which.
 */

export interface DraftRow {
  /** Random id used in storage paths. Not a secret: the browser holds a separate key. */
  ref: string
  /** The validated site record as JSON, or null before the first save. */
  record: string | null
  /** The address it's published at, if it is. */
  slug: string | null
  updatedAt: number
  publishedAt: number | null
}

/** The database: drafts, preview links, claimed addresses and rate-limit counters. */
export interface Database {
  createDraft(d: { ref: string; keyHash: string; now: number }): Promise<void>
  draftByKey(keyHash: string): Promise<DraftRow | null>
  draftByRef(ref: string): Promise<DraftRow | null>
  saveRecord(ref: string, record: string, now: number): Promise<void>
  createPreview(p: { tokenHash: string; ref: string; now: number; expiresAt: number }): Promise<void>
  /** The draft a live (unexpired) preview token points at. */
  previewRef(tokenHash: string, now: number): Promise<string | null>
  /** Which draft holds an address, if any. */
  slugOwner(slug: string): Promise<string | null>
  /** Claims an address for a draft. False if another draft holds it. */
  claimSlug(slug: string, ref: string, now: number): Promise<boolean>
  releaseSlug(slug: string, ref: string): Promise<void>
  /** Records the address it's live at, and releases any other address the draft holds. */
  markPublished(ref: string, slug: string, now: number): Promise<void>
  /** Counts one request against a key in a fixed window; returns the count so far. */
  hit(key: string, windowStart: number): Promise<number>
  /** Housekeeping: drops expired preview links and old counters. */
  sweep(now: number): Promise<void>
}

export interface StoredObject {
  body: ReadableStream | ArrayBuffer
  contentType: string
  etag: string
  size: number
}

/** Object storage: draft photos, published sites and the builder's sample photos. */
export interface Blobs {
  put(key: string, body: ArrayBuffer | Uint8Array | string, contentType: string): Promise<void>
  get(key: string): Promise<StoredObject | null>
  /** Every key under a prefix. */
  list(prefix: string): Promise<string[]>
  delete(keys: readonly string[]): Promise<void>
}

/** Files deployed with the code: the self-hosted fonts and their licences. */
export interface Assets {
  font(name: string): Promise<Response | null>
}

export interface Deps {
  config: Config
  db: Database
  blobs: Blobs
  assets: Assets
  now: () => number
  /** The caller's address, for rate limits. */
  clientIp: (req: Request) => string
}
