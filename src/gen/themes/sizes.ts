import type { SiteStyle } from '../schema'
import type { Sizes, Step } from '../core/types'
import { THEMES } from './index'

/** Body copy size, shared by every theme. */
export const BODY_PX = 17

/**
 * Type sizes for a section: the site's preset, at the section's step down its ladder.
 * A step past the ladder's end stays on its smallest size.
 */
export function sizesFor(style: SiteStyle, step: Step = 0): Sizes {
  const p = THEMES[style.theme].scales[style.scale]
  const i = Math.min(step, 2)
  return { h1: p.h1[i], h1m: p.h1m[i], h2: p.h2[i], h2m: p.h2m[i], xl: p.xl[i], xlm: p.xlm[i], h3: p.h3, lead: p.lead, body: BODY_PX }
}

/** Spacing derived from the style's density. */
export function spacing(style: SiteStyle) {
  return {
    pad: Math.round(56 * style.density),
    gap: Math.round(16 * style.density),
    py: Math.round(96 * style.density),
  }
}
