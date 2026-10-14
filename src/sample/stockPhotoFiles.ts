import { PACKS } from '../packs'
import type { TradeId } from '../packs'
import { SHARED_PHOTOS } from '../packs/sharedPhotos'

/**
 * The builder's stock photos (reference/sample-photos, see its LICENCE.md): file, alt text,
 * the trade each shows, and whether it works as a hero. They come from each business type's
 * pack (src/packs/business), then the shared ones. Its own module so the API worker can list
 * the files without any browser code.
 */
export interface StockPhoto {
  file: string
  alt: string
  /** The trade whose work it shows; 'any' for photos that suit every trade. */
  trade: TradeId | 'any'
  /** Landscape and uncluttered enough for a hero. */
  hero?: true
}

const entry = (trade: TradeId | 'any', p: { file: string; alt: string; hero?: true }): StockPhoto =>
  ({ file: p.file, alt: p.alt, trade, ...(p.hero ? { hero: p.hero } : {}) })

export const STOCK_PHOTOS: readonly StockPhoto[] = [
  ...PACKS.flatMap(pack => pack.photos.map(p => entry(pack.id, p))),
  ...SHARED_PHOTOS.map(p => entry('any', p)),
]

/** The files to upload to storage (see server/README.md). */
export const STOCK_PHOTO_FILES: readonly string[] = [...new Set(STOCK_PHOTOS.map(p => p.file))]

/** How many sample photos a builder shows: a hero, an about photo and a gallery. */
export const SAMPLE_SET_SIZE = 8

/**
 * One builder's sample photos: hero, about, then the gallery, all matching its trade
 * (topped up with photos that suit any trade). `seed` picks the hero and the order, so two
 * builders of the same trade rarely look alike, while one builder keeps the same set.
 */
export function stockSetFor(trade: TradeId, seed: number): StockPhoto[] {
  const own = STOCK_PHOTOS.filter(p => p.trade === trade)
  const pool = [...own, ...STOCK_PHOTOS.filter(p => p.trade === 'any')].slice(0, Math.max(SAMPLE_SET_SIZE, own.length))
  if (!pool.length) return []
  const s = Math.abs(Math.floor(seed)) >>> 0
  const heroes = pool.filter(p => p.hero)
  const hero = heroes.length ? heroes[s % heroes.length] : pool[0]
  const rest = pool.filter(p => p !== hero)
  const turn = rest.length ? (s >>> 3) % rest.length : 0
  return [hero, ...rest.slice(turn), ...rest.slice(0, turn)].slice(0, Math.max(SAMPLE_SET_SIZE, own.length))
}
