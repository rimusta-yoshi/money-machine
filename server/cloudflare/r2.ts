import type { Assets, Blobs } from '../core/ports'

/** Object storage on Cloudflare R2 (S3-compatible, so the same keys work on any S3 store). */
export function r2Blobs(bucket: R2Bucket): Blobs {
  return {
    async put(key, body, contentType) {
      await bucket.put(key, body, { httpMetadata: { contentType } })
    },
    async get(key) {
      const obj = await bucket.get(key)
      if (!obj) return null
      return { body: obj.body as unknown as ReadableStream, contentType: obj.httpMetadata?.contentType ?? 'application/octet-stream', etag: obj.httpEtag, size: obj.size }
    },
    async list(prefix) {
      const keys: string[] = []
      let cursor: string | undefined
      do {
        const page = await bucket.list({ prefix, cursor })
        keys.push(...page.objects.map(o => o.key))
        cursor = page.truncated ? page.cursor : undefined
      } while (cursor)
      return keys
    },
    async delete(keys) {
      // R2 deletes up to 1000 keys per call.
      for (let i = 0; i < keys.length; i += 1000) await bucket.delete(keys.slice(i, i + 1000))
    },
  }
}

/** Fonts deployed with the Worker as static assets (public/fonts). */
export function workerAssets(assets: Fetcher): Assets {
  return {
    async font(name) {
      const res = await assets.fetch(new Request(`https://assets.local/${name}`))
      return res.ok ? (res as unknown as Response) : null
    },
  }
}
