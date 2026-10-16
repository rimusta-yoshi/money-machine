import type { DomainPatch, DomainRow, DomainStatus, DomainStore, DomainWithSite } from '../core/ports'

/** Customers' own domains on D1 (table custom_domains, migration 0007). Plain SQL, like d1.ts. */

interface DomainDbRow {
  ref: string; hostname: string; domain: string; apex: string | null; cf_id: string | null; cf_apex_id: string | null
  status: DomainStatus; provider: string | null; dc_provider_id: string | null; dc_provider_name: string | null; dc_sync_url: string | null
  dns_seen: string | null; verify_name: string | null; verify_value: string | null; verified_at: number | null; created_at: number; checked_at: number | null; active_at: number | null; live_email_at: number | null
}

interface WithSiteDbRow extends DomainDbRow { slug: string | null; email: string | null; site_live: number | null; taken_down: number | null }

const COLUMNS = `d.ref, d.hostname, d.domain, d.apex, d.cf_id, d.cf_apex_id, d.status, d.provider, d.dc_provider_id, d.dc_provider_name,
  d.dc_sync_url, d.dns_seen, d.verify_name, d.verify_value, d.verified_at, d.created_at, d.checked_at, d.active_at, d.live_email_at`
/** The site's address and payment email, whether it has a live, paying customer, and whether it's taken down. */
const WITH_SITE = `SELECT ${COLUMNS}, s.slug, s.email,
  (s.paid_at IS NOT NULL AND s.published_at IS NOT NULL AND s.slug IS NOT NULL AND s.refunded_at IS NULL AND s.disputed_at IS NULL
    AND s.taken_down_at IS NULL) AS site_live,
  (s.taken_down_at IS NOT NULL) AS taken_down
  FROM custom_domains d LEFT JOIN drafts s ON s.ref = d.ref`

const toRow = (r: DomainDbRow): DomainRow => ({
  ref: r.ref, hostname: r.hostname, domain: r.domain, apex: r.apex, cfId: r.cf_id, cfApexId: r.cf_apex_id, status: r.status,
  provider: r.provider, dnsSeen: r.dns_seen, verifiedAt: r.verified_at, createdAt: r.created_at, checkedAt: r.checked_at, activeAt: r.active_at, liveEmailAt: r.live_email_at,
  verify: r.verify_name && r.verify_value ? { name: r.verify_name, value: r.verify_value } : null,
  dc: r.dc_provider_id && r.dc_sync_url ? { providerId: r.dc_provider_id, name: r.dc_provider_name ?? r.dc_provider_id, syncUx: r.dc_sync_url } : null,
})

const toWithSite = (r: WithSiteDbRow): DomainWithSite => ({ ...toRow(r), slug: r.slug, email: r.email, siteLive: !!r.site_live, takenDown: !!r.taken_down })

/** Patch fields to their columns and values (column names are fixed here, never taken from the caller). */
function patchColumns(patch: DomainPatch): [string, unknown][] {
  const out: [string, unknown][] = []
  const add = (col: string, v: unknown) => { if (v !== undefined) out.push([col, v]) }
  add('apex', patch.apex)
  add('cf_id', patch.cfId)
  add('cf_apex_id', patch.cfApexId)
  add('status', patch.status)
  add('dns_seen', patch.dnsSeen)
  if (patch.verify !== undefined) {
    add('verify_name', patch.verify?.name ?? null)
    add('verify_value', patch.verify?.value ?? null)
  }
  add('verified_at', patch.verifiedAt)
  add('checked_at', patch.checkedAt)
  add('active_at', patch.activeAt)
  return out
}

