/** WCAG 2 contrast helpers, used to keep brand-coloured buttons readable. */

const WHITE = '#FFFFFF'
const BLACK = '#000000'
const AA = 4.5
/** Beyond this much darkening a brand colour stops looking like itself. */
const MAX_DARKEN = 0.3

function channels(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}

function toHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('').toUpperCase()
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export function darken(hex: string, amount: number): string {
  return toHex(channels(hex).map(c => c * (1 - amount)) as [number, number, number])
}

/**
 * Button fill and text colour for a brand colour, meeting WCAG AA.
 * Prefers white text, darkening the brand slightly if needed; light brands get black text.
 */
export function buttonColors(brand: string): { bg: string; ink: string } {
  const base = brand.toUpperCase()
  for (let amount = 0; amount <= MAX_DARKEN + 1e-9; amount += 0.02) {
    const bg = amount === 0 ? base : darken(base, amount)
    if (contrastRatio(bg, WHITE) >= AA) return { bg, ink: WHITE }
  }
  return { bg: base, ink: BLACK }
}
