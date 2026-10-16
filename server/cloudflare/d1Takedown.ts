import type { Database, DraftRow, TakedownLogEntry, TakedownRecord } from '../core/ports'

/**
 * Admin take-down and restore (abuse), on the drafts table (migration 0009). Part of d1Database.
 * Each change is one conditional UPDATE, so two admins (or a retry) can't both act on one site.
 */

type Takedown = Pick<Database, 'draftBySlug' | 'markTakenDown' | 'markRestored' | 'takedownRecord' | 'slugTakenDown'>

interface TakedownDbRow {
  taken_down_at: number | null; takedown_reason: string | null; takedown_by: string | null
  restored_at: number | null; restored_by: string | null; takedown_log: string | null
}

/** The stored history; anything unreadable is an empty list. */
function logEntries(json: string | null): TakedownLogEntry[] {
  try {
    const v: unknown = JSON.parse(json ?? '[]')
    return Array.isArray(v) ? v.filter((e): e is TakedownLogEntry => !!e && typeof e === 'object' && typeof (e as TakedownLogEntry).at === 'number') : []
  } catch {
    return []
  }
}

/** Appends one entry to the JSON history in SQL (?entry is a JSON object). */
const APPEND = (entry: string) => `json_insert(COALESCE(takedown_log, '[]'), '$[#]', json(${entry}))`

export function d1Takedown(db: D1Database, draftWhere: (where: string, ...values: unknown[]) => Promise<DraftRow | null>): Takedown {
  const changed = (r: D1Result): boolean => (r.meta.changes ?? 0) > 0
  return {
    async draftBySlug(slug) {
      // The address's owner now; else the latest site that used it (a refunded one whose address was freed).
      return await draftWhere('ref = (SELECT ref FROM slugs WHERE slug = ?1 AND held_until IS NULL) AND slug = ?1', slug)
        ?? draftWhere('slug = ?1 ORDER BY published_at DESC LIMIT 1', slug)
    },
    async markTakenDown(ref, { now, reason, by }) {
      const entry = JSON.stringify({ action: 'takedown', at: now, by, reason })
      return changed(await db.prepare(
        `UPDATE drafts SET taken_down_at = ?2, takedown_reason = ?3, takedown_by = ?4, takedown_log = ${APPEND('?5')}
         WHERE ref = ?1 AND taken_down_at IS NULL`,
      ).bind(ref, now, reason, by, entry).run())
    },
    async markRestored(ref, { now, by }) {
      const entry = JSON.stringify({ action: 'restore', at: now, by, reason: null })
      return changed(await db.prepare(
        `UPDATE drafts SET taken_down_at = NULL, restored_at = ?2, restored_by = ?3, takedown_log = ${APPEND('?4')}
         WHERE ref = ?1 AND taken_down_at IS NOT NULL`,
      ).bind(ref, now, by, entry).run())
    },
    async takedownRecord(ref) {
      const r = await db.prepare('SELECT taken_down_at, takedown_reason, takedown_by, restored_at, restored_by, takedown_log FROM drafts WHERE ref = ?1')
        .bind(ref).first<TakedownDbRow>()
      if (!r) return null
      const out: TakedownRecord = {
        takenDownAt: r.taken_down_at, reason: r.takedown_reason, by: r.takedown_by, restoredAt: r.restored_at, restoredBy: r.restored_by,
        log: logEntries(r.takedown_log),
      }
      return out
    },
    async slugTakenDown(slug) {
      const row = await db.prepare(
        `SELECT 1 AS down FROM slugs JOIN drafts ON drafts.ref = slugs.ref
         WHERE slugs.slug = ?1 AND slugs.held_until IS NULL AND drafts.taken_down_at IS NOT NULL`,
      ).bind(slug).first()
      return !!row
    },
  }
}
