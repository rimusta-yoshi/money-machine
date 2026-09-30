import { z } from 'zod'
import type { SectionType, TradeConfig } from '../types'
import type { Site } from './schema'
import { siteSections } from './sections'

export type ChecklistId =
  | 'badges'
  | 'whyUs'
  | 'certsNote'
  | 'emergency'
  | 'areas'
  | 'hours'
  | 'jobsDone'
  | 'rating'
  | 'reviews'
  | 'photos.hero'
  | 'photos.about'
  | 'photos.gallery'

export interface ChecklistItem {
  id: ChecklistId
  label: string
  done: boolean
}

interface Rule {
  id: ChecklistId
  label: string
  /** Section types that use this content; the item appears if the site has any of them. */
  usedBy: SectionType[]
  done: (site: Site) => boolean
}

const filled = (v: unknown[] | null) => v !== null && v.length > 0

const RULES: Rule[] = [
  { id: 'photos.hero', label: 'Main photo', usedBy: ['hero'], done: s => s.content.photos.hero !== null },
  { id: 'badges', label: 'Your credentials and guarantees', usedBy: ['trust_bar', 'certifications'], done: s => filled(s.content.badges) },
  { id: 'whyUs', label: 'Why people should choose you', usedBy: ['why_us'], done: s => filled(s.content.whyUs ?? null) },
  { id: 'certsNote', label: 'A note about your certificates', usedBy: ['certifications'], done: s => !!s.content.certsNote },
  { id: 'emergency', label: 'Do you offer emergency call-outs?', usedBy: ['trust_bar', 'services', 'contact'], done: s => s.content.emergency !== null },
  { id: 'jobsDone', label: 'Roughly how many jobs you’ve done', usedBy: ['trust_bar', 'about'], done: s => s.content.jobsDone !== null },
  { id: 'photos.about', label: 'Team or van photo', usedBy: ['about', 'why_us'], done: s => s.content.photos.about !== null },
  { id: 'photos.gallery', label: 'Photos of your work', usedBy: ['gallery'], done: s => filled(s.content.photos.gallery) },
  { id: 'rating', label: 'Your star rating', usedBy: ['testimonials'], done: s => s.content.rating !== null },
  { id: 'reviews', label: 'Customer reviews', usedBy: ['testimonials'], done: s => filled(s.content.reviews) },
  { id: 'areas', label: 'Areas you cover', usedBy: ['areas'], done: s => filled(s.content.areas) },
  {
    id: 'hours',
    label: 'Opening hours',
    usedBy: ['contact'],
    done: s => filled(s.content.hours),
  },
]

/** What the customer still needs to replace before their site goes live. */
export function buildChecklist(site: Site, trade: TradeConfig): ChecklistItem[] {
  const present = new Set(siteSections(trade, site).map(s => s.type))
  return RULES
    .filter(r => r.usedBy.some(t => present.has(t)))
    .map(r => ({ id: r.id, label: r.label, done: r.done(site) }))
}

/** The checklist items a single section uses, for editing that section in place. */
export function sectionChecklist(site: Site, trade: TradeConfig, type: SectionType): ChecklistItem[] {
  const own = new Set(RULES.filter(r => r.usedBy.includes(type)).map(r => r.id))
  return buildChecklist(site, trade).filter(i => own.has(i.id))
}

/** The section of this site where a checklist item is filled in. */
export function sectionForItem(site: Site, trade: TradeConfig, id: ChecklistId): SectionType | null {
  const present = siteSections(trade, site).map(s => s.type)
  const rule = RULES.find(r => r.id === id)
  return present.find(t => rule?.usedBy.includes(t)) ?? null
}

const emailSchema = z.string().trim().email()

/** Minimum needed to take payment: a way to reach the business, and to log in later. */
export function isReadyToPublish(site: Site): boolean {
  const b = site.business
  return b.name.trim() !== '' && b.phone.trim() !== '' && emailSchema.safeParse(b.email).success
}
