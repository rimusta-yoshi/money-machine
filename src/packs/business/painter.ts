import { definePack } from '../define'
import type { PackLanding } from '../schema'

export const painter = definePack({
  kind: 'single',
  id: 'painter',
  slug: 'painters-and-decorators',
  name: 'Painter',
  plural: 'painters and decorators',
  synonyms: ['decorator', 'painter and decorator', 'painting and decorating', 'decorating', 'house painter', 'wallpapering'],
  category: 'trade',
  featured: true,
  emoji: '🖌️',
  look: {
    colours: { navy: '#1E3A5F', navyHover: '#2A4F7C', accent: '#2563EB', accentInk: '#1D4ED8', accentTint: '#EFF6FF' },
    theme: 'craft-heritage',
    legacyTheme: 'family',
  },
  copy: {
    tagline: 'Painting and decorating with a finish you’ll notice.',
    cta: 'Get a free quote',
    ctaNote: 'No obligation',
    offer: 'Free quotes',
  },
  /** Hero headline suggestions in the builder ({town} is the customer's location). */
  headlines: [
    'Painting and decorating, done with care.',
    'Clean lines, tidy rooms, fair prices.',
    'A finish you’ll be proud to show off.',
    'Your local decorator in {town}.',
    '{town} painting and decorating, done right.',
    'Interiors and exteriors across {town}.',
  ],
  services: [
    { name: 'Interior painting', description: 'Walls, ceilings and woodwork, with the cutting-in done properly and the carpets kept clean.' },
    { name: 'Exterior painting', description: 'Render, windows, doors and fascias, prepared well so the paint lasts more than one winter.' },
    { name: 'Kitchen cabinet painting', description: 'A new-looking kitchen for a fraction of the price of replacing it.' },
    { name: 'Deck staining', description: 'Cleaned, sanded and stained or oiled, ready for the summer.' },
    { name: 'Colour advice', description: 'Help choosing colours that work with the light in the room, before a drop of paint goes on.' },
    { name: 'Feature walls', description: 'One bold wall, a mural-style block of colour or a smart half-panelled finish.' },
  ],
  badges: ['Fully insured', 'Local family business', 'Dust sheets and a tidy finish', 'Colour advice included'],
  sections: [
    { type: 'hero' },
    { type: 'trust_bar' },
    { type: 'gallery' },
    { type: 'services' },
    { type: 'testimonials', optional: true },
    { type: 'contact' },
  ],
  stickyCallBar: true,
  photos: [
    { file: 'painting-wall.jpg', alt: 'Sample photo: painting a ceiling with a roller', credit: { licence: 'Pexels License', photographer: 'Ksenia Chernaya', page: 'https://www.pexels.com/photo/crop-woman-painting-walls-at-home-5691677/' } },
    { file: 'painter-roller-grey-wall.jpg', alt: 'Sample photo: a roller on a freshly painted grey wall', hero: true, credit: { licence: 'Pexels License', photographer: 'Malte Luk', page: 'https://www.pexels.com/photo/person-holding-paint-roller-on-wall-1669754/' } },
    { file: 'painter-roller-white-wall.jpg', alt: 'Sample photo: a roller on a clean white wall', hero: true, credit: { licence: 'Pexels License', photographer: 'Polina Tankilevitch', page: 'https://www.pexels.com/photo/a-person-painting-a-wall-5583116/' } },
    { file: 'painter-roller-cream-wall.jpg', alt: 'Sample photo: a yellow roller on a cream wall', hero: true, credit: { licence: 'Pexels License', photographer: 'Polina Tankilevitch', page: 'https://www.pexels.com/photo/hand-holding-a-pain-roller-5583126/' } },
    { file: 'painter-finished-room.jpg', alt: 'Sample photo: a freshly decorated empty room', hero: true, credit: { licence: 'Pexels License', photographer: 'Max Vakhtbovych', page: 'https://www.pexels.com/photo/clean-unfurnished-apartment-room-8146336/' } },
    { file: 'painter-rollers.jpg', alt: 'Sample photo: two paint rollers on a wooden floor', hero: true, credit: { licence: 'Pexels License', photographer: 'Polina Tankilevitch', page: 'https://www.pexels.com/photo/paint-rollers-on-wooden-surface-5583052/' } },
    { file: 'painter-rollers-brushes.jpg', alt: 'Sample photo: rollers and brushes laid out ready', credit: { licence: 'Pexels License', photographer: 'Polina Tankilevitch', page: 'https://www.pexels.com/photo/painting-materials-on-wooden-table-5583059/' } },
    { file: 'painter-stepladder-room.jpg', alt: 'Sample photo: a stepladder and dust sheets in a room being painted', credit: { licence: 'Pexels License', photographer: 'Blue Bird', page: 'https://www.pexels.com/photo/brown-wooden-stepladder-in-a-room-7217930/' } },
    { file: 'painter-roller-wall.jpg', alt: 'Sample photo: a roller on a white wall, close up', credit: { licence: 'Pexels License', photographer: 'Blue Bird', page: 'https://www.pexels.com/photo/people-painting-the-wall-7218011/' } },
  ],
})

