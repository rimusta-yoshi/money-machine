import { buttonColors, contrastRatio } from './contrast'

export { buttonColors, contrastRatio }

export const AA = 4.5
export const WHITE = '#FFFFFF'
export const BLACK = '#000000'

const channels = (hex: string): number[] => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))

/** Linear blend of two hex colours; t = 0 gives a, t = 1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const [x, y] = [channels(a), channels(b)]
  return '#' + x
    .map((v, i) => Math.round(Math.max(0, Math.min(255, v + (y[i] - v) * t))).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

/** The first blend of `from` toward `toward` (in 2.5% steps) that passes `ok`, or `toward` itself. */
export function blendUntil(from: string, toward: string, ok: (c: string) => boolean, maxT = 1): string {
  for (let t = 0; t <= maxT + 1e-9; t += 0.025) {
    const c = mix(from, toward, t)
    if (ok(c)) return c
  }
  return toward
}

/**
 * The brand colour pulled toward `toward` just far enough to reach AA on every background.
 * Used for links, stars, accents and outline buttons.
 */
export function readableOn(brand: string, backgrounds: readonly string[], toward: string): string {
  return blendUntil(brand, toward, c => backgrounds.every(bg => contrastRatio(c, bg) >= AA))
}

/** Whichever of the candidates reads best on a background. */
export const bestOn = (bg: string, candidates: readonly string[]): string =>
  [...candidates].sort((a, b) => contrastRatio(b, bg) - contrastRatio(a, bg))[0]
