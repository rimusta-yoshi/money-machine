import { z } from 'zod'
import { LEGACY_THEME_KEYS, THEME_KEYS } from '../gen/schema'
import { LIMITS, MAX_SERVICES } from '../site/limits'
import { CATEGORIES } from './categories'
import type { Category } from './categories'
import { PLANNED_SECTIONS, SECTION_TYPES } from './sections'

/**
 * A business-type pack: everything about one type of business in one file
 * (src/packs/business/<id>.ts). The builder, the homepage and the "Websites for…" pages read
 * packs only. `npm run pack:check` validates every pack against this schema and more (photos,
 * licences, copy, near-duplicate wording); see docs/adding-a-business-type.md.
 *
 * Room left, not built yet:
 * - `kind: 'combined'` ("I also do…"): a pack that merges the services and sections of the packs
 *   it names (say `combines: ['plumber', 'electrician']`). Today only 'single' is accepted.
 * - `kind: 'scratch'`: a generic "build from scratch" pack with no trade wording, for businesses
 *   no pack fits yet.
 */

const CATEGORY_KEYS = Object.keys(CATEGORIES) as [Category, ...Category[]]

const line = (max: number) => z.string().trim().min(1).max(max)
const hex = z.string().regex(/^#[0-9A-F]{6}$/, 'Upper-case hex colour, e.g. #1E88E5')

const sectionPick = z.object({
  type: z.enum([...SECTION_TYPES, ...PLANNED_SECTIONS]),
  /** Only on the page when switched on (built sections), or added once built (planned ones). */
  optional: z.literal(true).optional(),
}).strict()

const photo = z.object({
  /** A file in reference/sample-photos, listed in its LICENCE.md. */
  file: z.string().regex(/^[a-z0-9-]+\.jpg$/, 'A .jpg in reference/sample-photos'),
  /** Always starts "Sample photo: " so nobody takes it for the customer's own work. */
  alt: z.string().startsWith('Sample photo: ').max(120),
  /** Landscape and uncluttered enough for a hero. */
  hero: z.literal(true).optional(),
  credit: z.object({
    licence: z.literal('Pexels License'),
    photographer: line(60),
    page: z.string().url().startsWith('https://www.pexels.com/photo/'),
  }).strict(),
}).strict()

const example = z.object({
  /** A made-up business: never a real one. */
  name: line(LIMITS.name),
  location: line(LIMITS.location),
  about: line(LIMITS.about),
  years: z.string().regex(/^\d{1,2}$/),
  areas: z.array(line(LIMITS.area)).min(3).max(6),
  theme: z.enum(THEME_KEYS),
  /** Fixed, so the example looks the same on every build. */
  seed: z.number().int().min(1).max(2 ** 31 - 1),
}).strict()

export const landingSchema = z.object({
  /** The <title> (the brand is added after it). */
  title: line(60),
  /** The line under the title in search results. */
  description: z.string().trim().min(70).max(160),
  headline: line(70),
  /** Two or three short paragraphs written for this trade. */
  intro: z.array(line(400)).min(2).max(3),
  /** "What a <trade> website needs": a short checklist specific to the trade. */
  needs: z.array(z.object({ title: line(60), text: line(220) }).strict()).min(4).max(7),
  faqs: z.array(z.object({ q: line(110), a: line(500) }).strict()).min(4).max(6),
  /** Three examples, rendered by the real generator at build time. Each in a different theme. */
  examples: z.array(example).length(3),
}).strict()

/** What the builder needs: everything but the landing page. */
export const coreSchema = z.object({
  kind: z.literal('single'),
  /** The builder's trade id (/build/?trade=<id>). Never change it once live: saved sites name it. */
  id: z.string().regex(/^[a-z][a-z-]*[a-z]$/),
  /** The page address: /websites-for/<slug>/ (usually the plural). */
  slug: z.string().regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, 'Lower-case letters, digits and dashes'),
  /** As the picker shows it ("Plumber"). */
  name: line(30),
  /** Lower case, for sentences: "websites for plumbers". */
  plural: line(40),
  /** What people also call it ("sparky"): matched by "My business isn't listed". Lower case. */
  synonyms: z.array(z.string().regex(/^[a-z][a-z '&-]*[a-z]$/)).min(1).max(20),
  category: z.enum(CATEGORY_KEYS),
  /** Shown as a chip on the homepage (the rest are on the /websites-for/ hub). */
  featured: z.boolean(),
  emoji: line(8),
  look: z.object({
    colours: z.object({ navy: hex, navyHover: hex, accent: hex, accentInk: hex, accentTint: hex }).strict(),
    /** The theme a new site starts in. */
    theme: z.enum(THEME_KEYS),
    /** Only for the five first trades: the theme they had before themes could be picked. */
    legacyTheme: z.enum(LEGACY_THEME_KEYS).optional(),
  }).strict(),
  /**
   * The trade's own words on the generated site. Section headings and why-us suggestions come
   * from the theme (src/gen/themes), shared by every trade.
   */
  copy: z.object({
    /** The hero's headline and the footer's line. */
    tagline: line(70),
    /** The main button, sentence case ("Get a free quote"). */
    cta: line(36),
    /** A short reassurance after the offer ("No obligation"). */
    ctaNote: line(50),
    /** What's on offer, plural noun phrase ("Free quotes"): "Free quotes across Leeds." */
    offer: line(40),
  }).strict(),
  /**
   * Hero headline suggestions the builder offers (three at a time, varied per site). `{town}` is
   * replaced with the customer's location; lines with it are skipped when there's no location or
   * it would run too long, so at least three must work without it. Never used for the page title.
   */
  headlines: z.array(z.string().trim().min(1).max(LIMITS.headline).regex(/^[^{}]*(\{town\}[^{}]*)?$/, 'Only {town}, once, may be filled in'))
    .min(6).max(10)
    .refine(hs => hs.filter(h => !h.includes('{town}')).length >= 3, 'At least three headlines without {town}'),
  /** Pre-filled services (names as shown on the site; descriptions for the "Websites for" page). */
  services: z.array(z.object({ name: line(LIMITS.service), description: line(160) }).strict()).min(3).max(MAX_SERVICES),
  /** Trust badges offered in the builder (Gas Safe, NICEIC…). Never added for the customer. */
  badges: z.array(line(LIMITS.badge)).min(3).max(8),
  /** In page order. The footer is added to every site; don't list it. */
  sections: z.array(sectionPick).min(3),
  /** A call button pinned to the bottom of phones. Kept from the first trades; not drawn by the generator yet. */
  stickyCallBar: z.boolean(),
  /** Sample photos for the builder preview and the example sites. Never published as the customer's. */
  photos: z.array(photo).min(3),
}).strict()

/**
 * A whole pack as pack:check sees it. In the pack's file the landing page is its own export
 * (`<id>Landing`), so the builder's and the homepage's code never carry the page copy.
 */
export const packSchema = coreSchema.extend({ landing: landingSchema }).strict()

export type PackCore = z.infer<typeof coreSchema>
export type PackLanding = z.infer<typeof landingSchema>
export type Pack = z.infer<typeof packSchema>
export type PackPhoto = PackCore['photos'][number]
export type PackExample = PackLanding['examples'][number]
