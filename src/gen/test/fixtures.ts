import type { HeroContent, HeroSpec } from '..'

/** A new site: trade copy and a phone number, nothing else. */
export const BARE: HeroContent = {
  headline: 'Local plumbers you can actually rely on.',
  sub: 'Get a Free Quote across Leeds. Free, no-obligation quotes.',
  call: { label: 'Call 0113 496 0000', href: 'tel:01134960000' },
  quote: { label: 'Get a Free Quote', href: '#contact' },
  photo: null,
  badges: [],
  rating: null,
  reviews: [],
  quoteForm: false,
}

/** Everything filled in, so every archetype is allowed. */
export const RICH: HeroContent = {
  ...BARE,
  photo: { url: 'https://example.com/van.jpg', alt: 'Our van outside a customer’s house' },
  badges: ['Gas Safe registered', 'Fully insured', '12-month guarantee'],
  rating: { score: 4.8, count: 27 },
  reviews: [
    { text: 'Came out the same day for a burst pipe and left the kitchen spotless.', author: 'Priya K.', location: 'Headingley', rating: 5 },
    { text: 'Clear quote, no surprises on the invoice. New boiler fitted in a day.', author: 'Mark D.', location: 'Roundhay', rating: 5 },
    { text: 'Patient with all our questions and brilliant with the kids around.', author: 'Hannah S.', location: '', rating: 5 },
  ],
  quoteForm: true,
}

/** One spec per archetype, for rendering and accessibility tests. */
export const ONE_OF_EACH: HeroSpec[] = [
  { v: 1, section: 'hero', archetype: 'split', params: { ratio: 0.56, side: 'left', valign: 'top', proof: 'strip', mobilePhoto: 'top', tone: 'surface' } },
  { v: 1, section: 'hero', archetype: 'overlay', params: { anchor: 'bottom-left', scrim: 0.62 } },
  { v: 1, section: 'hero', archetype: 'stacked', params: { align: 'center', image: 'bleed', tone: 'brand' } },
  { v: 1, section: 'hero', archetype: 'card', params: { pos: 'right', surface: 'ground' } },
  { v: 1, section: 'hero', archetype: 'offset', params: { overlap: 0.18, drop: 40 } },
  { v: 1, section: 'hero', archetype: 'typeled', params: { trust: true, scale: 1.25, tone: 'ground' } },
  { v: 1, section: 'hero', archetype: 'proof', params: { count: 3, summary: 'top', team: true, tone: 'surface' } },
  { v: 1, section: 'hero', archetype: 'contact', params: { fields: 4, side: 'left', tone: 'brand' } },
]

/** Brand colours that stress the contrast repairs: mid-tones, very light, very dark. */
export const BRANDS = ['#1E88E5', '#E8743B', '#FFE500', '#777777', '#0B2545', '#7FDBFF', '#C9A96E', '#FF4D00']

import type { PageContent } from '..'

/** A new site's page: trade copy, name and phone, nothing else. */
export const BARE_PAGE: PageContent = {
  trade: {
    name: 'Plumber',
    tagline: 'Local plumbers you can actually rely on.',
    ctaText: 'Get a Free Quote',
    ctaSubtext: 'Free, no-obligation quotes',
    services: ['Leak Repairs', 'Boiler Repairs', 'Bathroom Plumbing', 'Pipe Installations', 'Drain Unblocking', 'General Plumbing'],
  },
  business: { name: 'Joe Pipes', phone: '0113 496 0000', tel: 'tel:01134960000', email: '', location: 'Leeds', about: '', years: '' },
  badges: [],
  areas: [],
  hours: [],
  emergency: false,
  jobsDone: null,
  rating: null,
  reviews: [],
  photos: { hero: null, about: null, gallery: [] },
  quoteForm: false,
  year: 2026,
}

const photo = (n: number) => ({ url: `https://example.com/p${n}.jpg`, alt: `Finished job ${n}` })

/** Everything filled in, so every section and nearly every archetype is allowed. */
export const RICH_PAGE: PageContent = {
  ...BARE_PAGE,
  business: { ...BARE_PAGE.business, email: 'joe@example.com', about: 'Family-run since 2009. The same two plumbers from quote to finish.', years: '15' },
  badges: ['Gas Safe registered', 'Fully insured', '12-month guarantee'],
  areas: ['Headingley', 'Roundhay', 'Chapel Allerton', 'Horsforth', 'Meanwood'],
  hours: [{ day: 'Mon – Fri', time: '8:00 – 17:30' }, { day: 'Saturday', time: '9:00 – 13:00' }],
  emergency: true,
  jobsDone: '1,200+',
  rating: { score: 4.8, count: 27 },
  reviews: RICH.reviews,
  photos: { hero: RICH.photo, about: photo(0), gallery: [1, 2, 3, 4, 5, 6].map(photo) },
  quoteForm: true,
}
