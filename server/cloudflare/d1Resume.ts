import type { Database, DraftRow, ReviewRow } from '../core/ports'

/**
 * Resume links ("finish on your computer") and the review flag, on the drafts table
 * (migration 0008). Part of d1Database.
 */

const DAY_MS = 24 * 60 * 60 * 1000

type ResumeReview = Pick<Database,
  'draftByReplacedKey' | 'promoteKey' | 'recordResumeLink' | 'useResumeLink' | 'dueReminders' | 'claimReminder'
  | 'flagReview' | 'sitesToReview' | 'clearReview'>

/** The stored JSON list of review words; anything unreadable is an empty list. */
function reviewWordList(json: string | null): string[] {
  try {
    const v: unknown = JSON.parse(json ?? '[]')
    return Array.isArray(v) ? v.filter((w): w is string => typeof w === 'string') : []
  } catch {
    return []
  }
}

interface ReviewDbRow {
  ref: string; slug: string | null; name: unknown; review_words: string | null; review_flagged_at: number
  paid_at: number | null; refunded_at: number | null; published_at: number | null; disputed_at: number | null; taken_down_at: number | null
}

export function d1ResumeReview(db: D1Database, draftWhere: (where: string, ...values: unknown[]) => Promise<DraftRow | null>): ResumeReview {
  const changed = (r: D1Result): boolean => (r.meta.changes ?? 0) > 0
  return {
    draftByReplacedKey: keyHash => draftWhere('prev_alt_key_hash = ?1', keyHash),
    async promoteKey(ref, keyHash) {
      // One statement: SQLite reads both old values before writing either.
      await db.prepare('UPDATE drafts SET key_hash = alt_key_hash, alt_key_hash = key_hash WHERE ref = ?1 AND alt_key_hash = ?2').bind(ref, keyHash).run()
    },
    async recordResumeLink(ref, { email, now, remindAt, perDay }) {
      // resume_sent_at starts a 24-hour window; sends in it are counted, up to perDay.
      const row = await db.prepare(
        `UPDATE drafts SET
           resume_sent_count = CASE WHEN resume_sent_at > ?3 THEN resume_sent_count + 1 ELSE 1 END,
           resume_sent_at = CASE WHEN resume_sent_at > ?3 THEN resume_sent_at ELSE ?2 END,
           resume_email = ?4, resume_remind_at = ?5, resume_n = resume_n + 1
         WHERE ref = ?1 AND paid_at IS NULL AND refunded_at IS NULL
           AND (resume_sent_at IS NULL OR resume_sent_at <= ?3 OR resume_sent_count < ?6)
         RETURNING resume_n`,
      ).bind(ref, now, now - DAY_MS, email, remindAt, perDay).first<{ resume_n: number }>()
      return row ? row.resume_n : null
    },
    async useResumeLink(ref, n, keyHash) {
      return changed(await db.prepare(
        `UPDATE drafts SET resume_n = resume_n + 1, prev_alt_key_hash = COALESCE(alt_key_hash, prev_alt_key_hash), alt_key_hash = ?3
         WHERE ref = ?1 AND resume_n = ?2 AND paid_at IS NULL AND refunded_at IS NULL`,
      ).bind(ref, n, keyHash).run())
    },
    async dueReminders(now, limit) {
      const rows = await db.prepare(
        `SELECT ref, resume_email AS email FROM drafts
         WHERE resume_remind_at <= ?1 AND resume_reminded_at IS NULL AND resume_email IS NOT NULL
           AND paid_at IS NULL AND published_at IS NULL AND refunded_at IS NULL
         ORDER BY resume_remind_at LIMIT ?2`,
      ).bind(now, limit).all<{ ref: string; email: string }>()
      return rows.results
    },
    async claimReminder(ref, now) {
      const row = await db.prepare(
        `UPDATE drafts SET resume_reminded_at = ?2, resume_n = resume_n + 1
         WHERE ref = ?1 AND resume_reminded_at IS NULL AND paid_at IS NULL RETURNING resume_n`,
      ).bind(ref, now).first<{ resume_n: number }>()
      return row ? row.resume_n : null
    },
    async flagReview(ref, { words, fingerprint, now }) {
      await db.prepare(
        `UPDATE drafts SET review_words = ?2, review_fp = ?3, review_flagged_at = ?4
         WHERE ref = ?1 AND (review_fp IS NULL OR review_fp != ?3)`,
      ).bind(ref, JSON.stringify(words), fingerprint, now).run()
    },
    async sitesToReview(limit) {
      const rows = await db.prepare(
        `SELECT ref, slug, json_extract(record, '$.business.name') AS name, review_words, review_flagged_at,
           paid_at, refunded_at, published_at, disputed_at, taken_down_at FROM drafts
         WHERE review_flagged_at IS NOT NULL AND (review_cleared_at IS NULL OR review_cleared_at < review_flagged_at)
         ORDER BY review_flagged_at DESC LIMIT ?1`,
      ).bind(limit).all<ReviewDbRow>()
      return rows.results.map((r): ReviewRow => ({
        ref: r.ref, slug: r.slug, name: typeof r.name === 'string' ? r.name : null, words: reviewWordList(r.review_words),
        flaggedAt: r.review_flagged_at, paid: r.paid_at !== null, refunded: r.refunded_at !== null, published: r.published_at !== null,
        live: r.published_at !== null && r.slug !== null && r.refunded_at === null && r.disputed_at === null && r.taken_down_at === null,
        takenDown: r.taken_down_at !== null,
      }))
    },
    async clearReview(ref, now) {
      return changed(await db.prepare('UPDATE drafts SET review_cleared_at = ?2 WHERE ref = ?1 AND review_flagged_at IS NOT NULL').bind(ref, now).run())
    },
  }
}
