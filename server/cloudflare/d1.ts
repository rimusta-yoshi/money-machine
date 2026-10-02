import type { Database, DraftRow } from '../core/ports'

interface DraftDbRow { ref: string; record: string | null; slug: string | null; updated_at: number; published_at: number | null }

const toDraft = (r: DraftDbRow | null): DraftRow | null =>
  r && { ref: r.ref, record: r.record, slug: r.slug, updatedAt: r.updated_at, publishedAt: r.published_at }

const DRAFT_COLUMNS = 'ref, record, slug, updated_at, published_at'
const DAY_SEC = 24 * 60 * 60

/** The database on Cloudflare D1 (SQLite). Plain SQL, so it moves to any SQLite host as is. */
export function d1Database(db: D1Database): Database {
  return {
    async createDraft({ ref, keyHash, now }) {
      await db.prepare('INSERT INTO drafts (ref, key_hash, created_at, updated_at) VALUES (?1, ?2, ?3, ?3)').bind(ref, keyHash, now).run()
    },
    async draftByKey(keyHash) {
      return toDraft(await db.prepare(`SELECT ${DRAFT_COLUMNS} FROM drafts WHERE key_hash = ?1`).bind(keyHash).first<DraftDbRow>())
    },
    async draftByRef(ref) {
      return toDraft(await db.prepare(`SELECT ${DRAFT_COLUMNS} FROM drafts WHERE ref = ?1`).bind(ref).first<DraftDbRow>())
    },
    async saveRecord(ref, record, now) {
      await db.prepare('UPDATE drafts SET record = ?2, updated_at = ?3 WHERE ref = ?1').bind(ref, record, now).run()
    },
    async createPreview({ tokenHash, ref, now, expiresAt }) {
      await db.prepare('INSERT INTO previews (token_hash, ref, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)').bind(tokenHash, ref, now, expiresAt).run()
    },
    async previewRef(tokenHash, now) {
      const row = await db.prepare('SELECT ref FROM previews WHERE token_hash = ?1 AND expires_at > ?2').bind(tokenHash, now).first<{ ref: string }>()
      return row?.ref ?? null
    },
    async slugOwner(slug) {
      return (await db.prepare('SELECT ref FROM slugs WHERE slug = ?1').bind(slug).first<{ ref: string }>())?.ref ?? null
    },
    async claimSlug(slug, ref, now) {
      await db.prepare('INSERT INTO slugs (slug, ref, claimed_at) VALUES (?1, ?2, ?3) ON CONFLICT (slug) DO NOTHING').bind(slug, ref, now).run()
      return (await this.slugOwner(slug)) === ref
    },
    async releaseSlug(slug, ref) {
      await db.prepare('DELETE FROM slugs WHERE slug = ?1 AND ref = ?2').bind(slug, ref).run()
    },
    async markPublished(ref, slug, now) {
      await db.batch([
        db.prepare('UPDATE drafts SET slug = ?2, published_at = ?3 WHERE ref = ?1').bind(ref, slug, now),
        db.prepare('DELETE FROM slugs WHERE ref = ?1 AND slug != ?2').bind(ref, slug),
      ])
    },
    async hit(key, windowStart) {
      const row = await db.prepare(
        `INSERT INTO rate_limits (key, window_start, count) VALUES (?1, ?2, 1)
         ON CONFLICT (key) DO UPDATE SET count = CASE WHEN window_start = ?2 THEN count + 1 ELSE 1 END, window_start = ?2
         RETURNING count`,
      ).bind(key, windowStart).first<{ count: number }>()
      return row?.count ?? 1
    },
    async sweep(now) {
      await db.batch([
        db.prepare('DELETE FROM previews WHERE expires_at < ?1').bind(now),
        db.prepare('DELETE FROM rate_limits WHERE window_start < ?1').bind(Math.floor(now / 1000) - DAY_SEC),
      ])
    },
  }
}
