import { AA, contrastRatio } from '../color'
import type { ButtonStyle, SiteStyle } from '../schema'
import type { Band, Check } from './types'

export interface Surface { bg: string; fg: string; muted: string; link: string }

const FILLED = new Set<ButtonStyle>(['solid', 'pill', 'offset'])

/** The colours text uses on each band. Mirrors the .sb-tone--* rules in the base CSS. */
export function bandSurface(band: Band, style: SiteStyle): Surface {
  const p = style.palette
  switch (band) {
    case 'brand': return { bg: p.brandFill, fg: p.brandInk, muted: p.brandInk, link: p.brandInk }
    case 'ink': return { bg: p.ink, fg: p.ground, muted: p.ground, link: p.ground }
    case 'surface': return { bg: p.surface, fg: p.ink, muted: p.muted, link: p.brandText }
    default: return { bg: p.ground, fg: p.ink, muted: p.muted, link: p.brandText }
  }
}

/** Cards sit on ground, or on surface when the band itself is ground. Their text resets to ink. */
export function cardSurface(band: Band, style: SiteStyle): Surface {
  const p = style.palette
  const bg = band === 'ground' ? p.surface : p.ground
  return { bg, fg: p.ink, muted: p.muted, link: p.brandText }
}

const ratio = (n: number) => `${n.toFixed(1)}:1`
const check = (id: string, label: string, value: number): Check =>
  ({ id, label, ok: value >= AA, detail: `${ratio(value)}, needs 4.5:1` })

function buttonRatio(button: ButtonStyle, s: Surface, style: SiteStyle): number {
  if (FILLED.has(button)) return contrastRatio(style.palette.brandFill, style.palette.brandInk)
  return contrastRatio(s.link, s.bg)
}

/** AA contrast for a section's heading, body text, links, cards and buttons on a given band. */
export function sectionContrast(style: SiteStyle, band: Band, opts: { cards?: boolean; button?: ButtonStyle | null } = {}): Check[] {
  const main = bandSurface(band, style)
  const surfaces = opts.cards ? [main, cardSurface(band, style)] : [main]
  const text = Math.min(...surfaces.flatMap(s => [contrastRatio(s.fg, s.bg), contrastRatio(s.muted, s.bg), contrastRatio(s.link, s.bg)]))
  const checks = [
    check('heading-contrast', 'Heading contrast', contrastRatio(main.fg, main.bg)),
    check('body-contrast', 'Body text contrast', text),
  ]
  if (opts.button) checks.push(check('button-contrast', 'Button label contrast', buttonRatio(opts.button, main, style)))
  return checks
}
