import { contrastRatio } from '../color'
import type { HeroSpec, SiteStyle } from '../schema'
import { forSpec, ARCHETYPE_KEYS } from './archetypes'
import { textSurfaces } from './checks'
import { heroSizes } from './metrics'

export interface Score { hierarchy: number; emphasis: number; total: number }

const FILLED = new Set(['solid', 'pill', 'offset'])

/**
 * Soft score, used to rank valid candidates (never to reject). Hierarchy rewards a
 * headline 3 to 5.5 times the body size; emphasis rewards a call button that stands out.
 */
export function scoreHero(spec: HeroSpec, style: SiteStyle): Score {
  const z = heroSizes(style)
  const headline = spec.archetype === 'typeled' ? z.typeled(spec.params.scale) : z.headline
  const r = headline / 17
  const hierarchy = r >= 3 && r <= 5.5 ? 1 : Math.max(0, 1 - Math.min(Math.abs(r - 3), Math.abs(r - 5.5)) / 3)
  const { main } = textSurfaces(spec, style)
  const onBrandBand = main.bg === style.palette.brandFill
  const fill = onBrandBand ? style.palette.brandInk : style.palette.brandFill
  const button = FILLED.has(style.button) ? fill : main.link
  const emphasis = Math.min(1, contrastRatio(button, main.bg) / 6)
  return { hierarchy, emphasis, total: (hierarchy + emphasis) / 2 }
}

/** A point in "design space" for the distinctness filter. Archetype dominates. */
export function heroFeatures(spec: HeroSpec): number[] {
  const oneHot = ARCHETYPE_KEYS.map(k => (k === spec.archetype ? 1.3 : 0))
  const params = forSpec(spec, (a, p) => a.features(p)).map(x => x * 0.45)
  while (params.length < 5) params.push(0)
  return [...oneHot, ...params]
}

export const distance = (a: readonly number[], b: readonly number[]): number =>
  Math.sqrt(a.reduce((sum, v, i) => sum + (v - (b[i] ?? 0)) ** 2, 0))
