import type { PageContent } from '../gen'

/** Photos are large data URLs; identify them by object rather than re-serialising them on every keystroke. */
const photoIds = new WeakMap<object, number>()
let nextPhotoId = 1
export const photoId = (photo: object | null): number => {
  if (!photo) return 0
  if (!photoIds.has(photo)) photoIds.set(photo, nextPhotoId++)
  return photoIds.get(photo)!
}

/** A cheap key for any value that may hold photos: photos (objects with a url) become small ids. */
export function valueKey(value: unknown): string {
  return JSON.stringify(value, (_k, v: unknown) =>
    v && typeof v === 'object' && 'url' in v && 'alt' in v ? `photo#${photoId(v)}` : v)
}

export const contentKey = (c: PageContent): string => valueKey(c)
