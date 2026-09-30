import type { PageContent } from '../gen'
import type { TradeConfig } from '../types'
import { FEATURES } from './features'
import type { Features } from './features'
import { telHref } from './phone'
import type { Site, SiteV2 } from './schema'

type Record_ = Pick<Site | SiteV2, 'business' | 'content' | 'extras'>

/**
 * What the generated page may say: the customer's record plus the trade's own copy.
 * Nothing is invented: unset content stays empty and the layouts that need it are
 * ruled out. Ratings and reviews only appear with the reviews extra.
 */
export function pageContent(site: Record_, trade: TradeConfig, features: Features = FEATURES, year = new Date().getFullYear()): PageContent {
  const { business: b, content: c } = site
  const reviewsOn = site.extras.includes('reviews')
  const phone = b.phone.trim()
  const email = b.email.trim()
  return {
    trade: { name: trade.name, tagline: trade.tagline, ctaText: trade.ctaText, ctaSubtext: trade.ctaSubtext, offer: trade.offer, services: trade.services },
    business: {
      name: b.name.trim(),
      phone,
      tel: telHref(phone),
      email,
      location: b.location.trim(),
      about: b.about.trim(),
      years: b.yearsInBusiness.trim(),
    },
    badges: c.badges ?? [],
    whyUs: (c.whyUs ?? []).map(w => [w.title, w.text] as const),
    certsNote: c.certsNote?.trim() || null,
    areas: c.areas ?? [],
    hours: c.hours ?? [],
    emergency: c.emergency === true,
    jobsDone: c.jobsDone?.trim() || null,
    rating: reviewsOn ? c.rating : null,
    reviews: reviewsOn ? (c.reviews ?? []).map(r => ({ text: r.text, author: r.author, location: r.location, rating: r.rating })) : [],
    photos: { hero: c.photos.hero, about: c.photos.about, gallery: c.photos.gallery },
    // A form needs somewhere for enquiries to go, and the sending to be built.
    quoteForm: features.enquiries && email !== '',
    year,
  }
}
