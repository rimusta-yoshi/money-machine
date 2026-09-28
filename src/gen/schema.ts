import { z } from 'zod'

/**
 * Stored shapes for generated output. Everything here ends up in HTML attributes or
 * CSS custom properties, so every string is locked to a safe pattern or an enum.
 */

export const THEME_KEYS = ['professional', 'luxury', 'family', 'brutalism'] as const
export type ThemeKey = typeof THEME_KEYS[number]

export const BUTTON_STYLES = ['solid', 'outline', 'underline', 'pill', 'offset'] as const
export type ButtonStyle = typeof BUTTON_STYLES[number]

const hex = z.string().regex(/^#[0-9A-F]{6}$/, 'Upper-case hex colour')
const family = z.string().regex(/^[A-Za-z0-9 ]{1,40}$/, 'Font family name')

const faceSchema = z.object({
  family,
  weight: z.number().int().min(100).max(900),
  fallback: z.enum(['sans-serif', 'serif', 'monospace']),
})

export const siteStyleSchema = z.object({
  v: z.literal(1),
  theme: z.enum(THEME_KEYS),
  display: faceSchema,
  body: faceSchema,
  displayUpper: z.boolean(),
  buttonUpper: z.boolean(),
  button: z.enum(BUTTON_STYLES),
  radius: z.number().int().min(0).max(32),
  density: z.number().min(0.7).max(1.6),
  headScale: z.number().min(2).max(7),
  tracking: z.number().min(-0.05).max(0.05),
  buttonHeight: z.number().int().min(44).max(72),
  border: z.number().int().min(1).max(4),
  palette: z.object({
    ground: hex,
    surface: hex,
    ink: hex,
    muted: hex,
    /** The customer's brand colour, as picked. */
    brand: hex,
    /** Brand as a fill (buttons, brand bands), adjusted so its label colour reaches AA. */
    brandFill: hex,
    /** Label colour on brandFill. */
    brandInk: hex,
    /** Brand as text/outline colour, adjusted to reach AA on both ground and surface. */
    brandText: hex,
  }),
})
export type SiteStyle = z.infer<typeof siteStyleSchema>

export const TONES = ['ground', 'surface', 'brand'] as const
export type Tone = typeof TONES[number]
const tone = z.enum(TONES)

const hero = <A extends string, P extends z.ZodRawShape>(archetype: A, params: P) =>
  z.object({ v: z.literal(1), section: z.literal('hero'), archetype: z.literal(archetype), params: z.object(params) })

export const heroSpecSchema = z.discriminatedUnion('archetype', [
  hero('split', {
    ratio: z.number().min(0.4).max(0.7),
    side: z.enum(['left', 'right']),
    valign: z.enum(['center', 'top']),
    proof: z.enum(['under', 'strip', 'none']),
    mobilePhoto: z.enum(['top', 'bottom']),
    tone,
  }),
  hero('overlay', {
    anchor: z.enum(['bottom-left', 'center', 'middle-left']),
    // 0.55 is the least that keeps white text at 4.5:1 over a pure white photo.
    scrim: z.number().min(0.55).max(0.9),
  }),
  hero('stacked', {
    align: z.enum(['center', 'left']),
    image: z.enum(['bleed', 'inset', 'none']),
    tone,
  }),
  hero('card', {
    pos: z.enum(['left', 'center', 'right']),
    surface: z.enum(['surface', 'ground']),
  }),
  hero('offset', {
    // The generator rolls up to 0.35 and the overlap check rejects the excess; only <= 0.25 can be stored.
    overlap: z.number().min(0).max(0.25),
    drop: z.number().min(0).max(80),
  }),
  hero('typeled', {
    trust: z.boolean(),
    scale: z.number().min(1).max(1.5),
    tone,
  }),
  hero('proof', {
    count: z.number().int().min(1).max(3),
    summary: z.enum(['top', 'bottom', 'none']),
    team: z.boolean(),
    tone,
  }),
  hero('contact', {
    fields: z.number().int().min(2).max(4),
    side: z.enum(['left', 'right']),
    tone,
  }),
])
export type HeroSpec = z.infer<typeof heroSpecSchema>
export type ArchetypeKey = HeroSpec['archetype']
export type ParamsOf<K extends ArchetypeKey> = Extract<HeroSpec, { archetype: K }>['params']

/** A generated section as stored in the site record: the batch seed and the resolved spec. */
export const generatedHeroSchema = z.object({
  seed: z.number().int().min(0).max(0xffffffff),
  spec: heroSpecSchema,
})
export type GeneratedHero = z.infer<typeof generatedHeroSchema>