/** The /websites-for/ page: its own export, so the builder's code never carries it. */
export const painterLanding: PackLanding = {
  title: 'Websites for painters and decorators, live in 15 minutes',
  description: 'A painting and decorating website built around your photos: services, badges and areas filled in for you. Live in about 15 minutes, paid for once.',
  headline: 'Let your finished rooms do the talking',
  intro: [
    'People choose a decorator with their eyes. They want to see straight lines, clean edges and rooms they’d like to live in. So a painter’s site starts with a gallery, high up the page, not a wall of text.',
    'Pick Painter and we fill in interior and exterior work, cabinets, colour advice and the badges people look for. Add your best before-and-afters, change anything you like, and it’s ready to send to the next person who asks for a quote.',
  ],
  needs: [
    { title: 'A gallery near the top', text: 'Your work sells you. Five or six sharp photos of finished rooms and front doors are worth more than any description.' },
    { title: 'Inside and out', text: 'Say whether you do exteriors, and how high you’ll go. People often don’t know that a decorator does render and fascias too.' },
    { title: 'How you protect the house', text: 'Dust sheets, masking, moving furniture back. The tidy finish is what people worry about most, so say how you handle it.' },
    { title: 'Insured, and how long you’ve been going', text: 'Customers are letting you into their home for days at a time. Years in the trade and your insurance put them at ease.' },
    { title: 'Lead times', text: 'Good decorators get booked up. A line about when you can start saves you calls from people who need it done tomorrow.' },
  ],
  faqs: [
    { q: 'Can I show before-and-after photos?', a: 'Yes. Add them to your gallery: a before shot next to the finished room works well. Write a short description for each photo, so people using screen readers know what they show.' },
    { q: 'I’m a decorator more than a painter. Will this suit me?', a: 'Yes. Change the services to match what you do, such as wallpapering, coving or sash window restoration, and rewrite the top line. Everything on the page is yours to edit.' },
    { q: 'How many photos do I need?', a: 'Four to eight good ones is plenty. The gallery picks layouts that suit how many you have, and you can add more later with the edit link we email you.' },
    { q: 'Will people know which area I cover?', a: 'Painter sites keep your gallery near the top instead of a list of areas. Put your main town in “Where do you work?” and it’s used in the wording across your page, so people can see you’re local.' },
    { q: 'Do customers need to ring, or can they email?', a: 'Both. Your phone number is a tap-to-call button and your email address sits beside it, so people who’d rather write can send you a photo of the room straight away.' },
  ],
  examples: [
    { name: 'Ashdown Decorators', location: 'Tunbridge Wells', about: 'Careful, unhurried decorating for period homes. Sash windows, panelling and the sort of hallway that takes three coats to get right.', years: '22', areas: ['Tunbridge Wells', 'Crowborough', 'Tonbridge', 'Sevenoaks'], theme: 'craft-heritage', seed: 70113 },
    { name: 'Fresh Coat Painting', location: 'Leicester', about: 'Fast, clean painting for homes and rentals across Leicester. Fixed quotes, and the furniture goes back where it was.', years: '6', areas: ['Leicester', 'Oadby', 'Wigston', 'Birstall', 'Loughborough'], theme: 'clean-pro', seed: 81421 },
    { name: 'Okafor Painting & Decorating', location: 'Croydon', about: 'I’m Michael. I paint and paper homes across south London, and I’ll tell you honestly if a colour won’t work.', years: '9', areas: ['Croydon', 'Purley', 'Sutton', 'Streatham', 'Norwood'], theme: 'friendly-local', seed: 92737 },
  ],
}
