import { definePack } from '../define'
import type { PackLanding } from '../schema'

export const plumber = definePack({
  kind: 'single',
  id: 'plumber',
  slug: 'plumbers',
  name: 'Plumber',
  plural: 'plumbers',
  synonyms: ['plumbing', 'plumbing and heating', 'heating engineer', 'gas engineer', 'boiler engineer', 'boiler repair', 'drainage'],
  category: 'trade',
  featured: true,
  emoji: '🔧',
  look: {
    colours: { navy: '#0B2545', navyHover: '#133762', accent: '#1E88E5', accentInk: '#0B5BA8', accentTint: '#E8F1FB' },
    theme: 'clean-pro',
    legacyTheme: 'professional',
  },
  copy: {
    tagline: 'Local plumbers you can rely on.',
    cta: 'Get a free quote',
    ctaNote: 'No obligation',
    offer: 'Free quotes',
  },
  services: [
    { name: 'Leak repairs', description: 'Dripping taps, weeping joints and the leak coming through the kitchen ceiling.' },
    { name: 'Boiler repairs', description: 'No heating, no hot water, pressure dropping: the jobs that can’t wait till next week.' },
    { name: 'Bathroom plumbing', description: 'New suites, showers and basins plumbed in, from first fix to the last silicone line.' },
    { name: 'Pipe installations', description: 'New runs for kitchens, extensions and outside taps, in copper or plastic.' },
    { name: 'Drain unblocking', description: 'Slow sinks, blocked toilets and gullies, cleared without the mess.' },
    { name: 'General plumbing', description: 'Toilets that won’t stop running, stiff stopcocks and everything in between.' },
  ],
  badges: ['Gas Safe registered', 'Fully insured', '24/7 emergency call-outs', 'Local family business', 'Same-day visits'],
  sections: [
    { type: 'hero' },
    { type: 'trust_bar' },
    { type: 'services' },
    { type: 'about' },
    { type: 'why_us' },
    { type: 'testimonials', optional: true },
    { type: 'areas' },
    { type: 'contact' },
  ],
  stickyCallBar: true,
  photos: [
    { file: 'bathroom.jpg', alt: 'Sample photo: a finished bathroom with a glass shower', hero: true, credit: { licence: 'Pexels License', photographer: 'Max Vakhtbovych', page: 'https://www.pexels.com/photo/interior-of-modern-bathroom-with-glass-shower-cabin-7005268/' } },
    { file: 'plumber-bathroom-bath.jpg', alt: 'Sample photo: a tiled bathroom with a corner bath', hero: true, credit: { licence: 'Pexels License', photographer: 'Max Vakhtbovych', page: 'https://www.pexels.com/photo/white-bathtub-and-sink-in-spacious-bathtub-at-home-6957081/' } },
    { file: 'plumber-shower-room.jpg', alt: 'Sample photo: a shower room with a freestanding bath', hero: true, credit: { licence: 'Pexels License', photographer: 'Max Vakhtbovych', page: 'https://www.pexels.com/photo/bathroom-with-partition-and-shower-cabin-7031840/' } },
    { file: 'plumber-bathroom-vanity.jpg', alt: 'Sample photo: a bathroom with a double basin and freestanding bath', hero: true, credit: { licence: 'Pexels License', photographer: 'Max Vakhtbovych', page: 'https://www.pexels.com/photo/contemporary-bathroom-with-minimalistic-interior-7045908/' } },
    { file: 'plumber-kitchen-tap.jpg', alt: 'Sample photo: a chrome kitchen tap over a round sink', hero: true, credit: { licence: 'Pexels License', photographer: 'Zulfugar Karimov', page: 'https://www.pexels.com/photo/modern-chrome-kitchen-faucet-with-running-water-34295401/' } },
    { file: 'plumber-radiator.jpg', alt: 'Sample photo: a white column radiator on a pale wall', hero: true, credit: { licence: 'Pexels License', photographer: 'Patrycja Grobelny', page: 'https://www.pexels.com/photo/white-steel-rib-radiator-in-a-new-bright-renovated-room-in-apartment-or-home-12034871/' } },
    { file: 'plumber-copper-fittings.jpg', alt: 'Sample photo: copper pipe fittings in a row', credit: { licence: 'Pexels License', photographer: 'Nic Wood', page: 'https://www.pexels.com/photo/copper-pluming-fitting-28169591/' } },
    { file: 'plumber-pipe-fitting.jpg', alt: 'Sample photo: hands tightening a pipe fitting', credit: { licence: 'Pexels License', photographer: 'Anıl Karakaya', page: 'https://www.pexels.com/photo/plumber-installs-pipe-fittings-6419128/' } },
    { file: 'plumber-radiator-fitting.jpg', alt: 'Sample photo: gloved hands fitting a radiator valve', credit: { licence: 'Pexels License', photographer: 'Sergei Starostin', page: 'https://www.pexels.com/photo/professional-plumber-installing-a-radiator-pipe-29226620/' } },
    { file: 'kitchen.jpg', alt: 'Sample photo: a fitted kitchen with wood cabinets', hero: true, credit: { licence: 'Pexels License', photographer: 'Max Vakhtbovych', page: 'https://www.pexels.com/photo/an-interior-of-a-modern-kitchen-counter-7045356/' } },
  ],
})

