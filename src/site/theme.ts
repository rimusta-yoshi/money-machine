import type { CSSProperties } from 'react'
import { buttonColors, contrastRatio, darken } from './contrast'

const AA = 4.5

/** The brand colour, darkened only as far as needed to be readable as small text on white. */
export function textOnWhite(brand: string): string {
  const base = brand.toUpperCase()
  for (let amount = 0; amount < 1; amount += 0.02) {
    const shade = amount === 0 ? base : darken(base, amount)
    if (contrastRatio(shade, '#FFFFFF') >= AA) return shade
  }
  return '#000000'
}

/** CSS variables for a site's colours. Every text/background pair meets WCAG AA. */
export function siteTheme(brand: string, navy: string): CSSProperties {
  const btn = buttonColors(brand)
  return {
    '--accent': brand,
    '--accent-ink': textOnWhite(brand),
    '--btn-bg': btn.bg,
    '--btn-ink': btn.ink,
    '--navy': navy,
  } as CSSProperties
}
