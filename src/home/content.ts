import { NO_SOURCE, sourceFromSearch, withSource } from '../analytics/source'
import { BRAND } from '../brand/config'
import { PRICE } from '../brand/price'
import type { TradeId } from '../types'
import type { GetIconName } from './GetIcon'

/** The ad this visit came from (?src=, utm_source, utm_campaign), carried on to the builder. */
export const VISIT_SOURCE = typeof window === 'undefined' ? NO_SOURCE : sourceFromSearch(window.location.search)

/** The builder, and the builder with a trade already picked. */
export const BUILDER_URL = withSource('/build/', VISIT_SOURCE)
export const builderFor = (trade: TradeId) => withSource(`/build/?trade=${trade}`, VISIT_SOURCE)

/** The trade chips: every pack marked `featured`, from the build (the rest are on the /websites-for/ hub). */
export const TRADE_LINKS: { id: TradeId; label: string }[] = __FEATURED_TRADES__

export const HOW_STEPS = [
  { title: 'Pick your trade', text: 'We fill in the basics: your services, the right wording, the sections customers look for.' },
  { title: 'Stack your blocks', text: 'Flick through designs for each section and keep the ones you like. Add your photos and details.' },
  { title: 'Go live', text: `Pay ${PRICE} once and your site's online, ready for your van, your cards and Google.` },
]

/** `colour` is the icon block's brand colour. */
export const GETS: { title: string; text: string; icon: GetIconName; colour: 'brick' | 'yellow' | 'lawn' | 'night' | 'blue' }[] = [
  { title: 'Your own web address', text: `yourname.${BRAND.domain}, free. Or connect a domain you own.`, icon: 'globe', colour: 'brick' },
  { title: 'Works on every phone', text: 'Your number is one tap away for every customer.', icon: 'phone', colour: 'yellow' },
  { title: 'Change it whenever', text: 'Update your text and photos with a link we email you.', icon: 'pencil', colour: 'lawn' },
  { title: 'Your colours, your photos', text: 'Use your van colour. We keep the text easy to read.', icon: 'palette', colour: 'night' },
  { title: 'Easy for everyone to use', text: 'Clear, readable and checked for accessibility, automatically.', icon: 'access', colour: 'blue' },
  { title: 'No ads, no catches', text: 'No monthly fees, no upsell emails, no small print.', icon: 'shield', colour: 'brick' },
]

/** "Why £99, once?": why there's no subscription. */
export const WHY_ONCE = [
  'A website like yours costs pennies a month to host. So we don’t think you should pay £20 a month for it, forever.',
  'You pay once. Your site stays up. No subscription, no add-ons, no surprise renewals.',
  'We started this after watching a small business pay over £300 a year for a simple website. That felt wrong.',
]

export const FAQS = [
  { q: 'Do I need to be good with computers?', a: 'No. If you can pick from a few options on your phone, you can build your site.' },
  { q: 'Are there really no monthly fees?', a: `Really. You pay ${PRICE} once and your site stays online.` },
  { q: 'Can I use my own domain?', a: 'Yes. Buy it wherever you like and follow our short guide to connect it.' },
  { q: 'What if I’m not happy?', a: `Building is free, so you only pay once you’re happy. And if you change your mind within ${BRAND.guarantee.days} days of paying, we’ll give you your money back. No questions asked.` },
  { q: 'Can I change my site later?', a: 'Yes. We email you a link to update your text and photos whenever you need.' },
]
