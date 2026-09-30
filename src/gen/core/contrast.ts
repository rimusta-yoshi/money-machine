import { AA, contrastRatio, WHITE } from '../color'
import { THEMES } from '../themes'
import type { ButtonStyle, SiteStyle } from '../schema'
import type { Band, Check } from './types'

export interface Surface { bg: string; fg: string; muted: string; link: string }

const FILLED = new Set<ButtonStyle>(['solid', 'pill', 'offset'])

/** Worst case for text over a photo: a pure white photo under the scrim. */
export const PHOTO_WORST = (scrim: number): string => {
  const v = Math.round(255 * (1 - scrim)).toString(16).padStart(2, '0').toUpperCase()
  return `#${v}${v}${v}`
}

/** The colours text uses on each band. Mirrors the .sb-tone--* rules in the base CSS. */
export function bandSurface(band: Band, style: SiteStyle, scrim = 0.6): Surface {
  const p = style.palette
  switch (band) {
    case 'brand': return { bg: p.brandFill, fg: p.brandInk, muted: p.brandInk, link: p.brandInk }
    case 'ink': return { bg: p.ink, fg: p.ground, muted: p.ground, link: p.ground }
    case 'surface': return { bg: p.surface, fg: p.ink, muted: p.muted, link: p.brandText }
    case 'photo': return { bg: PHOTO_WORST(scrim), fg: WHITE, muted: WHITE, link: WHITE }
    default: return { bg: p.ground, fg: p.ink, muted: p.muted, link: p.brandText }
  }
}

/**
 * Every colour a filled card, chip, sticker or tile can have in this theme; their text
 * resets to ink. Open-card themes draw cards as rules, so their text keeps the band's colours.
 */
export function cardSurfaces(style: SiteStyle): Surface[] {
  if (THEMES[style.theme].cards === 'open') return []
  const p = style.palette
  return [...new Set([p.ground, p.surface, WHITE, ...p.tints])].map(bg => ({ bg, fg: p.ink, muted: p.muted, link: p.brandText }))
}

const ratio = (n: number) => `${n.toFixed(1)}:1`
const check = (id: string, label: string, value: number): Check =>
  ({ id, label, ok: value >= AA, detail: `${ratio(value)}, needs 4.5:1` })

function buttonRatio(button: ButtonStyle, s: Surface, style: SiteStyle, band: Band): number {
  const p = style.palette
  if (FILLED.has(button)) return band === 'ink' && !p.onInk ? contrastRatio(p.ground, p.ink) : contrastRatio(p.brandFill, p.brandInk)
  return contrastRatio(s.link, s.bg)
}

/** A button over a scrimmed photo keeps its fill; it gets a white edge unless the fill already stands out 3:1 from the lightest photo the scrim allows. Shared with the CSS variables. */
export const photoEdge = (fill: string): string => (contrastRatio(fill, PHOTO_WORST(0.55)) >= 3 ? fill : WHITE)

/** Which fill and edge a filled button gets on a band (mirrors the base CSS). */
function buttonShape(band: Band, style: SiteStyle): { fill: string; edge: string } {
  const p = style.palette
  if (band === 'brand') return { fill: p.brandInk, edge: p.brandInk }
  if (band === 'photo') return { fill: p.brandFill, edge: photoEdge(p.brandFill) }
  if (band === 'ink') return p.onInk ? { fill: p.brandFill, edge: p.brandFill } : { fill: p.ground, edge: p.ground }
  return { fill: p.brandFill, edge: p.brandEdge }
}

/** A filled button stands out at least 3:1 from its band, by its fill or its edge (WCAG 1.4.11). */
export function edgeCheck(band: Band, style: SiteStyle): Check {
  const bg = bandSurface(band, style).bg
  const { fill, edge } = buttonShape(band, style)
  const value = Math.max(contrastRatio(fill, bg), contrastRatio(edge, bg))
  return { id: 'button-edge', label: 'Button stands out', ok: value >= 3, detail: `${ratio(value)}, needs 3:1` }
}

export interface ContrastOpts {
  /** Whether this layout puts text on cards (checked for contrast too). */
  cards?: boolean
  /** The button style this layout draws, if any. */
  button?: ButtonStyle | null
  /** Scrim strength, for text over a photo. */
  scrim?: number
}

/** AA contrast for a section's heading, body text, links, cards and buttons on a given band. */
export function sectionContrast(style: SiteStyle, band: Band, opts: ContrastOpts = {}): Check[] {
  const main = bandSurface(band, style, opts.scrim)
  const surfaces = opts.cards ? [main, ...cardSurfaces(style)] : [main]
  const text = Math.min(...surfaces.flatMap(s => [contrastRatio(s.fg, s.bg), contrastRatio(s.muted, s.bg), contrastRatio(s.link, s.bg)]))
  const checks = [
    check('heading-contrast', 'Heading contrast', contrastRatio(main.fg, main.bg)),
    check('body-contrast', 'Body text contrast', text),
  ]
  if (opts.button) {
    checks.push(check('button-contrast', 'Button label contrast', buttonRatio(opts.button, main, style, band)))
    if (FILLED.has(opts.button)) checks.push(edgeCheck(band, style))
  }
  return checks
}
