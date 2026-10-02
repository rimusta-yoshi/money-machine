import { isDataUrl, mapPhotoUrls } from '../publish/photos'
import type { Site } from '../site/schema'

/** A data URL's bytes as a Blob (photos are prepared in the browser as base64 data URLs). */
export function dataUrlToBlob(url: string): Blob {
  const m = /^data:([^;,]+);base64,(.*)$/.exec(url)
  if (!m) throw new Error('Not a base64 data URL')
  const bin = atob(m[2])
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: m[1] })
}

/**
 * The record with every photo still held as a data URL uploaded and replaced by its stored
 * URL. Uploads are remembered in `done` so a photo goes up once however often it's saved.
 */
export function uploadPhotos(site: Site, upload: (photo: Blob) => Promise<string>, done: Map<string, string>): Promise<Site> {
  return mapPhotoUrls(site, async url => {
    if (!isDataUrl(url)) return url
    const known = done.get(url)
    if (known) return known
    const stored = await upload(dataUrlToBlob(url))
    done.set(url, stored)
    return stored
  })
}
