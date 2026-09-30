import { hashString, resolveSiteStyle } from '../gen'
import type { LegacyThemeKey, ThemeKey } from '../gen'
import { mixSeeds } from '../gen/rng'
import type { TradeId } from '../types'
import type { SiteStyleRecord } from './schema'

/** Starting theme per trade. The customer can switch in the builder. */
export const DEFAULT_THEME: Record<TradeId, ThemeKey> = {
  plumber: 'clean-pro',
  electrician: 'workwear',
  roofer: 'workwear',
  painter: 'craft-heritage',
  landscaper: 'friendly-local',
}

/**
 * Where a record's old theme lands. Nobody could pick a theme before the biomes, so every
 * stored theme was its trade's default: sites move to their trade's new default. The
 * closest look is the fallback for a theme that wasn't its trade's default.
 */
const NEAREST: Record<LegacyThemeKey, ThemeKey> = {
  professional: 'clean-pro',
  luxury: 'craft-heritage',
  family: 'friendly-local',
  brutalism: 'workwear',
}
/** The theme each trade had before any theme could be picked. */
export const OLD_DEFAULT: Record<TradeId, LegacyThemeKey> = {
  plumber: 'professional', electrician: 'professional', roofer: 'professional', painter: 'family', landscaper: 'family',
}
export const migrateTheme = (tradeId: TradeId, old: LegacyThemeKey): ThemeKey =>
  old === OLD_DEFAULT[tradeId] ? DEFAULT_THEME[tradeId] : NEAREST[old]

/** The stored style record: the inputs plus the resolved result. */
export function styleRecord(theme: ThemeKey, brandColor: string, seed: number): SiteStyleRecord {
  return { theme, seed, resolved: resolveSiteStyle(theme, brandColor, seed) }
}

/** The hero's first batch seed, derived from the site's style seed so a new site is reproducible. */
export const firstHeroBatch = (styleSeed: number): number => mixSeeds(styleSeed, hashString('hero'))
