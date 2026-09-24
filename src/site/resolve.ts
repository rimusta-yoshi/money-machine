import type { TradeConfig } from '../types'
import { exampleContent } from './examples'
import type { OpeningHours, Photo, Review, Site } from './schema'

export type RenderMode = 'builder' | 'live'

/** A value to render, and whether it is placeholder content. null = render nothing. */
export type Shown<T> = { value: T; example: boolean } | null

export interface ResolvedContent {
  badges: Shown<string[]>
  areas: Shown<string[]>
  hours: Shown<OpeningHours[]>
  emergency: Shown<boolean>
  jobsDone: Shown<string>
  rating: Shown<{ score: number; count: number }>
  reviews: Shown<Review[]>
  photos: {
    hero: Shown<Photo | null>
    about: Shown<Photo | null>
    gallery: Shown<Photo[]>
  }
}

const isSet = <T>(v: T | null): v is T => v !== null && !(Array.isArray(v) && v.length === 0)

function pick<T>(own: T | null, example: T, mode: RenderMode): Shown<T> {
  if (isSet(own)) return { value: own, example: false }
  return mode === 'builder' ? { value: example, example: true } : null
}

/**
 * Decides what each template shows. In the builder, missing content falls back to
 * flagged examples; on a live site it is hidden, so nothing invented gets published.
 * Example photos are `null` values: templates draw a placeholder box for them.
 */
export function resolveContent(site: Site, trade: TradeConfig, mode: RenderMode): ResolvedContent {
  const c = site.content
  const ex = exampleContent(trade)
  const reviewsOn = site.extras.includes('reviews')

  return {
    badges: pick(c.badges, ex.badges, mode),
    areas: pick(c.areas, ex.areas, mode),
    hours: pick(c.hours, ex.hours, mode),
    emergency: pick(c.emergency, ex.emergency, mode),
    jobsDone: pick(c.jobsDone, ex.jobsDone, mode),
    rating: reviewsOn ? pick(c.rating, ex.rating, mode) : null,
    reviews: reviewsOn ? pick(c.reviews, ex.reviews, mode) : null,
    photos: {
      hero: pick<Photo | null>(c.photos.hero, null, mode),
      about: pick<Photo | null>(c.photos.about, null, mode),
      gallery: pick<Photo[]>(c.photos.gallery, [], mode),
    },
  }
}
