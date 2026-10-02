import { estimateMeasurer, generateOptions, presentSections, sectionBatch, SECTIONS, viewOf } from '../../gen'
import type { Generated, SectionKey, ThemeKey } from '../../gen'
import { createSite } from '../../site/defaults'
import { pageOrder, withRhythm } from '../../site/page'
import { pageContent } from '../../site/pageContent'
import { styleRecord } from '../../site/style'
import type { Site, SiteContent } from '../../site/schema'
import { tradeById } from '../../trades'
import type { BusinessInfo, TradeConfig } from '../../types'

export const BUSINESS: BusinessInfo = {
  name: "Joe's Plumbing",
  phone: '0113 496 0000',
  location: 'Leeds',
  about: 'Family-run since 2009. The same two plumbers from quote to finish, and we tidy up after.',
  yearsInBusiness: '15',
  email: 'joe@example.com',
}

export const CONTENT: Partial<SiteContent> = {
  badges: ['Gas Safe registered', 'Fully insured'],
  areas: ['Leeds', 'Headingley', 'Horsforth'],
  emergency: true,
  jobsDone: '1,200',
  whyUs: [{ title: 'Clear quotes', text: 'A written quote before any work starts.' }],
}

/**
 * A finished site as the builder leaves it: details filled in, and every section on the page
 * saved with its best layout (the builder measures in a real browser; tests use the estimator).
 */
export function finishedSite(o: {
  trade?: TradeConfig; seed?: number; theme?: ThemeKey; business?: Partial<BusinessInfo>; content?: Partial<SiteContent>; extras?: Site['extras']
} = {}): Site {
  const trade = o.trade ?? tradeById.plumber
  const blank = createSite(trade, o.seed ?? 1234)
  const filled: Site = {
    ...blank,
    style: o.theme ? styleRecord(o.theme, blank.brandColor, blank.style.seed) : blank.style,
    extras: o.extras ?? blank.extras,
    business: { ...BUSINESS, ...o.business },
    content: { ...blank.content, ...CONTENT, ...o.content },
  }
  const content = pageContent(filled, trade)
  const style = filled.style.resolved
  const sections = Object.fromEntries(presentSections(pageOrder(trade, filled), content).map((type: SectionKey): [SectionKey, Generated] => {
    const seed = sectionBatch(filled.style.seed, type)
    const def = SECTIONS[type]
    const { shown } = generateOptions(def, { batchSeed: seed, content: viewOf(type, content), style, measurer: estimateMeasurer, show: 1 })
    return [type, { seed, spec: shown[0]?.spec ?? def.fallback }]
  }))
  return withRhythm({ ...filled, sections }, trade, { prior: null })
}
