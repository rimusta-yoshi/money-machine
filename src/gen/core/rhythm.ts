import type { SiteStyle } from '../schema'
import { THEMES } from '../themes'
import type { Motif } from '../themes/types'
import { staticChecksAll } from './pipeline'
import type { AnySpec, Band, SectionDef, SectionKey, SectionRhythm, Side } from './types'

export interface PageEntry { type: SectionKey; spec: AnySpec }
export type Rhythm = Partial<Record<SectionKey, SectionRhythm>>

const flip = (s: Side): Side => (s === 'left' ? 'right' : 'left')

/** The hero's own image side, when its layout has one. */
function heroSide(spec: AnySpec): Side | null {
  const p = spec.params as { side?: Side }
  return p.side ?? null
}

const motifOf = (spec: AnySpec): Motif => ((spec.params as { motif?: Motif }).motif ?? 'none')

/**
 * The derived layer, solved from the whole page on every change and never stored as a
 * customer choice:
 * - loud bands: a brand or photo hero counts as one; the theme says how many a page may
 *   have and which sections to prefer, never two in a row, and only on layouts that can be
 *   loud and still pass contrast on the brand colour;
 * - backgrounds alternate ground/surface between neighbours (fixed bands like the hero's
 *   tone break the run but not the alternation); an inset panel is never plain ground;
 * - image sides zig-zag down the page, starting from the hero's own side;
 * - motifs are shared out in page order within the theme's quotas (at most so many per
 *   page, some never twice in a row); a section over quota draws its layout without it.
 * Changing one section's pick re-solves this, never other sections' picks.
 */
export function solveRhythm(page: readonly PageEntry[], defs: Record<SectionKey, SectionDef>, style: SiteStyle): Rhythm {
  const theme = THEMES[style.theme]
  const heroEntry = page.find(e => e.type === 'hero')
  const heroBand = heroEntry ? defs.hero.fixedBand?.(heroEntry.spec) ?? null : null
  const heroIsLoud = heroBand === 'brand' || heroBand === 'photo'

  const index = new Map(page.map((e, i) => [e.type, i]))
  const loud = new Set<SectionKey>()
  const loudAt = new Set<number>(heroIsLoud && heroEntry ? [index.get('hero')!] : [])
  for (const type of theme.loud.priority) {
    if (loudAt.size >= theme.loud.max) break
    const i = index.get(type)
    if (i === undefined || loudAt.has(i - 1) || loudAt.has(i + 1)) continue
    const e = page[i]
    const def = defs[type]
    if (def.fixedBand?.(e.spec)) continue
    if (def.archetypes[e.spec.archetype]?.loud && staticChecksAll(def, e.spec, style, [style.palette.quiet ? 'ink' : 'brand']).every(c => c.ok)) {
      loud.add(type)
      loudAt.add(i)
    }
  }

  const out: Rhythm = {}
  let prev: Band | null = null
  let lastNeutral: 'ground' | 'surface' = 'surface'
  let lastSide: Side | null = null
  const used = new Map<Motif, number>()
  let prevMotif: Motif = 'none'
  for (const e of page) {
    const def = defs[e.type]
    const fixed = def.fixedBand?.(e.spec) ?? null
    const panel = def.panel?.(e.spec) ?? false
    const alternate: Band = prev === 'ground' ? 'surface' : prev === 'surface' ? 'ground' : lastNeutral === 'ground' ? 'surface' : 'ground'
    let band: Band = fixed ?? (loud.has(e.type) ? 'brand' : alternate)
    if (panel && band === 'ground') band = 'surface'
    if (!panel && (band === 'ground' || band === 'surface')) lastNeutral = band
    // A panel sits on the page ground, so the next section alternates from ground.
    prev = panel ? 'ground' : band
    if (panel) lastNeutral = 'ground'

    let side: Side = 'right'
    if (e.type === 'hero') {
      const own = heroSide(e.spec)
      if (own) { side = own; lastSide = own }
    } else if (def.archetypes[e.spec.archetype]?.sided) {
      side = lastSide ? flip(lastSide) : 'right'
      lastSide = side
    }

    const m = motifOf(e.spec)
    const rule = m === 'none' ? null : theme.motifs[m]
    const motif: boolean = !!rule && (used.get(m) ?? 0) < rule.maxPerPage && !(rule.apart && prevMotif === m)
    if (motif) used.set(m, (used.get(m) ?? 0) + 1)
    prevMotif = motif ? m : 'none'

    // A quiet brand colour (barely different from the ground) only appears on contrasting bands.
    out[e.type] = { band: band === 'brand' && style.palette.quiet ? 'ink' : band, side, motif }
  }
  return out
}
