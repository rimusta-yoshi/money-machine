import { inRange, mulberry32, pick, pickWeighted, round2 } from './rng'
import { THEMES } from './themes'
import type { SiteStyle, ThemeKey } from './schema'

const HEX = /^#[0-9a-fA-F]{6}$/

/**
 * The site's look, resolved once per style seed: the theme's fonts, a rolled ground
 * variant, type preset, button style, corners and spacing, and a palette built around
 * the customer's brand colour. Every text/background pair meets WCAG AA by construction;
 * the section checks verify it again per candidate. "Re-roll site style" is a new seed.
 */
export function resolveSiteStyle(theme: ThemeKey, brandColor: string, seed: number): SiteStyle {
  if (!HEX.test(brandColor)) throw new Error(`Brand colour must be a hex colour like #1E88E5, got "${brandColor}"`)
  const t = THEMES[theme]
  const r = mulberry32(Math.imul(seed, 7331) + 11)
  const neutrals = pick(r, t.grounds)
  const scaleIdx = pickWeighted(r, { 0: t.scaleWeights[0], 1: t.scaleWeights[1], 2: t.scaleWeights[2] })
  return {
    v: 2,
    theme,
    fonts: { display: { ...t.fonts.display }, body: { ...t.fonts.body }, label: { ...t.fonts.label } },
    scale: Number(scaleIdx),
    button: pickWeighted(r, t.buttons),
    radius: Math.round(inRange(r, t.radius)),
    density: round2(inRange(r, t.density)),
    palette: t.palette(brandColor.toUpperCase(), neutrals),
  }
}
