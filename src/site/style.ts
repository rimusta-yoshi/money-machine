import { hashString, resolveSiteStyle } from '../gen'
import type { LegacyThemeKey, ThemeKey } from '../gen'
import { mixSeeds } from '../gen/rng'
import { PACKS } from '../packs'
import type { TradeId } from '../packs'
import type { SiteStyleRecord } from './schema'

/** Starting theme per trade (its pack's `look.theme`). The customer can switch in the builder. */
export const DEFAULT_THEME = Object.fromEntries(PACKS.map(p => [p.id, p.look.theme])) as Record<TradeId, ThemeKey>

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
const LEGACY_OF = Object.fromEntries(Object.entries(NEAREST).map(([old, now]) => [now, old])) as Record<ThemeKey, LegacyThemeKey>
/**
 * The theme each trade had before any theme could be picked (its pack's `look.legacyTheme`).
 * Types added since never had one; theirs is simply the old look nearest their default.
 */
export const OLD_DEFAULT = Object.fromEntries(PACKS.map(p => [p.id, p.look.legacyTheme ?? LEGACY_OF[p.look.theme]])) as Record<TradeId, LegacyThemeKey>
export const migrateTheme = (tradeId: TradeId, old: LegacyThemeKey): ThemeKey =>
  old === OLD_DEFAULT[tradeId] ? DEFAULT_THEME[tradeId] : NEAREST[old]

/** The stored style record: the inputs plus the resolved result. */
export function styleRecord(theme: ThemeKey, brandColor: string, seed: number): SiteStyleRecord {
  return { theme, seed, resolved: resolveSiteStyle(theme, brandColor, seed) }
}

/** The hero's first batch seed, derived from the site's style seed so a new site is reproducible. */
export const firstHeroBatch = (styleSeed: number): number => mixSeeds(styleSeed, hashString('hero'))
