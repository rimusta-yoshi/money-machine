import type { PagePhoto } from '../gen'

/**
 * Stock photos (reference/sample-photos, see its LICENCE.md) for the contact sheet and the
 * builder preview's empty photo slots (usePreviewContent). Served by the dev server, or in
 * production from our own storage (R2), read into data URLs so they pass the same image rules
 * as customer photos, and labelled as samples in their alt text. Never published.
 */
const FILES: readonly [string, string][] = [
  ['bathroom.jpg', 'Sample photo: a finished bathroom with a glass shower'],
  ['worker-hi-vis.jpg', 'Sample photo: a worker in a hard hat and hi-vis jacket'],
  ['kitchen.jpg', 'Sample photo: a fitted kitchen with wood cabinets'],
  ['roof-tiles.jpg', 'Sample photo: clay roof tiles going onto battens'],
  ['painting-wall.jpg', 'Sample photo: painting a ceiling with a roller'],
  ['garden-patio.jpg', 'Sample photo: a garden patio with seating'],
  ['garden-path.jpg', 'Sample photo: a paved side path by a fence'],
  ['workshop-tools.jpg', 'Sample photo: hand tools on a workbench'],
]

const asDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result))
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(blob)
})

let loading: Promise<PagePhoto[] | null> | null = null

/**
 * Where the photos are served from: VITE_SAMPLE_PHOTOS_URL (our R2 bucket, for production
 * builds), else the repo folder on the dev server. Null: no stock photos, drawn placeholders only.
 */
export function stockPhotosBase(env: { DEV: boolean; VITE_SAMPLE_PHOTOS_URL?: string } = import.meta.env): string | null {
  const configured = env.VITE_SAMPLE_PHOTOS_URL?.trim().replace(/\/+$/, '')
  if (configured) return configured
  return env.DEV ? '/reference/sample-photos' : null
}

/** The files to upload to that location (see reference/sample-photos/LICENCE.md). */
export const STOCK_PHOTO_FILES = FILES.map(([file]) => file)

/** Hero, about, then gallery photos; null when there's nowhere to load them from or any can't be read. */
export function loadStockPhotos(base = stockPhotosBase()): Promise<PagePhoto[] | null> {
  if (!base) return Promise.resolve(null)
  loading ??= Promise.all(FILES.map(async ([file, alt]) => {
    const res = await fetch(`${base}/${file}`)
    if (!res.ok || !res.headers.get('content-type')?.startsWith('image/jpeg')) throw new Error(`${file}: ${res.status}`)
    return { url: await asDataUrl(await res.blob()), alt }
  })).catch(() => null)
  return loading
}
