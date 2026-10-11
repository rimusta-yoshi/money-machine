import { generateOptions, resolveSiteStyle, sectionBatch, sectionPresent, SECTION_KEYS, SECTIONS, THEME_KEYS, viewOf } from '../gen'
import type { PageContent, PagePhoto, SectionKey, ThemeKey } from '../gen'
import { createDomMeasurer } from '../gen/dom/measure'
import { samplePhotos } from '../sample/photos'
import { loadStockPhotos } from '../sample/stockPhotos'
import { STOCK_PHOTOS } from '../sample/stockPhotoFiles'
import { trades } from '../trades'
import type { TradeConfig } from '../types'
import { sampleFor, tradeContent } from './build'

/**
 * The stress test (npm run stress): every trade × theme × content shape × many seeds, each
 * section generated exactly as the builder does it (real DOM measurer, real fonts). Every
 * section must offer at least MIN_SHOWN options, none may throw, and every shown option has
 * passed every hard check in this browser. Sharded so several pages can run side by side.
 */

export const MIN_SHOWN = 3

/** Content shapes: what real customers' pages look like at the edges. */
export const SHAPES = ['no-photo', 'photos-1', 'photos-7', 'photos-12', 'long-name', 'empty-optional', 'rich'] as const
export type Shape = typeof SHAPES[number]

/** The brand colour a stress seed uses: awkward ones included. */
export const stressBrand = (seed: number): string => BRANDS[seed % BRANDS.length]

const BRANDS = ['#1E88E5', '#FFE500', '#0B2545', '#E8743B', '#777777', '#FFFFFF', '#000000', '#7FDBFF', '#C9A96E', '#15803D']

const LONG_NAME = 'Wolstenholme-Fitzpatrick Property Repairs'.slice(0, 40)
const LONG_PLACE = 'Bradford-on-Avon and Trowbridge'

/** `n` photos from the pool (turned by the seed, so different photos land in each slot), with plain alt text. */
function photos(pool: readonly PagePhoto[], n: number, seed: number): PagePhoto[] {
  return Array.from({ length: n }, (_, i) => ({ url: pool[(i + seed) % pool.length].url, alt: `Finished job number ${i + 1}` }))
}

/**
 * The trade's real sample photos (landscape and portrait), as the builder shows them; drawn
 * placeholders where they can't be loaded.
 */
export async function photoPool(trade: TradeConfig): Promise<PagePhoto[]> {
  const own = await loadStockPhotos(STOCK_PHOTOS.filter(p => p.trade === trade.id || p.trade === 'any'))
  return own ?? samplePhotos()
}

/** A page after the basics step (name, phone, place), shaped for one edge case. */
export function shapeContent(trade: TradeConfig, theme: ThemeKey, shape: Shape, seed = 1, pool: readonly PagePhoto[] = samplePhotos()): PageContent {
  const basics: PageContent = {
    ...tradeContent(trade),
    business: { name: 'Hartley & Sons', phone: '01632 960 123', tel: 'tel:01632960123', email: '', location: 'Harrogate', about: '', years: '' },
  }
  const withPhotos = (n: number): PageContent => ({ ...basics, photos: { hero: photos(pool, 1, seed)[0], about: photos(pool, 2, seed)[1], gallery: photos(pool, n, seed + 2) } })
  switch (shape) {
    case 'no-photo': return basics
    case 'photos-1': return withPhotos(1)
    case 'photos-7': return withPhotos(7)
    case 'photos-12': return withPhotos(12)
    case 'long-name': return { ...withPhotos(7), business: { ...basics.business, name: LONG_NAME, location: LONG_PLACE } }
    case 'empty-optional': return { ...basics, business: { ...basics.business, location: '' } }
    case 'rich': return richContent(sampleFor(trade, photos(pool, 8, seed), theme), seed, pool)
  }
}

const cycle = <T>(items: readonly T[], n: number): T[] => Array.from({ length: n }, (_, i) => items[i % items.length])

/**
 * Sample content with list lengths that change with the seed, across every length the
 * builder allows: 1–8 services and credentials, 1–12 reviews, 1–6 why-us lines, 1–16 areas,
 * 0–12 gallery photos. Where grids leave a lone item, this finds it.
 */
function richContent(c: PageContent, seed: number, pool: readonly PagePhoto[]): PageContent {
  const n = (max: number, salt: number) => 1 + ((seed * 7 + salt * 13) % max)
  const reviews = cycle(c.reviews, n(12, 1)).map((r, i) => ({ ...r, author: `${r.author} ${i + 1}` }))
  const services = cycle(['Leak repairs', 'Boiler servicing', 'Bathroom fitting', 'Radiators', 'Tap repairs', 'Power flushing', 'Outside taps', 'Emergency call-outs'], n(8, 2))
  return {
    ...c,
    trade: { ...c.trade, services },
    badges: cycle(['Fully insured', 'Gas Safe registered', '12-month guarantee', 'Free quotes', 'Local family firm', 'Which? Trusted', 'DBS checked', 'Tidy work'], n(8, 3)),
    reviews,
    rating: { score: 4.8, count: reviews.length * 7 },
    whyUs: cycle(c.whyUs, n(6, 4)),
    areas: cycle(['Harrogate', 'Knaresborough', 'Ripon', 'Pannal', 'Wetherby', 'Boroughbridge', 'Pateley Bridge', 'Killinghall'], n(16, 5)).map((a, i) => (i < 8 ? a : `${a} North`)),
    photos: { ...c.photos, gallery: photos(pool, (seed * 5) % 13, seed + 2) },
  }
}

