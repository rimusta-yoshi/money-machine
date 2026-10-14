import { cautiousMeasurer, generateOptions, presentSections, sectionBatch, SECTIONS, THEMES, viewOf } from '../../gen'
import type { Generated, SectionKey } from '../../gen'
import type { PagePack } from '../../packs/pages'
import { homeDocument, privacyDocument, siteCss } from '../../publish/document'
import { stockSetFor } from '../../sample/stockPhotoFiles'
import { createSite } from '../../site/defaults'
import { pageOrder, withRhythm } from '../../site/page'
import { pageContent } from '../../site/pageContent'
import type { Photo, Site } from '../../site/schema'
import { styleRecord } from '../../site/style'
import { tradeById } from '../../trades'
import type { TradeConfig } from '../../types'
import { examplePath, PHOTO_PATH } from './paths'

/**
 * The three example sites on each "Websites for…" page: made-up businesses from the pack,
 * built by the real generator at build time exactly as a finished site is published (under the
 * publishing estimator, which never lets decorations cover text), with the pack's own sample
 * photos. In each section the first layout offered that shows a photo is kept, as a customer
 * with photos would, else the first layout offered. Never a real customer's site.
 */

/** Ofcom's drama numbers (01632 960xxx): never a real line. */
const PHONES = ['01632 960 418', '01632 960 527', '01632 960 736']
const GALLERY = 6

const photo = (file: string, alt: string): Photo => ({ url: `${PHOTO_PATH}${file}`, alt })

/** The example as a finished site record, ready to render. */
export function exampleSite(pack: PagePack, n: number): { site: Site; trade: TradeConfig } {
  const ex = pack.landing.examples[n]
  const trade = tradeById[pack.id]
  const blank = createSite(trade, ex.seed)
  const [hero, about, ...gallery] = stockSetFor(pack.id, ex.seed).map(p => photo(p.file, p.alt))
  const filled: Site = {
    ...blank,
    style: styleRecord(ex.theme, blank.brandColor, ex.seed),
    business: { name: ex.name, phone: PHONES[n % PHONES.length], location: ex.location, about: ex.about, yearsInBusiness: ex.years, email: 'hello@example.com' },
    content: {
      ...blank.content,
      badges: pack.badges.slice(0, 3),
      areas: [...ex.areas],
      // The theme's own suggested lines: what the builder offers every customer.
      whyUs: THEMES[ex.theme].voice.why.slice(0, 3).map(([title, text]) => ({ title, text })),
      certsNote: 'Certificates available on request.',
      photos: { hero: hero ?? null, about: about ?? null, gallery: gallery.slice(0, GALLERY) },
    },
  }
  const content = pageContent(filled, trade)
  const style = filled.style.resolved
  const sections = Object.fromEntries(presentSections(pageOrder(trade, filled), content).map((type: SectionKey): [SectionKey, Generated] => {
    const seed = sectionBatch(filled.style.seed, type)
    const def = SECTIONS[type]
    const { shown } = generateOptions(def, { batchSeed: seed, content: viewOf(type, content), style, measurer: cautiousMeasurer })
    const withPhoto = shown.find(c => /photo/.test(def.archetypes[c.spec.archetype]?.why ?? ''))
    return [type, { seed, spec: (withPhoto ?? shown[0])?.spec ?? def.fallback }]
  }))
  return { site: withRhythm({ ...filled, sections }, trade, { prior: null }), trade }
}

export interface ExampleFiles {
  /** Paths (no leading slash) to file contents. */
  files: Record<string, string>
  /** The sample photos the example shows (reference/sample-photos). */
  photos: string[]
}

/** Every file of one example: its page, privacy notice and stylesheet. Kept out of search (noindex). */
export function exampleFiles(pack: PagePack, n: number, origin: string, date: Date): ExampleFiles {
  const { site, trade } = exampleSite(pack, n)
  const base = examplePath(pack, n).replace(/\/$/, '')
  const o = { origin, base, cssHref: `${base}/site.css`, noindex: true, date }
  const p = site.content.photos
  return {
    files: {
      [`${base.slice(1)}/index.html`]: homeDocument(site, trade, o),
      [`${base.slice(1)}/privacy.html`]: privacyDocument(site, trade, o),
      [`${base.slice(1)}/site.css`]: siteCss(site),
    },
    photos: [p.hero, p.about, ...p.gallery].flatMap(x => (x ? [x.url.slice(PHOTO_PATH.length)] : [])),
  }
}
