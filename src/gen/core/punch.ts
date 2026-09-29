import { inRange, pick } from '../rng'
import type { Rng } from '../rng'
import type { SiteStyle } from '../schema'
import { THEMES } from '../themes'
import type { Align, Asym, Biome, Bleed, Break, Crop, Motif } from '../themes/types'
import type { AnySpec, Check, SectionDef, SectionKey } from './types'

/**
 * Punch parameters: the bold moves (asymmetry, scale, overlap, rotation, motifs, crops,
 * breaks, alignment). Archetypes roll them with these helpers, always inside the theme's
 * ranges, and store them under fixed param names so one check can hold any spec to its
 * theme: `asym`, `align`, `crop`, `bleed`, `brk`, `rot`, `motif`.
 */

/** Picks from the theme's allowed values that this layout supports; `null` if none overlap. */
function within<T>(r: Rng, allowed: readonly T[], supported: readonly T[]): T | null {
  const both = supported.filter(v => allowed.includes(v))
  return both.length ? pick(r, both) : null
}

export const rollAsym = (r: Rng, t: Biome, supported: readonly Asym[] = t.punch.asym): Asym =>
  within(r, t.punch.asym, supported) ?? t.punch.asym[0]
export const rollAlign = (r: Rng, t: Biome, supported: readonly Align[]): Align =>
  within(r, t.punch.align, supported) ?? t.punch.align[0]
export const rollCrop = (r: Rng, t: Biome, supported: readonly Crop[] = t.punch.crop): Crop =>
  within(r, t.punch.crop, supported) ?? t.punch.crop[0]
export const rollBleed = (r: Rng, t: Biome): Bleed => pick(r, t.punch.bleed)
export const rollBreak = (r: Rng, t: Biome, supported: readonly Break[] = t.punch.breaks, bandBias = 0.55): Break => {
  const options = supported.filter(b => t.punch.breaks.includes(b))
  if (!options.length) return 'band'
  return options.includes('band') && r() < bandBias ? 'band' : pick(r, options)
}

/** A signed rotation in whole degrees, or 0 in themes where nothing rotates. */
export function rollRot(r: Rng, t: Biome): number {
  const [lo, hi] = t.punch.rotation
  if (hi === 0) return 0
  return (r() < 0.5 ? -1 : 1) * Math.round(inRange(r, [lo, hi]))
}

/** One of the motifs this layout can draw that the theme allows here, or 'none' now and then. */
export function rollMotif(r: Rng, t: Biome, section: SectionKey, supported: readonly Motif[], none = 0.2): Motif {
  const options = supported.filter(m => m !== 'none' && t.motifs[m as Exclude<Motif, 'none'>]?.sections.includes(section))
  if (!options.length || r() < none) return 'none'
  return pick(r, options)
}

/** Whether the theme offers any of these motifs in this section. */
export const hasMotif = (t: Biome, section: SectionKey, motifs: readonly Motif[]): boolean =>
  motifs.some(m => m !== 'none' && !!t.motifs[m as Exclude<Motif, 'none'>]?.sections.includes(section))

/** The text column's share of 12 columns for an asymmetry. */
export const textSpan = (a: Asym): number => Number(a.split('/')[0])

/* eslint-disable @typescript-eslint/no-explicit-any -- params are per section; this check reads the shared punch keys only */
type AnyDef = SectionDef<any, any>

/** Why a spec falls outside its theme, or null if it is inside. */
export function outsideTheme(def: AnyDef, spec: AnySpec, style: SiteStyle): string | null {
  const t = THEMES[style.theme]
  if (spec.archetype === def.fallback.archetype && JSON.stringify(spec.params) === JSON.stringify(def.fallback.params)) return null
  if (!((def.weights[style.theme]?.[spec.archetype] ?? 0) > 0)) return `${t.label} doesn’t use this layout`
  const p = spec.params as Record<string, unknown>
  const bad = (key: string, allowed: readonly unknown[]) => key in p && !allowed.includes(p[key])
  if (bad('asym', t.punch.asym)) return `${t.label} doesn’t use a ${String(p.asym)} split`
  if (bad('align', t.punch.align)) return `${t.label} doesn’t align this way`
  if (bad('crop', t.punch.crop)) return `${t.label} doesn’t crop photos ${String(p.crop)}`
  if (bad('bleed', t.punch.bleed)) return `${t.label} doesn’t bleed photos off the edge`
  if (bad('brk', t.punch.breaks)) return `${t.label} doesn’t break sections this way`
  if ('rot' in p) {
    const a = Math.abs(Number(p.rot))
    const [lo, hi] = t.punch.rotation
    if (a !== 0 && (a < lo || a > hi)) return hi === 0 ? `${t.label} never rotates anything` : `rotation outside ${lo}–${hi}°`
  }
  if (def.archetypes[spec.archetype].allows && !def.archetypes[spec.archetype].allows!(spec.params as never, t)) return `${t.label} doesn’t draw this layout that way`
  if ('motif' in p && p.motif !== 'none') {
    const rule = t.motifs[p.motif as Exclude<Motif, 'none'>]
    if (!rule || !rule.sections.includes(def.type)) return `${t.label} doesn’t use this motif here`
  }
  return null
}

/** The hard check: everything in the spec is something its theme allows. */
export function themeCheck(def: AnyDef, spec: AnySpec, style: SiteStyle): Check {
  const why = outsideTheme(def, spec, style)
  return { id: 'theme-fit', label: 'Fits the theme', ok: why === null, detail: why ?? `inside ${THEMES[style.theme].label}’s ranges` }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
