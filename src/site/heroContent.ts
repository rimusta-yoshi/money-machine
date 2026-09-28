import { defaultHeroSpec } from '../gen'
import type { HeroContent, HeroSpec } from '../gen'
import type { TradeConfig } from '../types'
import { telHref } from './phone'
import type { Site } from './schema'
import { firstHeroBatch } from './style'

/**
 * What the generated hero may say, taken only from the site record and the trade's copy.
 * Unlike the template sections, the hero shows no example content: ratings, reviews,
 * badges and photos appear only once the customer has added them.
 */
export function heroContent(site: Site, trade: TradeConfig): HeroContent {
  const { business, content } = site
  const phone = business.phone.trim()
  const location = business.location.trim()
  const href = telHref(phone)
  const reviewsOn = site.extras.includes('reviews')

  return {
    headline: trade.tagline,
    sub: `${trade.ctaText}${location ? ` across ${location}` : ''}. ${trade.ctaSubtext}.`,
    call: href ? { label: `Call ${phone}`, href } : null,
    quote: { label: trade.ctaText, href: '#contact' },
    photo: content.photos.hero,
    badges: content.badges ?? [],
    rating: reviewsOn ? content.rating : null,
    reviews: reviewsOn
      ? (content.reviews ?? []).map(r => ({ text: r.text, author: r.author, location: r.location, rating: r.rating }))
      : [],
    quoteForm: business.email.trim() !== '',
  }
}

/** The hero a site shows: the customer's pick, or the generator's best first option if none yet. */
export function siteHeroSpec(site: Site, content: HeroContent): HeroSpec {
  return site.sections.hero?.spec ?? defaultHeroSpec(firstHeroBatch(site.style.seed), content, site.style.resolved)
}
