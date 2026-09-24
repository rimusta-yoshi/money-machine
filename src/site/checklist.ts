import { z } from 'zod'
import type { SectionType, TradeConfig } from '../types'
import type { Site } from './schema'
import { siteSections } from './sections'

export type ChecklistId =
  | 'badges'
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
  /** Extra condition on the chosen layouts, e.g. hours only appear in the full contact layout. */
  when?: (site: Site) => boolean
  done: (site: Site) => boolean
}

const filled = (v: unknown[] | null) => v !== null && v.length > 0

const RULES: Rule[] = [
  { id: 'photos.hero', label: 'Main photo', usedBy: ['hero'], done: s => s.content.photos.hero !== null },
  { id: 'emergency', label: 'Do you offer emergency call-outs?', usedBy: ['hero'], done: s => s.content.emergency !== null },
  { id: 'badges', label: 'Your credentials and guarantees', usedBy: ['trust_bar', 'certifications'], done: s => filled(s.content.badges) },
  { id: 'photos.about', label: 'Team or van photo', usedBy: ['about'], done: s => s.content.photos.about !== null },
  { id: 'jobsDone', label: 'Roughly how many jobs you’ve done', usedBy: ['about'], done: s => s.content.jobsDone !== null },
  { id: 'photos.gallery', label: 'Photos of your work', usedBy: ['gallery'], done: s => filled(s.content.photos.gallery) },
  { id: 'rating', label: 'Your star rating', usedBy: ['testimonials'], done: s => s.content.rating !== null },
  { id: 'reviews', label: 'Customer reviews', usedBy: ['testimonials'], done: s => filled(s.content.reviews) },
  { id: 'areas', label: 'Areas you cover', usedBy: ['areas'], done: s => filled(s.content.areas) },
  {
    id: 'hours',
    label: 'Opening hours',
    usedBy: ['contact'],
    when: s => s.selections.contact === 'contact-full',
    done: s => filled(s.content.hours),
  },
]

/** What the customer still needs to replace before their site goes live. */
export function buildChecklist(site: Site, trade: TradeConfig): ChecklistItem[] {
  const present = new Set(siteSections(trade, site).map(s => s.type))
  return RULES
    .filter(r => r.usedBy.some(t => present.has(t)) && (r.when?.(site) ?? true))
    .map(r => ({ id: r.id, label: r.label, done: r.done(site) }))
}

const emailSchema = z.string().trim().email()

/** Minimum needed to take payment: a way to reach the business, and to log in later. */
export function isReadyToPublish(site: Site): boolean {
  const b = site.business
  return b.name.trim() !== '' && b.phone.trim() !== '' && emailSchema.safeParse(b.email).success
}
