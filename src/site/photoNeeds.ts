import { renderPageSection, specKey } from '../gen'
import type { AnySpec, Generated, PageContent, ResolvedSection, SectionKey, SiteStyle } from '../gen'
import type { TradeConfig } from '../types'
import { publishedPage } from './page'
import { pageContent } from './pageContent'
import type { Site } from './schema'

export type PhotoSlot = 'hero' | 'about' | 'gallery'

export interface PhotoNeed {
  section: SectionKey
  slot: PhotoSlot
  /** What goes live meanwhile: the nearest layout without the photo, or the same one without it. */
  live: ResolvedSection
  /** Whether a different layout goes live meanwhile (false: the chosen one, without its photo). */
  swapped: boolean
}

const SLOTS: readonly PhotoSlot[] = ['hero', 'about', 'gallery']

/** A stand-in photo, only ever rendered here to see whether a layout would show it. */
const PROBE = { url: 'https://photo-check.invalid/probe.jpg', alt: 'Photo check' }

const isEmpty = (c: PageContent, slot: PhotoSlot) => (slot === 'gallery' ? c.photos.gallery.length === 0 : c.photos[slot] === null)

const withProbe = (c: PageContent, slot: PhotoSlot): PageContent => ({
  ...c,
  photos: { ...c.photos, ...(slot === 'gallery' ? { gallery: Array.from({ length: 6 }, () => PROBE) } : { [slot]: PROBE }) },
})

const shows = (s: ResolvedSection, spec: AnySpec, style: SiteStyle, c: PageContent) =>
  renderPageSection({ type: s.type, spec, rhythm: s.rhythm }, style, c).includes(PROBE.url)

/**
 * Sections whose chosen layout shows a photo the customer hasn't added. Nothing is swapped
 * silently: the go-live step lists each one with what goes live instead, until a photo is added.
 */
export function photoNeeds(site: Site, trade: TradeConfig): PhotoNeed[] {
  const content = pageContent(site, trade)
  const style = site.style.resolved
  return publishedPage(site, trade).flatMap(s => {
    const entry = site.sections[s.type] as Generated | undefined
    if (!entry) return []
    const wanted = entry.preferred ?? entry.spec
    const slot = SLOTS.find(slot => isEmpty(content, slot) && shows(s, wanted, style, withProbe(content, slot)))
    return slot ? [{ section: s.type, slot, live: s, swapped: specKey(wanted) !== specKey(s.spec) }] : []
  })
}
