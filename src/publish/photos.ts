import type { Photo, Site } from '../site/schema'

/** Every photo in a record: hero, about, then gallery. */
export function sitePhotos(site: Pick<Site, 'content'>): Photo[] {
  const p = site.content.photos
  return [p.hero, p.about, ...p.gallery].filter((x): x is Photo => x !== null)
}

/** The same record with every photo URL replaced (returns a new record; the input is untouched). */
export async function mapPhotoUrls<S extends Pick<Site, 'content'>>(site: S, fn: (url: string) => string | Promise<string>): Promise<S> {
  const one = async (photo: Photo | null): Promise<Photo | null> => (photo ? { ...photo, url: await fn(photo.url) } : null)
  const p = site.content.photos
  const [hero, about, gallery] = await Promise.all([one(p.hero), one(p.about), Promise.all(p.gallery.map(async g => ({ ...g, url: await fn(g.url) })))])
  return { ...site, content: { ...site.content, photos: { hero, about, gallery } } }
}

export const isDataUrl = (url: string): boolean => url.startsWith('data:')
