/** Seeded randomness. Same seed, same sequence, on every platform. */

export type Rng = () => number

/** mulberry32: a small, fast 32-bit PRNG (as in the procedural-ui prototype). */
export function mulberry32(seed: number): Rng {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const inRange = (r: Rng, [lo, hi]: readonly [number, number]): number => lo + (hi - lo) * r()

export function pick<T>(r: Rng, items: readonly T[]): T {
  return items[Math.floor(r() * items.length)]
}

/** Picks a key with probability proportional to its weight. Zero weights are never picked. */
export function pickWeighted<K extends string>(r: Rng, weights: Partial<Record<K, number>>): K {
  const entries = (Object.entries(weights) as [K, number][]).filter(([, w]) => w > 0)
  if (entries.length === 0) throw new Error('pickWeighted needs at least one positive weight')
  const total = entries.reduce((sum, [, w]) => sum + w, 0)
  let x = r() * total
  for (const [key, w] of entries) {
    x -= w
    if (x <= 0) return key
  }
  return entries[entries.length - 1][0]
}

/** A well-mixed 32-bit seed from two numbers, e.g. a batch seed and a candidate index. */
export function mixSeeds(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x27d4eb2d, 0xc2b2ae35)
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return (h ^ (h >>> 16)) >>> 0
}

/** FNV-1a hash of a string, for deriving stable seeds from ids. */
export function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** A fresh random seed. Works in browsers, Node and Workers. */
export function randomSeed(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0]
}

export const round2 = (n: number): number => Math.round(n * 100) / 100
