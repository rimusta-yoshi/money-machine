import type { PagePhoto } from '../gen'
import { STOCK_PHOTOS } from './stockPhotoFiles'
import type { StockPhoto } from './stockPhotoFiles'

/**
 * Stock photos (reference/sample-photos, see its LICENCE.md) for the contact sheet and the
 * builder preview's empty photo slots (usePreviewContent). Served by the dev server, or in
 * production from our own storage (R2), read into data URLs so they pass the same image rules
 * as customer photos, and labelled as samples in their alt text. Never published.
 */

async function asDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return `data:image/jpeg;base64,${btoa(bin)}`
}

/** Each file is fetched once per page, however many sets use it. */
const loading = new Map<string, Promise<PagePhoto>>()

/**
 * Where the photos are served from: VITE_SAMPLE_PHOTOS_URL (our R2 bucket, for production
 * builds), else the repo folder on the dev server. Null: no stock photos, drawn placeholders only.
 */
export function stockPhotosBase(env: { DEV: boolean; VITE_SAMPLE_PHOTOS_URL?: string } = import.meta.env): string | null {
  const configured = env.VITE_SAMPLE_PHOTOS_URL?.trim().replace(/\/+$/, '')
  if (configured) return configured
  return env.DEV ? '/reference/sample-photos' : null
}

export { STOCK_PHOTO_FILES, stockSetFor } from './stockPhotoFiles'

function loadOne(base: string, p: StockPhoto): Promise<PagePhoto> {
  const key = `${base}/${p.file}`
  let job = loading.get(key)
  if (!job) {
    job = fetch(key).then(async res => {
      if (!res.ok || !res.headers.get('content-type')?.startsWith('image/jpeg')) throw new Error(`${p.file}: ${res.status}`)
      return { url: await asDataUrl(await res.blob()), alt: p.alt }
    })
    // A failed fetch can be tried again later.
    job.catch(() => loading.delete(key))
    loading.set(key, job)
  }
  return job
}

/** Fewer photos than this and the drawn placeholders are used instead. */
const ENOUGH = 3

/**
 * The given stock photos (default: all of them), in order, leaving out any that can't be
 * read (say, storage not yet holding a newly added photo); null when there's nowhere to load
 * them from or too few arrive.
 */
export async function loadStockPhotos(set: readonly StockPhoto[] = STOCK_PHOTOS, base = stockPhotosBase()): Promise<PagePhoto[] | null> {
  if (!base) return null
  const results = await Promise.allSettled(set.map(p => loadOne(base, p)))
  const photos = results.flatMap(r => (r.status === 'fulfilled' ? [r.value] : []))
  return photos.length >= Math.min(ENOUGH, set.length) ? photos : null
}
