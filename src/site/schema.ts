import { z } from 'zod'
import { SECTION_TYPES, TRADE_IDS } from '../types'
import { generatedHeroSchema, siteStyleSchema, THEME_KEYS } from '../gen/schema'
import { BANDS, SECTION_KEYS } from '../gen/core/types'
import { generatedSectionsSchema } from '../gen/specs'
import { LIMITS } from './limits'

export const EXTRA_IDS = ['reviews'] as const
export type ExtraId = typeof EXTRA_IDS[number]

const text = (max: number) => z.string().trim().max(max)

/**
 * Photos are https URLs, or (until uploads go to R2) images resized in the browser and
 * kept as data URLs. Nothing else, so a stored URL can't carry script or markup.
 */
export const PHOTO_DATA_URL = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/
/** A 1600px WebP at 80% is well under 1 MB; this leaves room without letting records balloon. */
const MAX_PHOTO_URL = 3_000_000

export const photoUrlSchema = z.string().max(MAX_PHOTO_URL).refine(
  u => PHOTO_DATA_URL.test(u) || /^https:\/\/[^\s"'<>]+$/.test(u),
  'Photos must be an https link or an image prepared in the builder',
)

type Limits = {
  name: number; phone: number; location: number; about: number; yearsInBusiness: number
  badge: number; area: number; hoursDay: number; hoursTime: number; jobsDone: number
  reviewAuthor: number; reviewLocation: number; reviewText: number; photoAlt: number
}

/** The limits records were saved under before v3. */
const V2_LIMITS: Limits = {
  name: 80, phone: 30, location: 80, about: 160, yearsInBusiness: 10, badge: 60, area: 60,
  hoursDay: 30, hoursTime: 40, jobsDone: 20, reviewAuthor: 60, reviewLocation: 60, reviewText: 400, photoAlt: 160,
}

const photoSchemaFor = (L: Limits) => z.object({
  url: photoUrlSchema,
  alt: text(L.photoAlt).min(1, 'Every photo needs a short description for screen readers'),
})

const reviewSchemaFor = (L: Limits) => z.object({
  author: text(L.reviewAuthor).min(1),
  location: text(L.reviewLocation),
  text: text(L.reviewText).min(1),
  rating: z.number().int().min(1).max(5),
})

const businessSchemaFor = (L: Limits) => z.object({
  name: text(L.name),
  phone: text(L.phone),
  location: text(L.location),
  about: text(L.about),
  yearsInBusiness: text(L.yearsInBusiness),
  email: z.union([z.literal(''), z.string().trim().email().max(LIMITS.email)]),
})

const contentSchemaFor = (L: Limits) => z.object({
  badges: z.array(text(L.badge).min(1)).max(8).nullable(),
  areas: z.array(text(L.area).min(1)).max(16).nullable(),
  hours: z.array(z.object({ day: text(L.hoursDay).min(1), time: text(L.hoursTime).min(1) })).max(8).nullable(),
  emergency: z.boolean().nullable(),
  jobsDone: text(L.jobsDone).min(1).nullable(),
  rating: z.object({ score: z.number().min(1).max(5), count: z.number().int().min(1) }).nullable(),
  reviews: z.array(reviewSchemaFor(L)).max(12).nullable(),
  photos: z.object({
    hero: photoSchemaFor(L).nullable(),
    about: photoSchemaFor(L).nullable(),
    gallery: z.array(photoSchemaFor(L)).max(12),
  }),
})

const commonFor = (L: Limits) => ({
  tradeId: z.enum(TRADE_IDS),
  business: businessSchemaFor(L),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex colour like #1E88E5'),
  extras: z.array(z.enum(EXTRA_IDS)),
  content: contentSchemaFor(L),
})

const styleSchema = z.object({
  theme: z.enum(THEME_KEYS),
  seed: z.number().int().min(0).max(0xffffffff),
  resolved: siteStyleSchema,
})

/** v1: every section was a hand-built template, picked by variant id. */
export const siteSchemaV1 = z.object({
  version: z.literal(1),
  ...commonFor(V2_LIMITS),
  selections: z.partialRecord(z.enum(SECTION_TYPES), z.string().min(1)),
})
export type SiteV1 = z.infer<typeof siteSchemaV1>

/** v2: the hero was generated ({ seed, spec }); other sections were templates picked by variant id. */
export const siteSchemaV2 = z.object({
  version: z.literal(2),
  ...commonFor(V2_LIMITS),
  style: styleSchema,
  sections: z.object({ hero: generatedHeroSchema.optional() }),
  selections: z.partialRecord(z.enum(SECTION_TYPES).exclude(['hero']), z.string().min(1)),
})
export type SiteV2 = z.infer<typeof siteSchemaV2>

const rhythmSchema = z.partialRecord(
  z.enum(SECTION_KEYS),
  z.object({ band: z.enum(BANDS), side: z.enum(['left', 'right']) }).strict(),
)

/**
 * v3: every section is generated. Each stores its batch seed and fully resolved spec (plus
 * the customer's own pick if a fit repair replaced it), so generator changes can never
 * alter a saved site. `rhythm` is derived from the whole page on every change and saved
 * alongside, so publishing renders exactly what the builder showed.
 */
export const siteSchema = z.object({
  version: z.literal(3),
  ...commonFor(LIMITS),
  style: styleSchema,
  sections: generatedSectionsSchema,
  rhythm: rhythmSchema,
})

export type Site = z.infer<typeof siteSchema>
export type SiteStyleRecord = Site['style']
export type SiteContent = Site['content']
export type Review = SiteContent['reviews'] extends (infer R)[] | null ? R : never
export type Photo = NonNullable<SiteContent['photos']['hero']>
export type OpeningHours = NonNullable<SiteContent['hours']>[number]

export class SiteParseError extends Error {
  readonly issues: z.core.$ZodIssue[]

  constructor(issues: z.core.$ZodIssue[]) {
    const summary = issues.map(i => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')
    super(`Invalid site data — ${summary}`)
    this.name = 'SiteParseError'
    this.issues = issues
  }
}

/** Validates untrusted data against a schema, throwing a SiteParseError that lists every issue. */
export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) throw new SiteParseError(result.error.issues)
  return result.data
}
