import type { ThemeKey } from '../schema'
import { cleanPro } from './cleanPro'
import { craftHeritage } from './craftHeritage'
import { friendlyLocal } from './friendlyLocal'
import type { Biome } from './types'
import { workwear } from './workwear'

export type { Biome } from './types'

/** Every theme, by key. Order is the picker's order. */
export const THEMES: Record<ThemeKey, Biome> = {
  workwear,
  'clean-pro': cleanPro,
  'craft-heritage': craftHeritage,
  'friendly-local': friendlyLocal,
}

/** Every theme's component skin. Include once per page with the section CSS. */
export const THEME_CSS = Object.values(THEMES).map(t => t.css).join('\n')

/** Every font face any theme uses, e.g. for loading them in the builder. */
export const ALL_FONT_FAMILIES: readonly string[] = [
  ...new Set(Object.values(THEMES).flatMap(t => [t.fonts.display.family, t.fonts.body.family, t.fonts.label.family])),
]
