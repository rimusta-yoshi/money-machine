import { z } from 'zod'
import { SECTION_TYPES, TRADE_IDS } from '../types'

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

export const siteSchema = z.object({
  version: z.literal(1),
  tradeId: z.enum(TRADE_IDS),
  business: businessSchema,
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex colour like #1E88E5'),
  extras: z.array(z.enum(EXTRA_IDS)),
  selections: z.partialRecord(z.enum(SECTION_TYPES), z.string().min(1)),
  content: contentSchema,
})

export type Site = z.infer<typeof siteSchema>
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

/** Validates untrusted site data (from storage, the network or a form). */
export function parseSite(input: unknown): Site {
  const result = siteSchema.safeParse(input)
  if (!result.success) throw new SiteParseError(result.error.issues)
  return result.data
}
