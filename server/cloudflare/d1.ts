import type { CheckoutRow, Database, DraftRow } from '../core/ports'

interface DraftDbRow {
  ref: string; record: string | null; slug: string | null; updated_at: number; published_at: number | null
  email: string | null; paid_at: number | null; stripe_session_id: string | null; stripe_payment_intent: string | null
  amount: number | null; currency: string | null; welcome_sent_at: number | null; refunded_at: number | null; link_version: number
}

interface CheckoutDbRow { session_id: string; ref: string; slug: string; email: string; record: string; created_at: number; expires_at: number }

const toDraft = (r: DraftDbRow | null): DraftRow | null =>
  r && {
    ref: r.ref, record: r.record, slug: r.slug, updatedAt: r.updated_at, publishedAt: r.published_at,
    payment: r.paid_at === null ? null : {
      sessionId: r.stripe_session_id ?? '', paymentIntent: r.stripe_payment_intent ?? '', amount: r.amount ?? 0,
      currency: r.currency ?? '', email: r.email ?? '', paidAt: r.paid_at,
    },
    welcomeSentAt: r.welcome_sent_at, refundedAt: r.refunded_at, linkVersion: r.link_version ?? 0,
  }

const toCheckout = (r: CheckoutDbRow | null): CheckoutRow | null =>
  r && { sessionId: r.session_id, ref: r.ref, slug: r.slug, email: r.email, record: r.record, createdAt: r.created_at, expiresAt: r.expires_at }

const DRAFT_COLUMNS = `ref, record, slug, updated_at, published_at, email, paid_at, stripe_session_id, stripe_payment_intent,
  amount, currency, welcome_sent_at, refunded_at, link_version`
const DAY_SEC = 24 * 60 * 60
const DAY_MS = DAY_SEC * 1000
/** Stripe retries an event for up to 3 days; ids (and old checkouts) are kept well past that. */
const KEEP_DAYS = 30

/** `?1, ?2, …` placeholders for a list of values. */
const params = (n: number, after = 0): string => Array.from({ length: n }, (_, i) => `?${i + 1 + after}`).join(', ')