/** The /websites-for/ page: its own export, so the builder's code never carries it. */
export const plumberLanding: PackLanding = {
  title: 'Websites for plumbers: live in 15 minutes, no monthly fee',
  description: 'A plumbing website with your services, Gas Safe badge and call-out areas already filled in. Live in about 15 minutes. Pay once, no monthly fee.',
  headline: 'A plumbing website that gets the phone ringing',
  intro: [
    'When a pipe bursts at ten at night, nobody reads a long website. They want to know you’re local, you’re qualified and you’ll pick up. Your site should say that in the first few seconds, with your number one tap away.',
    'Pick Plumber and we fill in the rest: leak repairs, boilers, bathrooms and drains, the badges customers look for, and a section for the towns you cover. Change any of it, add a few photos of finished bathrooms, and you’re live.',
  ],
  needs: [
    { title: 'Your number, one tap away', text: 'Most people looking for a plumber are on their phone, often with water on the floor. A big call button at the top, and again at the bottom.' },
    { title: 'Gas Safe, if you do gas work', text: 'Customers and landlords check before letting anyone near a boiler. Add “Gas Safe registered” as a badge, with your number if you like.' },
    { title: 'Emergency call-outs, said plainly', text: 'If you go out at night or at weekends, say so near the top. If you don’t, say when you do work, so nobody rings at 2am.' },
    { title: 'The areas you cover', text: 'A list of towns and villages tells people you’ll actually come out to them, and helps you turn up in local searches.' },
    { title: 'Photos of finished jobs', text: 'A clean new bathroom or a tidy boiler cupboard does more than any words. Three or four good photos are plenty.' },
    { title: 'How you quote', text: 'Free quotes, fixed prices or an hourly rate: say which, so people know what they’re ringing about.' },
  ],
  faqs: [
    { q: 'Can I show my Gas Safe number on my site?', a: 'Yes. Add it as one of your badges, for example “Gas Safe registered” or “Gas Safe no. 123456”. It sits near the top where people look for it. If you don’t do gas work, just leave it off.' },
    { q: 'I mostly do heating and boilers. Does the plumber site still fit?', a: 'Yes. Your services are yours to change: swap “Bathroom plumbing” for “Boiler servicing” or “Power flushing”, and rewrite the top line to match. You can list up to eight services.' },
    { q: 'Can I say I do emergency call-outs?', a: 'Yes. Answer yes to emergency call-outs in the builder and add the “24/7 emergency call-outs” badge if you offer it. If you only work set hours, add your opening hours instead, so customers know when to ring.' },
    { q: 'Do I need my own photos?', a: 'They help a lot, but you can go live without them. While you build, we show sample photos so you can see the layout. Your published site only ever shows photos you’ve added yourself.' },
    { q: 'Will it work on my customers’ phones?', a: 'Yes. Every layout is checked on phone screens, and your number is a tap-to-call button. Most people looking for a plumber are on their phone, so that’s where we check first.' },
  ],
  examples: [
    { name: 'Brookfield Plumbing & Heating', location: 'Leeds', about: 'Two plumbers, one van, and a rule that we leave every kitchen cleaner than we found it. Boilers, bathrooms and the odd burst pipe at midnight.', years: '12', areas: ['Leeds', 'Headingley', 'Horsforth', 'Morley', 'Pudsey'], theme: 'clean-pro', seed: 41017 },
    { name: 'Tanner Plumbing', location: 'Bristol', about: 'Straight-talking plumbing across Bristol. Fixed prices for the common jobs, and we turn up when we say we will.', years: '8', areas: ['Bristol', 'Bedminster', 'Filton', 'Keynsham'], theme: 'workwear', seed: 52219 },
    { name: 'Penrose Plumbing', location: 'Truro', about: 'Family plumbers in Cornwall since 2004. Mum does the books, the boys do the bathrooms, and we all answer the phone.', years: '20', areas: ['Truro', 'Falmouth', 'Redruth', 'St Austell', 'Newquay'], theme: 'friendly-local', seed: 63331 },
  ],
}
