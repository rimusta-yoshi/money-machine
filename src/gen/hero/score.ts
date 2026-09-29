import { contrastRatio } from '../color'
import type { HeroSpec, SiteStyle } from '../schema'
import { textSurfaces } from './checks'
import { heroSizes } from './metrics'

import type { Score } from '../core/types'
export type { Score }

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
