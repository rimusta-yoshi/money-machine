import { z } from 'zod'

/**
 * Stored shapes for generated output. Everything here ends up in HTML attributes or
 * CSS custom properties, so every string is locked to a safe pattern or an enum.
 */

export const THEME_KEYS = ['workwear', 'clean-pro', 'craft-heritage', 'friendly-local'] as const
export type ThemeKey = typeof THEME_KEYS[number]

/** Themes before the biomes (site records up to v3). */
export const LEGACY_THEME_KEYS = ['professional', 'luxury', 'family', 'brutalism'] as const
export type LegacyThemeKey = typeof LEGACY_THEME_KEYS[number]

/** Each theme draws these its own way (see the theme's skin CSS). */
export const BUTTON_STYLES = ['solid', 'outline', 'pill', 'offset'] as const
export type ButtonStyle = typeof BUTTON_STYLES[number]

const hex = z.string().regex(/^#[0-9A-F]{6}$/, 'Upper-case hex colour')
const family = z.string().regex(/^[A-Za-z0-9 ]{1,40}$/, 'Font family name')

const faceSchema = z.object({
  family,
  weight: z.number().int().min(100).max(900),
  fallback: z.enum(['sans-serif', 'serif']),
}).strict()

export const paletteSchema = z.object({
  ground: hex,
  surface: hex,
  /** Hairlines and frames. Decorative only: never carries text. */
  line: hex,
  ink: hex,
  muted: hex,
  /** The customer's brand colour, exactly as picked. */
  brand: hex,
  /** The exact brand colour, for fills and large shapes (buttons, the loud band, stripes). */
  brandFill: hex,
  /** Label on brandFill: black or white (as the theme draws them), whichever reaches 4.5:1. */
  brandInk: hex,
  /** A same-hue edge for brand buttons that stand out less than 3:1 from the ground or surface. */
  brandEdge: hex,
  /** Brand colour as text: the same hue tuned to 4.5:1 on ground, surface and every tint. */
  brandText: hex,
  /** Decorative accents on the ground and surface: the exact colour, or the tuned shade when it is quiet. */
  accent: hex,
  /** Under 1.5:1 against the ground: only used on contrasting bands and tints (the loud band becomes the ink band). */
  quiet: z.boolean(),
  /** The brand stands out at least 3:1 on the ink band, so it can fill buttons and accents there. */
  onInk: z.boolean(),
  /** Something was adjusted for readability (the builder says so, gently). */
  tuned: z.boolean(),
  /** Tile backgrounds (pastels, soft brand tints). Ink and muted text reach AA on each. */
  tints: z.array(hex).max(4),
}).strict()
export type Palette = z.infer<typeof paletteSchema>

/**
 * The site's resolved look, rolled once per site from its theme and style seed. Fonts,
 * type presets and component styles come from the theme; this records the rolled choices
 * and the palette computed around the brand colour.
 */
export const siteStyleSchema = z.object({
  v: z.literal(2),
  theme: z.enum(THEME_KEYS),
  fonts: z.object({ display: faceSchema, body: faceSchema, label: faceSchema }).strict(),
  /** Base type preset, 0 = the theme's largest. */
  scale: z.number().int().min(0).max(2),
  button: z.enum(BUTTON_STYLES),
  radius: z.number().int().min(0).max(40),
  density: z.number().min(0.7).max(1.6),
  palette: paletteSchema,
}).strict()
export type SiteStyle = z.infer<typeof siteStyleSchema>