/** The database on Cloudflare D1 (SQLite). Plain SQL, so it moves to any SQLite host as is. */
export function d1Database(db: D1Database): Database {
  const draftWhere = async (where: string, ...values: unknown[]) =>
    toDraft(await db.prepare(`SELECT ${DRAFT_COLUMNS} FROM drafts WHERE ${where}`).bind(...values).first<DraftDbRow>())
  const changed = (r: D1Result): boolean => (r.meta.changes ?? 0) > 0

  return {
    async createDraft({ ref, keyHash, now }) {
      await db.prepare('INSERT INTO drafts (ref, key_hash, created_at, updated_at, seen_at) VALUES (?1, ?2, ?3, ?3, ?3)').bind(ref, keyHash, now).run()
    },
    draftByKey: keyHash => draftWhere('key_hash = ?1', keyHash),
    draftByRef: ref => draftWhere('ref = ?1', ref),
    draftByPaymentIntent: pi => draftWhere('stripe_payment_intent = ?1', pi),
    async paidDraftsByEmail(email) {
      const rows = await db.prepare(`SELECT ${DRAFT_COLUMNS} FROM drafts WHERE email = ?1 COLLATE NOCASE AND paid_at IS NOT NULL ORDER BY paid_at`)
        .bind(email).all<DraftDbRow>()
      return rows.results.map(r => toDraft(r)!)
    },
    async saveRecord(ref, record, now) {
      await db.prepare('UPDATE drafts SET record = ?2, updated_at = ?3, seen_at = ?3 WHERE ref = ?1').bind(ref, record, now).run()
    },
    async touch(ref, now) {
      await db.prepare('UPDATE drafts SET seen_at = ?2 WHERE ref = ?1 AND (seen_at IS NULL OR seen_at < ?3)').bind(ref, now, now - DAY_MS).run()
    },
    async createPreview({ tokenHash, ref, now, expiresAt }) {
      await db.prepare('INSERT INTO previews (token_hash, ref, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)').bind(tokenHash, ref, now, expiresAt).run()
    },
    async previewRef(tokenHash, now) {
      const row = await db.prepare('SELECT ref FROM previews WHERE token_hash = ?1 AND expires_at > ?2').bind(tokenHash, now).first<{ ref: string }>()
      return row?.ref ?? null
    },
    async slugOwner(slug, now) {
      const row = await db.prepare('SELECT ref FROM slugs WHERE slug = ?1 AND (held_until IS NULL OR held_until > ?2)').bind(slug, now).first<{ ref: string }>()
      return row?.ref ?? null
    },
    async claimSlug(slug, ref, now, heldUntil = null) {
      // Free, an expired hold, or already ours: take it. A permanent claim of our own stays permanent.
      await db.prepare(
        `INSERT INTO slugs (slug, ref, claimed_at, held_until) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT (slug) DO UPDATE SET
           held_until = CASE WHEN slugs.ref = excluded.ref AND slugs.held_until IS NULL THEN NULL ELSE excluded.held_until END,
           claimed_at = excluded.claimed_at, ref = excluded.ref
         WHERE slugs.ref = excluded.ref OR (slugs.held_until IS NOT NULL AND slugs.held_until <= ?3)`,
      ).bind(slug, ref, now, heldUntil).run()
      return (await this.slugOwner(slug, now)) === ref
    },
    async releaseSlug(slug, ref) {
      await db.prepare('DELETE FROM slugs WHERE slug = ?1 AND ref = ?2').bind(slug, ref).run()
    },
    async markPublished(ref, slug, now) {
      const [published] = await db.batch([
        db.prepare('UPDATE drafts SET slug = ?2, published_at = ?3 WHERE ref = ?1 AND refunded_at IS NULL').bind(ref, slug, now),
        db.prepare('UPDATE slugs SET held_until = NULL WHERE slug = ?2 AND ref = ?1').bind(ref, slug),
        db.prepare('DELETE FROM slugs WHERE ref = ?1 AND slug != ?2').bind(ref, slug),
      ])
      return changed(published)
    },
    async createCheckout(c) {
      await db.prepare('INSERT INTO checkouts (session_id, ref, slug, email, record, created_at, expires_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)')
        .bind(c.sessionId, c.ref, c.slug, c.email, c.record, c.createdAt, c.expiresAt).run()
    },
    async checkout(sessionId) {
      return toCheckout(await db.prepare('SELECT session_id, ref, slug, email, record, created_at, expires_at FROM checkouts WHERE session_id = ?1')
        .bind(sessionId).first<CheckoutDbRow>())
    },
    async markPaid(ref, p) {
      return changed(await db.prepare(
        `UPDATE drafts SET paid_at = ?2, stripe_session_id = ?3, stripe_payment_intent = ?4, amount = ?5, currency = ?6, email = ?7
         WHERE ref = ?1 AND paid_at IS NULL`,
      ).bind(ref, p.paidAt, p.sessionId, p.paymentIntent, p.amount, p.currency, p.email).run())
    },
    async claimWelcome(ref, now) {
      return changed(await db.prepare('UPDATE drafts SET welcome_sent_at = ?2 WHERE ref = ?1 AND welcome_sent_at IS NULL').bind(ref, now).run())
    },
    async releaseWelcome(ref) {
      await db.prepare('UPDATE drafts SET welcome_sent_at = NULL WHERE ref = ?1').bind(ref).run()
    },
    async bumpLinkVersion(ref) {
      const row = await db.prepare('UPDATE drafts SET link_version = link_version + 1 WHERE ref = ?1 RETURNING link_version').bind(ref).first<{ link_version: number }>()
      return row?.link_version ?? 0
    },
    async releaseHolds(ref, except) {
      await db.prepare('DELETE FROM slugs WHERE ref = ?1 AND slug != ?2 AND held_until IS NOT NULL').bind(ref, except).run()
    },
    async markRefunded(ref, now, refundId) {
      return changed(await db.prepare('UPDATE drafts SET refunded_at = ?2, refund_id = ?3 WHERE ref = ?1 AND refunded_at IS NULL').bind(ref, now, refundId).run())
    },
    async eventSeen(id) {
      return !!(await db.prepare('SELECT 1 AS seen FROM stripe_events WHERE id = ?1').bind(id).first())
    },
    async recordEvent(id, type, now) {
      await db.prepare('INSERT INTO stripe_events (id, type, received_at) VALUES (?1, ?2, ?3) ON CONFLICT (id) DO NOTHING').bind(id, type, now).run()
    },
    async staleDrafts(before, limit) {
      const rows = await db.prepare(
        `SELECT ref FROM drafts WHERE paid_at IS NULL AND published_at IS NULL AND MAX(updated_at, COALESCE(seen_at, 0)) < ?1
         ORDER BY updated_at LIMIT ?2`,
      ).bind(before, limit).all<{ ref: string }>()
      return rows.results.map(r => r.ref)
    },
    async deleteDrafts(refs, before) {
      if (!refs.length) return []
      // Previews, address holds and checkouts go with them (ON DELETE CASCADE). Never a paid,
      // published or since-used one (checked again here, in case it was opened meanwhile).
      const rows = await db.prepare(
        `DELETE FROM drafts WHERE paid_at IS NULL AND published_at IS NULL AND MAX(updated_at, COALESCE(seen_at, 0)) < ?1
         AND ref IN (${params(refs.length, 1)}) RETURNING ref`,
      ).bind(before, ...refs).all<{ ref: string }>()
      return rows.results.map(r => r.ref)
    },
    async existingRefs(refs) {
      if (!refs.length) return new Set()
      const rows = await db.prepare(`SELECT ref FROM drafts WHERE ref IN (${params(refs.length)})`).bind(...refs).all<{ ref: string }>()
      return new Set(rows.results.map(r => r.ref))
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
        db.prepare('DELETE FROM slugs WHERE held_until IS NOT NULL AND held_until < ?1').bind(now),
        db.prepare('DELETE FROM checkouts WHERE expires_at < ?1').bind(now - KEEP_DAYS * DAY_MS),
        db.prepare('DELETE FROM stripe_events WHERE received_at < ?1').bind(now - KEEP_DAYS * DAY_MS),
      ])
    },
  }
}