export interface StressCase { trade: string; theme: ThemeKey; shape: Shape; seed: number }
export interface StressFailure extends StressCase {
  section: SectionKey
  shown: number
  /** Why candidates were rejected, by check id. */
  rejected: Record<string, number>
  error?: string
  ms: number
}

/** Every case in the matrix, in a stable order, so shards split it the same way every run. */
export function stressCases(seeds: number, filter: { trade?: string; theme?: string; shape?: string } = {}): StressCase[] {
  const out: StressCase[] = []
  for (const trade of trades) for (const theme of THEME_KEYS) for (const shape of SHAPES) for (let seed = 1; seed <= seeds; seed++) {
    if (filter.trade && filter.trade !== trade.id) continue
    if (filter.theme && filter.theme !== theme) continue
    if (filter.shape && filter.shape !== shape) continue
    out.push({ trade: trade.id, theme, shape, seed })
  }
  return out
}

export interface StressState {
  done: boolean
  progress: string
  cases: number
  sections: number
  failures: StressFailure[]
  slowest: { where: string; ms: number }[]
  /** Where shown options came from: the normal batch, or a step down the ladder (see generateOptions). */
  tiers: Record<string, number>
  /** Rejections across every case, by section/archetype/check, with an example. */
  rejects: Record<string, { n: number; example: string }>
  errors: string[]
}

declare global { interface Window { __stress?: StressState } }

const tick = () => new Promise(r => setTimeout(r, 0))

export async function runStress(cases: readonly StressCase[], sections: readonly SectionKey[] = SECTION_KEYS) {
  const state: StressState = { done: false, progress: '', cases: 0, sections: 0, failures: [], slowest: [], tiers: {}, rejects: {}, errors: [] }
  window.__stress = state
  const measurer = createDomMeasurer(document)
  const pools = new Map<string, PagePhoto[]>()
  try {
    for (const c of cases) {
      const trade = trades.find(t => t.id === c.trade)!
      if (!pools.has(trade.id)) pools.set(trade.id, await photoPool(trade))
      const brand = stressBrand(c.seed)
      const style = resolveSiteStyle(c.theme, brand, c.seed)
      const content = shapeContent(trade, c.theme, c.shape, c.seed, pools.get(trade.id))
      await measurer.prepare(style, content)
      for (const type of sections) {
        if (!sectionPresent(type, content)) continue
        const t0 = performance.now()
        const failure = (shown: number, rejected: Record<string, number>, error?: string): StressFailure =>
          ({ ...c, section: type, shown, rejected, error, ms: Math.round(performance.now() - t0) })
        try {
          const errors: string[] = []
          const o = generateOptions(SECTIONS[type], {
            batchSeed: sectionBatch(c.seed, type), content: viewOf(type, content), style, measurer,
            onError: e => errors.push(`seed ${e.seed} ${JSON.stringify(e.spec)}: ${String((e.error as Error)?.stack ?? e.error)}`),
          })
          for (const s of o.shown) state.tiers[s.tier ?? 'batch'] = (state.tiers[s.tier ?? 'batch'] ?? 0) + 1
          const rejected: Record<string, number> = {}
          for (const r of o.rejected) for (const x of r.checks) if (!x.ok) {
            rejected[x.id] = (rejected[x.id] ?? 0) + 1
            const key = `${type}/${r.spec.archetype}/${x.id}`
            const seen = state.rejects[key] ??= { n: 0, example: `${c.trade}/${c.theme}/${c.shape}/${c.seed}: ${x.detail}` }
            seen.n++
          }
          const bad = o.shown.filter(s => s.tier === 'forced' || s.checks.some(x => !x.ok))
          const problem = errors.length ? `${errors.length} candidate(s) threw: ${errors[0]}` : bad.length ? `${bad.length} shown option(s) failing a check` : undefined
          if (o.shown.length < MIN_SHOWN || problem) state.failures.push(failure(o.shown.length, rejected, problem))
        } catch (err) {
          state.failures.push(failure(0, {}, String((err as Error)?.stack ?? err)))
        }
        const ms = performance.now() - t0
        state.slowest.push({ where: `${c.trade}/${c.theme}/${c.shape}/${c.seed}/${type}`, ms: Math.round(ms) })
        state.slowest = state.slowest.sort((a, b) => b.ms - a.ms).slice(0, 10)
        state.sections++
      }
      state.cases++
      state.progress = `${state.cases}/${cases.length} cases, ${state.failures.length} failures`
      await tick()
    }
  } catch (err) {
    state.errors.push(String((err as Error)?.stack ?? err))
  } finally {
    measurer.dispose()
    state.done = true
  }
}
