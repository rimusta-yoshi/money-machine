import type { Backups, ObjectStore, TableReader } from '../core/backup/types'

/** Backups on Cloudflare: R2 buckets and the D1 database behind server/core/backup's interfaces. */

export function r2Store(bucket: R2Bucket): ObjectStore {
  return {
    async page(prefix, o = {}) {
      const res = await bucket.list({ prefix, startAfter: o.startAfter, limit: o.limit ?? 1000, include: ['customMetadata'] })
      return {
        objects: res.objects.map(x => ({ key: x.key, size: x.size, uploaded: x.uploaded.getTime(), meta: x.customMetadata ?? {} })),
        more: res.truncated,
      }
    },
    async read(key) {
      const obj = await bucket.get(key)
      if (!obj) return null
      return { bytes: await obj.arrayBuffer(), contentType: obj.httpMetadata?.contentType ?? 'application/octet-stream', meta: obj.customMetadata ?? {} }
    },
    async write(key, bytes, contentType, meta) {
      await bucket.put(key, bytes, { httpMetadata: { contentType }, customMetadata: meta })
    },
    async remove(keys) {
      for (let i = 0; i < keys.length; i += 1000) await bucket.delete(keys.slice(i, i + 1000))
    },
  }
}

const TABLE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/

/** `?1, ?2, …` placeholders for a list of values. */
const params = (n: number): string => Array.from({ length: n }, (_, i) => `?${i + 1}`).join(', ')

export function d1Tables(db: D1Database): TableReader {
  return {
    async schema() {
      const rows = await db.prepare(
        `SELECT type, name, tbl_name AS tbl, sql FROM sqlite_master
         WHERE sql IS NOT NULL AND type IN ('table', 'index') AND name NOT LIKE 'sqlite_%' AND substr(name, 1, 4) <> '_cf_'
         ORDER BY type DESC, rowid`,
      ).all<{ type: string; name: string; tbl: string; sql: string }>()
      return rows.results.map(r => ({ type: r.type, name: r.name, table: r.tbl, sql: r.sql }))
    },
    async rows(table, afterRowid, limit, where) {
      // The table name comes from sqlite_master and `where` from a fixed list in dbExport.ts.
      if (!TABLE_NAME.test(table)) throw new Error(`Unexpected table name: ${table}`)
      const res = await db.prepare(`SELECT rowid AS __rowid, * FROM "${table}" WHERE rowid > ?1 ${where ? `AND (${where})` : ''} ORDER BY rowid LIMIT ?2`)
        .bind(afterRowid, limit).all<Record<string, unknown>>()
      return res.results.map(({ __rowid, ...row }) => ({ rowid: Number(__rowid), row }))
    },
    async keptRefs(refs) {
      if (!refs.length) return new Set()
      const res = await db.prepare(`SELECT ref FROM drafts WHERE ref IN (${params(refs.length)}) AND (paid_at IS NOT NULL OR published_at IS NOT NULL)`)
        .bind(...refs).all<{ ref: string }>()
      return new Set(res.results.map(r => r.ref))
    },
    async refForSlug(slug) {
      const row = await db.prepare('SELECT ref FROM slugs WHERE slug = ?1 UNION ALL SELECT ref FROM drafts WHERE slug = ?1 LIMIT 1').bind(slug).first<{ ref: string }>()
      return row?.ref ?? null
    },
    async slugForRef(ref) {
      const row = await db.prepare('SELECT slug FROM drafts WHERE ref = ?1 AND slug IS NOT NULL UNION ALL SELECT slug FROM slugs WHERE ref = ?1 LIMIT 1').bind(ref).first<{ slug: string }>()
      return row?.slug ?? null
    },
  }
}

export function cloudflareBackups(db: D1Database | undefined, live: R2Bucket, backups: R2Bucket | undefined): Backups | null {
  return db && backups ? { db: d1Tables(db), live: r2Store(live), store: r2Store(backups) } : null
}
