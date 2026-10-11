import type { PageContent } from '../gen'
import type { PhotoSlotId } from '../site/photoAlt'

/** Which photos on screen are samples, by URL, and the slot each fills. */
export type SampleSlots = ReadonlyMap<string, PhotoSlotId>

/** The sample photos in `shown` that stand in for slots the customer's own content leaves empty. */
export function sampleSlots(own: PageContent, shown: PageContent): SampleSlots {
  const out = new Map<string, PhotoSlotId>()
  if (!own.photos.hero && shown.photos.hero) out.set(shown.photos.hero.url, 'hero')
  if (!own.photos.about && shown.photos.about) out.set(shown.photos.about.url, 'about')
  if (!own.photos.gallery.length) for (const p of shown.photos.gallery) out.set(p.url, 'gallery')
  return out
}
