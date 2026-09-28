import { buttonColors, contrastRatio } from './contrast'

export { buttonColors, contrastRatio }

export const AA = 4.5

const channels = (hex: string): number[] => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))

/** Linear blend of two hex colours; t = 0 gives a, t = 1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const [x, y] = [channels(a), channels(b)]
  return '#' + x
    .map((v, i) => Math.round(Math.max(0, Math.min(255, v + (y[i] - v) * t))).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

/**
 * The brand colour pulled toward `toward` just far enough to reach AA on every background.
 * Used for links, stars and outline buttons.
 */
export function readableOn(brand: string, backgrounds: readonly string[], toward: string): string {
  const ok = (c: string) => backgrounds.every(bg => contrastRatio(c, bg) >= AA)
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const shade = mix(brand, toward, t)
    if (ok(shade)) return shade
  }
  return toward
}
