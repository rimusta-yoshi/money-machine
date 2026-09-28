import { z } from 'zod'
import { SECTION_TYPES, TRADE_IDS } from '../types'
import { generatedHeroSchema, siteStyleSchema, THEME_KEYS } from '../gen/schema'

export const EXTRA_IDS = ['reviews'] as const
export type ExtraId = typeof EXTRA_IDS[number]

const text = (max: number) => z.string().trim().max(max)

const photoSchema = z.object({
  url: z.string().url(),
  alt: text(160).min(1, 'Every photo needs a short description for screen readers'),
})

const reviewSchema = z.object({
  author: text(60).min(1),
  location: text(60),
  text: text(400).min(1),
  rating: z.number().int().min(1).max(5),
})

const businessSchema = z.object({
  name: text(80),
  phone: text(30),
  location: text(80),
  about: text(160),
  yearsInBusiness: text(10),
  email: z.union([z.literal(''), z.string().trim().email().max(254)]),
})

const contentSchema = z.object({
  badges: z.array(text(60).min(1)).max(8).nullable(),
  areas: z.array(text(60).min(1)).max(16).nullable(),
  hours: z.array(z.object({ day: text(30).min(1), time: text(40).min(1) })).max(8).nullable(),
  emergency: z.boolean().nullable(),
  jobsDone: text(20).min(1).nullable(),
  rating: z.object({ score: z.number().min(1).max(5), count: z.number().int().min(1) }).nullable(),
  reviews: z.array(reviewSchema).max(12).nullable(),
  photos: z.object({
    hero: photoSchema.nullable(),
    about: photoSchema.nullable(),
    gallery: z.array(photoSchema).max(12),
  }),
})

const common = {
  tradeId: z.enum(TRADE_IDS),
  business: businessSchema,
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex colour like #1E88E5'),
  extras: z.array(z.enum(EXTRA_IDS)),
  content: contentSchema,
}

/** v1: every section was a hand-built template, picked by variant id. */
export const siteSchemaV1 = z.object({
  version: z.literal(1),
  ...common,
  selections: z.partialRecord(z.enum(SECTION_TYPES), z.string().min(1)),
})
export type SiteV1 = z.infer<typeof siteSchemaV1>

/** Sections that still use hand-built templates, picked by variant id. */
export const TEMPLATE_SECTION_TYPES = SECTION_TYPES.filter(t => t !== 'hero')
const templateSection = z.enum(SECTION_TYPES).exclude(['hero'])

/**
 * v2: the site style is resolved once and stored, and generated sections store their batch
 * seed plus the fully resolved spec, so generator changes can never alter a saved site.
 */
export const siteSchema = z.object({
  version: z.literal(2),
  ...common,
  style: z.object({
    theme: z.enum(THEME_KEYS),
    seed: z.number().int().min(0).max(0xffffffff),
    resolved: siteStyleSchema,
  }),
  sections: z.object({ hero: generatedHeroSchema.optional() }),
  selections: z.partialRecord(templateSection, z.string().min(1)),
})

export type Site = z.infer<typeof siteSchema>
export type SiteStyleRecord = Site['style']
export type SiteContent = Site['content']
export type Review = z.infer<typeof reviewSchema>
export type Photo = z.infer<typeof photoSchema>
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
