import { AA, BLACK, contrastRatio, WHITE } from './color'
import type { Palette } from './schema'
import type { Neutrals } from './themes/types'

/**
 * Colour roles for the customer's brand colour: always used, never trusted for
 * readability.
 * - Large shapes (the loud band, stripes, rules, blobs, button fills) use the exact colour.
 * - A button's label is black or white, whichever reads at 4.5:1 on the exact colour; a
 *   button that stands out less than 3:1 from its background gets an edge in a darker (or
 *   lighter) shade of the same hue.
 * - Text in the brand colour uses a shade of the same hue tuned to 4.5:1 on every
 *   background it can sit on.
 * - A colour that barely differs from the theme's ground (under 1.5:1) is "quiet": it only
 *   appears on contrasting bands and tints, never as a shape on the ground itself.
 */

export const NON_TEXT = 3
export const QUIET = 1.5

type Hsl = [number, number, number]

function toHsl(hex: string): Hsl {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

function fromHsl([h, s, l]: Hsl): string {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return '#' + [f(0), f(8), f(4)].map(x => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()
}

/** The hue of a colour in degrees, or null for greys. */
export const hueOf = (hex: string): number | null => {
  const [h, s] = toHsl(hex)
  return s < 0.08 ? null : h
}

const luminance = (hex: string) => contrastRatio(hex, BLACK) / 21

/**
 * The same hue, only lighter or darker, just far enough to reach `target` against every
 * background. Moves away from the backgrounds (darker on light grounds, lighter on dark).
 */
export function shadeFor(colour: string, backgrounds: readonly string[], target: number): string {
  const ok = (c: string) => backgrounds.every(bg => contrastRatio(c, bg) >= target)
  if (ok(colour)) return colour
  const [h, s, l] = toHsl(colour)
  const lightBgs = backgrounds.reduce((sum, bg) => sum + luminance(bg), 0) / backgrounds.length > 0.18
  for (let step = 1; step <= 100; step++) {
    const next = lightBgs ? l - (l * step) / 100 : l + ((1 - l) * step) / 100
    const c = fromHsl([h, s, next])
    if (ok(c)) return c
  }
  return lightBgs ? BLACK : WHITE
}

export interface BrandRoles {
  /** The exact colour, for fills and large shapes. */
  brandFill: string
  /** Label on the fill: black or white (as the theme sets them), whichever reads at 4.5:1. */
  brandInk: string
  /** A same-hue edge for buttons that don't stand out 3:1 from the ground or surface; the fill itself when they do. */
  brandEdge: string
  /** Text in the brand colour, tuned to 4.5:1 on ground, surface and tints. */
  brandText: string
  /** Decorative accents on the ground: the exact colour, or the tuned shade when the colour is quiet. */
  accent: string
  /** The colour is under 1.5:1 against the ground, so it only goes on contrasting bands and tints. */
  quiet: boolean
  /** Anything was adjusted, so the builder can say so. */
  tuned: boolean
}

/**
 * The roles for one theme. `labels` are the theme's own black and white (e.g. a warm
 * near-black), tried first; pure black and white are always a fallback, and one of the two
 * always reaches 4.5:1 on any colour.
 */
export function brandRoles(brand: string, n: { ground: string; surface: string }, tints: readonly string[], labels: readonly string[]): BrandRoles {
  const fill = brand.toUpperCase()
  const candidates = [...labels, BLACK, WHITE]
  const passing = candidates.filter(c => contrastRatio(c, fill) >= AA)
  const brandInk = passing[0] ?? [BLACK, WHITE].sort((a, b) => contrastRatio(b, fill) - contrastRatio(a, fill))[0]
  const grounds = [n.ground, n.surface]
  const brandEdge = shadeFor(fill, [...grounds, ...tints], NON_TEXT)
  const brandText = shadeFor(fill, [...grounds, ...tints], AA)
  const quiet = contrastRatio(fill, n.ground) < QUIET
  const accent = quiet ? brandText : fill
  return { brandFill: fill, brandInk, brandEdge, brandText, accent, quiet, tuned: quiet || brandText !== fill || brandEdge !== fill }
}

/**
 * A theme's full palette: its neutrals, its tile colours, and the brand roles. `labels`
 * are the theme's own black and white, in the order it prefers them; `cards` are any other
 * backgrounds brand text can land on (e.g. white cards on a cream ground).
 */
export function rolePalette(brand: string, n: Neutrals, tints: readonly string[], labels: readonly string[], cards: readonly string[] = []): Palette {
  const roles = brandRoles(brand, n, [...tints, ...cards], labels)
  return { ...n, brand: brand.toUpperCase(), ...roles, onInk: contrastRatio(roles.brandFill, n.ink) >= NON_TEXT, tints: [...tints] }
}
