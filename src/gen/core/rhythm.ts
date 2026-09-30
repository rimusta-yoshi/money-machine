import type { SiteStyle } from '../schema'
import { THEMES } from '../themes'
import type { Motif } from '../themes/types'
import { staticChecksAll } from './pipeline'
import type { AnySpec, Band, Facet, SectionDef, SectionKey, SectionRhythm, Shows, Side } from './types'

export interface PageEntry { type: SectionKey; spec: AnySpec }
export type Rhythm = Partial<Record<SectionKey, SectionRhythm>>

const flip = (s: Side): Side => (s === 'left' ? 'right' : 'left')

/** The hero's own image side, when its layout has one. */
function heroSide(spec: AnySpec): Side | null {
  const p = spec.params as { side?: Side }
  return p.side ?? null
}

/** Every motif a spec draws: its own `motif` param plus any its layout always draws. */
function motifsOf(def: SectionDef, spec: AnySpec): Motif[] {
  const own = (spec.params as { motif?: Motif }).motif ?? 'none'
  const drawn = def.archetypes[spec.archetype]?.drawn?.(spec.params as never) ?? []
  return [...new Set([own, ...drawn])].filter(m => m !== 'none')
}

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
  // Sections that always sit on a strong band (a dark footer, a photo hero) can't have a loud band beside them either.
  const strongAt = new Set(page.map((e, i) => [defs[e.type].fixedBand?.(e.spec) ?? null, i] as const)
    .filter(([b]) => b === 'brand' || b === 'ink' || b === 'photo').map(([, i]) => i))
  for (const type of theme.loud.priority) {
    if (loudAt.size >= theme.loud.max) break
    const i = index.get(type)
    if (i === undefined || [i - 1, i + 1].some(j => loudAt.has(j) || strongAt.has(j))) continue
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
  let prevMotifs: Motif[] = []
  page.forEach((e, i) => {
    const def = defs[e.type]
    const fixed = def.fixedBand?.(e.spec) ?? null
    const panel = def.panel?.(e.spec) ?? false
    const next = page[i + 1]
    const nextFixed = next ? defs[next.type].fixedBand?.(next.spec) ?? null : null
    const turn: Band = prev === 'ground' ? 'surface' : prev === 'surface' ? 'ground' : lastNeutral === 'ground' ? 'surface' : 'ground'
    // Look ahead: never take the same background as a neighbour whose band is fixed (a plain footer).
    const alternate: Band = nextFixed === turn && prev !== (turn === 'ground' ? 'surface' : 'ground') ? (turn === 'ground' ? 'surface' : 'ground') : turn
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

    // A section draws its motifs only if every one of them is still within the page's quotas.
    const wanted = motifsOf(def, e.spec)
    const motif = wanted.length > 0 && wanted.every(m => {
      const rule = theme.motifs[m as Exclude<Motif, 'none'>]
      return !!rule && (used.get(m) ?? 0) < rule.maxPerPage && !(rule.apart && prevMotifs.includes(m))
    })
    if (motif) for (const m of wanted) used.set(m, (used.get(m) ?? 0) + 1)
    prevMotifs = motif ? wanted : []

    // A quiet brand colour (barely different from the ground) only appears on contrasting bands.
    out[e.type] = { band: band === 'brand' && style.palette.quiet ? 'ink' : band, side, motif, omit: [] }
  })
  return withoutRepeats(page, defs, out)
}

const showsOf = (defs: Record<SectionKey, SectionDef>, e: PageEntry): readonly Shows[] =>
  defs[e.type].archetypes[e.spec.archetype]?.shows?.(e.spec.params as never) ?? []

/**
 * Neighbouring sections never repeat content: when two in a row show the same thing (say
 * the hero's credential strip and the trust bar under it), the one where it's incidental
 * leaves it out. If neither is built around it, the later one does; if both are, both keep it.
 */
function withoutRepeats(page: readonly PageEntry[], defs: Record<SectionKey, SectionDef>, rhythm: Rhythm): Rhythm {
  const omit = new Map<SectionKey, Set<Facet>>(page.map(e => [e.type, new Set<Facet>()]))
  page.forEach((e, i) => {
    const next = page[i + 1]
    if (!next) return
    const a = showsOf(defs, e).filter(s => !omit.get(e.type)!.has(s.facet))
    const b = showsOf(defs, next)
    for (const sa of a) {
      const sb = b.find(s => s.facet === sa.facet)
      if (!sb || (sa.core && sb.core)) continue
      // The section built around it keeps it; with neither built around it, the later one drops it.
      const loser = sb.core ? e.type : next.type
      omit.get(loser)!.add(sa.facet)
    }
  })
  return Object.fromEntries(Object.entries(rhythm).map(([type, r]) => [type, { ...r!, omit: [...(omit.get(type as SectionKey) ?? [])] }]))
}
