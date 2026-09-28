import { buttonColors, readableOn } from './color'
import { inRange, mulberry32, pick, pickWeighted, round2 } from './rng'
import { THEMES } from './themes'
import type { SiteStyle, ThemeKey } from './schema'

const HEX = /^#[0-9a-fA-F]{6}$/

/**
 * The site's DNA, resolved once: fonts, button style, corners, spacing and a palette
 * built around the customer's brand colour. Every colour pair meets WCAG AA by
 * construction; the hero checks verify it again per candidate.
 */
export function resolveSiteStyle(theme: ThemeKey, brandColor: string, seed: number): SiteStyle {
  if (!HEX.test(brandColor)) throw new Error(`Brand colour must be a hex colour like #1E88E5, got "${brandColor}"`)
  const t = THEMES[theme]
  const r = mulberry32(Math.imul(seed, 7331) + 11)
  const fonts = pick(r, t.fonts)
  const n = t.neutrals
  const brand = brandColor.toUpperCase()
  const fill = buttonColors(brand)

  return {
    v: 1,
    theme,
    display: { ...fonts.display },
    body: { ...fonts.body },
    displayUpper: fonts.displayUpper,
    buttonUpper: fonts.buttonUpper,
    button: pickWeighted(r, t.buttons),
    radius: Math.round(inRange(r, t.radius)),
    density: round2(inRange(r, t.density)),
    headScale: round2(inRange(r, t.headScale)),
    tracking: Math.round(inRange(r, t.tracking) * 1000) / 1000,
    buttonHeight: Math.max(44, Math.round(inRange(r, t.buttonHeight))),
    border: Math.round(inRange(r, t.border)),
    palette: {
      ground: n.ground,
      surface: n.surface,
      ink: n.ink,
      muted: n.muted,
      brand,
      brandFill: fill.bg,
      brandInk: fill.ink,
      brandText: readableOn(brand, [n.ground, n.surface], n.ink),
    },
  }
}

const quote = (family: string) => (/\s/.test(family) ? `'${family}'` : family)

/** CSS font-family value for a face. Families are schema-checked, so this is safe in a style attribute. */
export const fontStack = (face: SiteStyle['display']): string => `${quote(face.family)}, ${face.fallback}`

/** Google Fonts stylesheet URL for a style's two faces (for published pages). */
export function fontStylesheetHref(style: SiteStyle): string {
  const param = (family: string, weights: number[]) =>
    `family=${family.replace(/ /g, '+')}:wght@${[...new Set(weights)].sort((a, b) => a - b).join(';')}`
  // Body weights: text, 600 for labels, 700 for buttons.
  const body = [style.body.weight, 600, 700]
  const faces = style.display.family === style.body.family
    ? [param(style.body.family, [...body, style.display.weight])]
    : [param(style.display.family, [style.display.weight]), param(style.body.family, body)]
  return `https://fonts.googleapis.com/css2?${faces.join('&')}&display=swap`
}
