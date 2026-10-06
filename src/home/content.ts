import { BRAND } from '../brand/config'
import type { TradeId } from '../types'

/** The builder, and the builder with a trade already picked. */
export const BUILDER_URL = '/build/'
export const builderFor = (trade: TradeId) => `${BUILDER_URL}?trade=${trade}`

export const TRADE_LINKS: { id: TradeId; label: string }[] = [
  { id: 'plumber', label: 'Plumber' },
  { id: 'electrician', label: 'Electrician' },
  { id: 'roofer', label: 'Roofer' },
  { id: 'painter', label: 'Painter' },
  { id: 'landscaper', label: 'Landscaper' },
]

export const HOW_STEPS = [
  { title: 'Pick your trade', text: 'We fill in the basics: your services, the right wording, the sections customers look for.' },
  { title: 'Stack your blocks', text: 'Flick through designs for each section and keep the ones you like. Add your photos and details.' },
  { title: 'Go live', text: `Pay ${BRAND.price} once and your site's online, ready for your van, your cards and Google.` },
]

export const GETS = [
  { title: 'Your own web address', text: `yourname.${BRAND.domain}, free. Or connect a domain you own.` },
  { title: 'Works on every phone', text: 'Your number is one tap away for every customer.' },
  { title: 'Change it whenever', text: 'Update your text and photos with a link we email you.' },
  { title: 'Your colours, your photos', text: 'Use your van colour. We keep the text easy to read.' },
  { title: 'Easy for everyone to use', text: 'Clear, readable and checked for accessibility, automatically.' },
  { title: 'No ads, no catches', text: 'No monthly fees, no upsell emails, no small print.' },
]

export const FAQS = [
  { q: 'Do I need to be good with computers?', a: 'No. If you can pick from a few options on your phone, you can build your site.' },
  { q: 'Are there really no monthly fees?', a: `Really. You pay ${BRAND.price} once and your site stays online.` },
  { q: 'Can I use my own domain?', a: 'Yes. Buy it wherever you like and follow our short guide to connect it.' },
  { q: 'What if I’m not happy?', a: `Building is free, so you only pay once you’re happy. And if you change your mind within ${BRAND.guarantee.days} days of paying, we’ll give you your money back. No questions asked.` },
  { q: 'Can I change my site later?', a: 'Yes. We email you a link to update your text and photos whenever you need.' },
]
