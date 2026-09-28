import { hashString, resolveSiteStyle } from '../gen'
import type { ThemeKey } from '../gen'
import { mixSeeds } from '../gen/rng'
import type { TradeId } from '../types'
import type { SiteStyleRecord } from './schema'

/** Starting theme per trade. Customers can't change it yet. */
export const DEFAULT_THEME: Record<TradeId, ThemeKey> = {
  plumber: 'professional',
  electrician: 'professional',
  roofer: 'professional',
  painter: 'family',
  landscaper: 'family',
}

/** The stored style record: the inputs plus the resolved result. */
export function styleRecord(theme: ThemeKey, brandColor: string, seed: number): SiteStyleRecord {
  return { theme, seed, resolved: resolveSiteStyle(theme, brandColor, seed) }
}

/** The hero's first batch seed, derived from the site's style seed so a new site is reproducible. */
export const firstHeroBatch = (styleSeed: number): number => mixSeeds(styleSeed, hashString('hero'))
