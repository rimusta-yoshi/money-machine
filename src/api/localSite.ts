import { isDataUrl } from '../publish/photos'
import { parseSite } from '../site/parse'
import type { Photo, Site } from '../site/schema'

/**
 * The builder's autosave: the site record in this browser only. The server sees a copy only
 * for a preview link or a checkout. Photos are already uploaded by then, so the record stays
 * small; without a server they stay data URLs, and storage may refuse a big record (the site
 * is then simply not kept).
 */

const STORAGE_KEY = 'siteblocks.site'

export function loadLocalSite(storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): Site | null {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    return raw ? parseSite(JSON.parse(raw)) : null
  } catch {
    // Missing, blocked, or from a version that can't be read: start afresh.
    return null
  }
}

/** True if the site was kept. */
export function saveLocalSite(site: Site, storage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage): boolean {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(site))
    return !!storage
  } catch {
    return false
  }
}

export function forgetLocalSite(storage: Pick<Storage, 'removeItem'> | undefined = globalThis.localStorage): void {
  try {
    storage?.removeItem(STORAGE_KEY)
  } catch {
    // Nothing kept.
  }
}

/** The site without the photos it had uploaded (used once the server has cleared them). */
export function withoutStoredPhotos(site: Site): Site {
  const keep = (p: Photo | null): Photo | null => (p && isDataUrl(p.url) ? p : null)
  const photos = site.content.photos
  return { ...site, content: { ...site.content, photos: { hero: keep(photos.hero), about: keep(photos.about), gallery: photos.gallery.filter(g => isDataUrl(g.url)) } } }
}
