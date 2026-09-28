import type { ArchetypeKey, ButtonStyle, ThemeKey } from './schema'

/**
 * Themes are vectors, not labels: ranges and options that resolveSiteStyle rolls once
 * per site. Ported from reference/procedural-ui (page-builder.html + hero-generator.html).
 */

type Range = readonly [number, number]
type Fallback = 'sans-serif' | 'serif' | 'monospace'

export interface FontPair {
  display: { family: string; weight: number; fallback: Fallback }
  body: { family: string; weight: number; fallback: Fallback }
  displayUpper: boolean
  buttonUpper: boolean
}

export interface Neutrals { ground: string; surface: string; ink: string; muted: string }

export interface Theme {
  label: string
  radius: Range
  density: Range
  headScale: Range
  tracking: Range
  buttonHeight: Range
  border: Range
  fonts: readonly FontPair[]
  buttons: Partial<Record<ButtonStyle, number>>
  neutrals: Neutrals
  /** How likely each hero archetype is under this theme. */
  hero: Record<ArchetypeKey, number>
}

const pair = (
  display: [string, number, Fallback],
  body: [string, number, Fallback],
  displayUpper = false,
  buttonUpper = false,
): FontPair => ({
  display: { family: display[0], weight: display[1], fallback: display[2] },
  body: { family: body[0], weight: body[1], fallback: body[2] },
  displayUpper,
  buttonUpper,
})

export const THEMES: Record<ThemeKey, Theme> = {
  professional: {
    label: 'Professional',
    radius: [4, 8], density: [0.9, 1.1], headScale: [3.2, 4.0], tracking: [-0.02, -0.01], buttonHeight: [48, 56], border: [1, 1],
    fonts: [
      pair(['Manrope', 800, 'sans-serif'], ['Source Sans 3', 400, 'sans-serif']),
      pair(['Source Serif 4', 700, 'serif'], ['Source Sans 3', 400, 'sans-serif']),
    ],
    buttons: { solid: 0.7, outline: 0.3 },
    neutrals: { ground: '#FFFFFF', surface: '#F1F4F8', ink: '#13202F', muted: '#4F5C6B' },
    hero: { split: 3, overlay: 1, stacked: 1.5, card: 1, offset: 0.5, typeled: 1, proof: 2, contact: 2.5 },
  },
  luxury: {
    label: 'Luxury',
    radius: [0, 2], density: [1.2, 1.4], headScale: [3.6, 5.0], tracking: [-0.01, 0.01], buttonHeight: [46, 54], border: [1, 1],
    fonts: [
      pair(['Cormorant Garamond', 600, 'serif'], ['Jost', 400, 'sans-serif'], false, true),
      pair(['Bodoni Moda', 500, 'serif'], ['Jost', 400, 'sans-serif'], false, true),
    ],
    buttons: { outline: 0.55, underline: 0.45 },
    neutrals: { ground: '#EFECE6', surface: '#E6E1D8', ink: '#1E1B18', muted: '#554E45' },
    hero: { split: 1.5, overlay: 3, stacked: 2, card: 1, offset: 2.5, typeled: 1.5, proof: 0.5, contact: 0.5 },
  },
  family: {
    label: 'Family',
    radius: [12, 22], density: [1.0, 1.15], headScale: [2.9, 3.6], tracking: [-0.01, 0], buttonHeight: [50, 58], border: [2, 2],
    fonts: [
      pair(['Nunito', 800, 'sans-serif'], ['Nunito Sans', 400, 'sans-serif']),
      pair(['Fraunces', 700, 'serif'], ['Nunito Sans', 400, 'sans-serif']),
    ],
    buttons: { solid: 0.5, pill: 0.5 },
    neutrals: { ground: '#FFFFFF', surface: '#F2F6F1', ink: '#1F2F2A', muted: '#4D5C56' },
    hero: { split: 3, overlay: 1, stacked: 2, card: 2.5, offset: 0.5, typeled: 0.5, proof: 2.5, contact: 1.5 },
  },
  brutalism: {
    label: 'Brutalism',
    radius: [0, 0], density: [0.85, 1.0], headScale: [3.4, 5.2], tracking: [-0.03, -0.01], buttonHeight: [48, 60], border: [2, 3],
    fonts: [
      pair(['Archivo', 900, 'sans-serif'], ['Space Mono', 400, 'monospace'], true, true),
      pair(['Space Mono', 700, 'monospace'], ['Space Mono', 400, 'monospace'], true, true),
    ],
    buttons: { offset: 0.7, solid: 0.3 },
    neutrals: { ground: '#FFFFFF', surface: '#EAEAEA', ink: '#000000', muted: '#2A2A2A' },
    hero: { split: 2, overlay: 0.5, stacked: 1, card: 0.5, offset: 2.5, typeled: 3, proof: 1, contact: 1 },
  },
}

/** Every font family any theme can use, e.g. for loading them in the builder. */
export const ALL_FONT_FAMILIES: readonly string[] = [
  ...new Set(Object.values(THEMES).flatMap(t => t.fonts.flatMap(f => [f.display.family, f.body.family]))),
]
