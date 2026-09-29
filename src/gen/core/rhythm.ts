import type { SiteStyle } from '../schema'
import { staticChecksAll } from './pipeline'
import type { AnySpec, Band, SectionDef, SectionKey, SectionRhythm, Side } from './types'

export interface PageEntry { type: SectionKey; spec: AnySpec }
export type Rhythm = Partial<Record<SectionKey, SectionRhythm>>

/** Which section gets the page's one loud band, in order of preference. */
export const LOUD_PRIORITY: readonly SectionKey[] = ['contact', 'why_us', 'testimonials', 'trust_bar', 'services', 'about', 'areas', 'certifications']

const flip = (s: Side): Side => (s === 'left' ? 'right' : 'left')

/** The hero's own image side, when its layout has one. */
function heroSide(spec: AnySpec): Side | null {
  const p = spec.params as { side?: Side }
  if (spec.archetype === 'split') return p.side ?? 'right'
  if (spec.archetype === 'offset') return 'right'
  return null
}

/**
 * The derived layer, solved from the whole page on every change and never stored as a
 * customer choice:
 * - one loud section: a brand or photo hero, otherwise the first eligible section in
 *   LOUD_PRIORITY whose layout can be loud and still passes contrast on the brand colour;
 * - backgrounds alternate ground/surface between neighbours (fixed bands like the hero's
 *   tone or the footer's ink break the run but not the alternation);
 * - image sides zig-zag down the page, starting from the hero's own side.
 * Changing one section's pick re-solves this, never other sections' picks.
 */
export function solveRhythm(page: readonly PageEntry[], defs: Record<SectionKey, SectionDef>, style: SiteStyle): Rhythm {
  const heroEntry = page.find(e => e.type === 'hero')
  const heroBand = heroEntry ? defs.hero.fixedBand?.(heroEntry.spec) ?? null : null
  const heroIsLoud = heroBand === 'brand' || heroBand === 'photo'

  let loud: SectionKey | null = null
  if (!heroIsLoud) {
    for (const type of LOUD_PRIORITY) {
      const e = page.find(x => x.type === type)
      if (!e) continue
      const def = defs[type]
      if (def.archetypes[e.spec.archetype]?.loud && staticChecksAll(def, e.spec, style, ['brand']).every(c => c.ok)) {
        loud = type
        break
      }
    }
  }

  const out: Rhythm = {}
  let prev: Band | null = null
  let lastNeutral: 'ground' | 'surface' = 'surface'
  let lastSide: Side | null = null
  for (const e of page) {
    const def = defs[e.type]
    const fixed = def.fixedBand?.(e.spec) ?? null
    const band: Band = fixed ?? (e.type === loud ? 'brand' : prev === 'ground' ? 'surface' : prev === 'surface' ? 'ground' : lastNeutral === 'ground' ? 'surface' : 'ground')
    if (band === 'ground' || band === 'surface') lastNeutral = band
    prev = band

    let side: Side = 'right'
    if (e.type === 'hero') {
      const own = heroSide(e.spec)
      if (own) { side = own; lastSide = own }
    } else if (def.archetypes[e.spec.archetype]?.sided) {
      side = lastSide ? flip(lastSide) : 'right'
      lastSide = side
    }
    out[e.type] = { band, side }
  }
  return out
}