export function d1Domains(db: D1Database): DomainStore {
  const many = async (sql: string, ...values: unknown[]) => (await db.prepare(sql).bind(...values).all<WithSiteDbRow>()).results.map(toWithSite)
  const one = async (sql: string, ...values: unknown[]) => {
    const r = await db.prepare(sql).bind(...values).first<WithSiteDbRow>()
    return r ? toWithSite(r) : null
  }

  return {
    async byRef(ref) {
      const r = await db.prepare(`SELECT ${COLUMNS} FROM custom_domains d WHERE d.ref = ?1`).bind(ref).first<DomainDbRow>()
      return r ? toRow(r) : null
    },
    byHost: host => one(`${WITH_SITE} WHERE d.hostname = ?1 OR d.apex = ?1`, host),
    async activeHostForSlug(slug) {
      const r = await db.prepare(
        `SELECT d.hostname FROM custom_domains d JOIN drafts s ON s.ref = d.ref
         WHERE s.slug = ?1 AND d.status = 'active' AND s.refunded_at IS NULL AND s.disputed_at IS NULL AND s.taken_down_at IS NULL`,
      ).bind(slug).first<{ hostname: string }>()
      return r?.hostname ?? null
    },
    async insert(row) {
      // The site's one domain, and a name no other site has (as a hostname or a bare domain).
      const res = await db.prepare(
        `INSERT INTO custom_domains (ref, hostname, domain, apex, status, provider, dc_provider_id, dc_provider_name, dc_sync_url, created_at)
         SELECT ?1, ?2, ?3, ?4, 'pending', ?5, ?6, ?7, ?8, ?9
         WHERE NOT EXISTS (SELECT 1 FROM custom_domains WHERE ref = ?1 OR hostname IN (?2, ?4) OR apex IN (?2, ?4))`,
      ).bind(row.ref, row.hostname, row.domain, row.apex, row.provider, row.dc?.providerId ?? null, row.dc?.name ?? null, row.dc?.syncUx ?? null, row.createdAt).run()
      return (res.meta.changes ?? 0) > 0
    },
    async update(ref, patch, expected) {
      const cols = patchColumns(patch)
      if (!cols.length) return true
      const sets = cols.map(([col], i) => `${col} = ?${i + 3}`).join(', ')
      const res = await db.prepare(`UPDATE custom_domains SET ${sets} WHERE ref = ?1 AND (?2 IS NULL OR status = ?2)`)
        .bind(ref, expected ?? null, ...cols.map(([, v]) => v)).run()
      return (res.meta.changes ?? 0) > 0
    },
    async claimLiveEmail(ref, now) {
      const res = await db.prepare('UPDATE custom_domains SET live_email_at = ?2 WHERE ref = ?1 AND live_email_at IS NULL').bind(ref, now).run()
      return (res.meta.changes ?? 0) > 0
    },
    async delete(ref) {
      await db.prepare('DELETE FROM custom_domains WHERE ref = ?1').bind(ref).run()
    },
    due(statuses, before, limit) {
      const marks = statuses.map((_, i) => `?${i + 3}`).join(', ')
      return many(`${WITH_SITE} WHERE d.status IN (${marks}) AND COALESCE(d.checked_at, 0) < ?1 ORDER BY COALESCE(d.checked_at, 0) LIMIT ?2`, before, limit, ...statuses)
    },
    ended: limit => many(
      `${WITH_SITE} WHERE d.status = 'removing' OR s.ref IS NULL OR s.refunded_at IS NOT NULL OR s.dispute_lost_at IS NOT NULL LIMIT ?1`, limit),
    resumable: limit => many(`${WITH_SITE} WHERE d.status = 'paused' AND s.disputed_at IS NULL AND s.refunded_at IS NULL AND s.dispute_lost_at IS NULL
      AND s.taken_down_at IS NULL AND s.ref IS NOT NULL LIMIT ?1`, limit),
    disputed: limit => many(`${WITH_SITE} WHERE ((s.disputed_at IS NOT NULL AND s.dispute_lost_at IS NULL) OR s.taken_down_at IS NOT NULL)
      AND d.status IN ('pending', 'active') LIMIT ?1`, limit),
    async counts() {
      const rows = await db.prepare('SELECT status, COUNT(*) AS n FROM custom_domains GROUP BY status').all<{ status: DomainStatus; n: number }>()
      const out: Record<DomainStatus, number> = { pending: 0, active: 0, paused: 0, removing: 0 }
      for (const r of rows.results) out[r.status] = r.n
      return out
    },
    list: limit => many(`${WITH_SITE} ORDER BY d.created_at DESC LIMIT ?1`, limit),
  }
}
