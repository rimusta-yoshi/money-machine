import type { SectionType, TradeConfig } from '../types'
import { siteSections } from './sections'
import type { Site } from './schema'

/** Business details that are filled in while building, beside the section that shows them. */
export type BusinessField = 'yearsInBusiness' | 'about'

/**
 * Which business fields a section edits. Years in business and the about blurb live with
 * the About section; a site without one edits the years with the trust bar, which shows
 * them too. The blurb is only shown by the About section.
 */
export function businessFieldsFor(site: Pick<Site, 'extras'>, trade: TradeConfig, section: SectionType): BusinessField[] {
  const present = new Set(siteSections(trade, site).map(s => s.type))
  const yearsHome: SectionType | null = present.has('about') ? 'about' : present.has('trust_bar') ? 'trust_bar' : null
  const fields: BusinessField[] = []
  if (section === yearsHome) fields.push('yearsInBusiness')
  if (section === 'about') fields.push('about')
  return fields
}
