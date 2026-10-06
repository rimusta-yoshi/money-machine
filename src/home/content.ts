import { BRAND } from '../brand/config'
import type { TradeId } from '../types'
import type { SampleLook } from './SampleHero'

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

/** The hero phone: the same plumber in three looks, one after another. */
export const HERO_LOOKS: SampleLook[] = [
  { trade: 'plumber', theme: 'workwear', brand: '#FFD400', seed: 11, name: 'Hartley Plumbing', location: 'Harrogate' },
  { trade: 'plumber', theme: 'clean-pro', brand: '#1F4FD8', seed: 4, name: 'Hartley Plumbing', location: 'Harrogate' },
  { trade: 'plumber', theme: 'friendly-local', brand: '#0B6E6D', seed: 7, name: 'Hartley Plumbing', location: 'Harrogate' },
]

/**
 * "Every site looks different": one example per style, each a different trade. `width` is
 * the width each hero is laid out at: over 720 gives the desktop layout, 390 the phone one.
 */
export const EXAMPLES: { label: string; look: SampleLook; span: 'wide' | 'tall' | 'mid' | 'small'; width: number }[] = [
  { label: 'Roofer · Workwear', span: 'tall', width: 760, look: { trade: 'roofer', theme: 'workwear', brand: '#FFD400', seed: 21, name: 'Ridgeline Roofing', location: 'Leeds' } },
  { label: 'Plumber · Clean Pro', span: 'wide', width: 1200, look: { trade: 'plumber', theme: 'clean-pro', brand: '#1F4FD8', seed: 4, name: 'Hartley Plumbing', location: 'Harrogate' } },
  { label: 'Landscaper · Friendly Local', span: 'mid', width: 760, look: { trade: 'landscaper', theme: 'friendly-local', brand: '#0B6E6D', seed: 9, name: 'Greenleaf Gardens', location: 'York' } },
  { label: 'Decorator · Craft Heritage', span: 'small', width: 390, look: { trade: 'painter', theme: 'craft-heritage', brand: '#1E4D3A', seed: 5, name: 'Ashby & Daughter', location: 'Ilkley' } },
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
  { q: 'What if I’m not happy?', a: `Building is free, so you only pay once you’re happy. After that: ${BRAND.refundPolicy}.` },
  { q: 'Can I change my site later?', a: 'Yes. We email you a link to update your text and photos whenever you need.' },
]
