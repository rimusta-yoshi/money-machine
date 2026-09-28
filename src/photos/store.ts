import type { ResizedPhoto } from './resize'

/**
 * Where prepared photos go. For now they live inside the site record as data URLs;
 * once publishing exists this becomes an R2 upload that returns an https URL.
 */
export interface PhotoStore {
  put(photo: ResizedPhoto): Promise<string>
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the photo'))
    reader.readAsDataURL(blob)
  })
}

export const dataUrlStore: PhotoStore = { put: photo => blobToDataUrl(photo.blob) }
