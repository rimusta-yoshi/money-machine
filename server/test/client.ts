import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Site } from '../../src/site/schema'
import type { Stack } from './stack'

/** A tiny test client for the API, as the builder would call it. */
export const ADMIN = 'test-admin-key-0123456789abcdef'
export const BASE = 'siteblocks.test'
export const API = `https://api.${BASE}`
export const BUILDER = 'http://localhost:5173'

export const photoBytes = (file = 'bathroom.jpg'): Uint8Array<ArrayBuffer> => new Uint8Array(readFileSync(join(process.cwd(), 'reference', 'sample-photos', file)))

let n = 0
/** A fresh caller address, so tests don't share rate limits. */
export const freshIp = (): string => `10.0.${Math.floor(++n / 250)}.${n % 250}`

interface CallOpts { method?: string; key?: string; json?: unknown; body?: BodyInit; type?: string; ip?: string; origin?: string; admin?: string }

export function client(s: Stack, base = BASE) {
  const api = `https://api.${base}`
  const call = (path: string, o: CallOpts = {}) => {
    const headers: Record<string, string> = { 'CF-Connecting-IP': o.ip ?? freshIp() }
    if (o.key) headers.Authorization = `Bearer ${o.key}`
    if (o.origin) headers.Origin = o.origin
    if (o.admin) headers['X-Admin-Key'] = o.admin
    if (o.json !== undefined) headers['Content-Type'] = 'application/json'
    if (o.type) headers['Content-Type'] = o.type
    return s.fetch(`${api}${path}`, { method: o.method ?? 'GET', headers, body: o.json !== undefined ? JSON.stringify(o.json) : o.body })
  }
  return {
    call,
    async newDraft(): Promise<string> {
      const res = await call('/v1/drafts', { method: 'POST' })
      return ((await res.json()) as { key: string }).key
    },
    async upload(key: string, bytes = photoBytes()): Promise<string> {
      const res = await call('/v1/draft/photos', { method: 'POST', key, body: bytes, type: 'image/jpeg' })
      if (res.status !== 201) throw new Error(`upload ${res.status}: ${await res.text()}`)
      return ((await res.json()) as { url: string }).url
    },
    save: (key: string, site: Site | unknown) => call('/v1/draft', { method: 'PUT', key, json: site }),
    preview: async (key: string) => (await (await call('/v1/draft/preview', { method: 'POST', key })).json()) as { url: string; expiresAt: string },
    publish: (key: string, slug: string, admin = ADMIN) => call('/v1/draft/publish', { method: 'POST', key, json: { slug }, admin }),
  }
}
