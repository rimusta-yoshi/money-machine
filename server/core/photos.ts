import { previewOrigin } from './config'
import type { Config } from './config'
import { HttpError } from './http'
import { sha256Hex } from './tokens'

/**
 * Draft photos: uploaded by the builder when it saves, stored under the draft, and shown
 * from the preview host (the builder and preview links both load them from there).
 * Publishing copies the ones a site uses into the site's own folder.
 */

export type PhotoType = { ext: 'webp' | 'jpg' | 'png'; contentType: string }

/** Decides the type from the bytes, never from what the caller claims. */
export function sniffImage(b: Uint8Array): PhotoType | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to))
  if (b.length > 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return { ext: 'webp', contentType: 'image/webp' }
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', contentType: 'image/jpeg' }
  if (b.length > 8 && b[0] === 0x89 && ascii(1, 4) === 'PNG' && b[4] === 0x0d && b[5] === 0x0a) return { ext: 'png', contentType: 'image/png' }
  return null
}

/** Photos are named by their content, so an upload twice is stored once. */
export const PHOTO_NAME = /^[0-9a-f]{32}\.(webp|jpg|png)$/

export async function photoName(bytes: Uint8Array): Promise<{ name: string; type: PhotoType }> {
  const type = sniffImage(bytes)
  if (!type) throw new HttpError(415, 'not_an_image', 'That file is not a photo we can use. Try a JPEG or PNG.')
  return { name: `${(await sha256Hex(bytes)).slice(0, 32)}.${type.ext}`, type }
}

export const draftPhotoPrefix = (ref: string): string => `drafts/${ref}/photos/`
export const draftPhotoKey = (ref: string, name: string): string => `${draftPhotoPrefix(ref)}${name}`
export const draftPhotoUrl = (c: Config, ref: string, name: string): string => `${previewOrigin(c)}/photos/${ref}/${name}`

/** The photo's file name if the URL is one of this draft's own uploads; null for anything else. */
export function ownPhotoName(url: string, c: Config, ref: string): string | null {
  const prefix = `${previewOrigin(c)}/photos/${ref}/`
  if (!url.startsWith(prefix)) return null
  const name = url.slice(prefix.length)
  return PHOTO_NAME.test(name) ? name : null
}
