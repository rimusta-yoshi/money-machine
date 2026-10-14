import { definePack } from '../define'
import type { PackLanding } from '../schema'

export const landscaper = definePack({
  kind: 'single',
  id: 'landscaper',
  slug: 'landscapers-and-gardeners',
  name: 'Landscaper',
  plural: 'landscapers and gardeners',
  synonyms: ['gardener', 'gardening', 'garden maintenance', 'landscaping', 'landscape gardener', 'tree surgeon', 'fencing', 'patios'],
  category: 'outdoor',
  featured: true,
  emoji: '🌿',
  look: {
    colours: { navy: '#0A1F0E', navyHover: '#132B18', accent: '#15803D', accentInk: '#166534', accentTint: '#F0FDF4' },
    theme: 'friendly-local',
    legacyTheme: 'family',
  },
  copy: {
    tagline: 'Gardens and landscaping from your local team.',
    cta: 'Ask for a free estimate',
    ctaNote: 'No obligation',
    offer: 'Free estimates',
  },
  services: [
    { name: 'Lawn care', description: 'Regular mowing, edging, feeding and scarifying, so the lawn looks good all season.' },
    { name: 'Garden design', description: 'A plan that suits how you use the garden, the soil you’ve got and the time you have.' },
    { name: 'Turfing', description: 'Ground cleared, levelled and new turf laid, with simple advice on keeping it alive.' },
    { name: 'Planting and borders', description: 'New beds and borders, planted for colour through the year and easy to look after.' },
    { name: 'Tree and hedge trimming', description: 'Hedges cut back and shaped, small trees pruned, and all the cuttings taken away.' },
    { name: 'Patios and paths', description: 'Porcelain, sandstone and block paving, laid on a proper base so it stays flat.' },
  ],
  badges: ['Fully insured', 'Locally owned', 'Free garden visits', 'Waste taken away'],
  sections: [
    { type: 'hero' },
    { type: 'trust_bar' },
    { type: 'gallery' },
    { type: 'services' },
    { type: 'testimonials', optional: true },
    { type: 'contact' },
  ],
  stickyCallBar: false,
  photos: [
    { file: 'garden-patio.jpg', alt: 'Sample photo: a garden patio with seating', hero: true, credit: { licence: 'Pexels License', photographer: 'Sergej (strannik-sk)', page: 'https://www.pexels.com/photo/modern-outdoor-patio-with-wooden-furniture-38188641/' } },
    { file: 'landscaper-lawn-hedges.jpg', alt: 'Sample photo: a striped lawn with clipped hedges', hero: true, credit: { licence: 'Pexels License', photographer: 'MAG Photography', page: 'https://www.pexels.com/photo/lush-garden-with-greenery-and-manicured-lawn-38194805/' } },
    { file: 'landscaper-garden-path.jpg', alt: 'Sample photo: a garden path through planting by a gazebo', hero: true, credit: { licence: 'Pexels License', photographer: 'Max Vakhtbovych', page: 'https://www.pexels.com/photo/garden-with-path-near-plants-and-trees-near-gazebo-7174111/' } },
    { file: 'landscaper-decking.jpg', alt: 'Sample photo: new timber decking with a dining set', hero: true, credit: { licence: 'Pexels License', photographer: 'Max Vakhtbovych', page: 'https://www.pexels.com/photo/terrace-in-house-7587879/' } },
    { file: 'landscaper-lawn-wall.jpg', alt: 'Sample photo: a fresh lawn beside a timber wall', hero: true, credit: { licence: 'Pexels License', photographer: 'Scott Webb', page: 'https://www.pexels.com/photo/white-wooden-wall-136097/' } },
    { file: 'landscaper-tulip-border.jpg', alt: 'Sample photo: a tulip border by a lawn', hero: true, credit: { licence: 'Pexels License', photographer: 'Ivan Dražić', page: 'https://www.pexels.com/photo/multi-colored-flowerbed-16327475/' } },
    { file: 'garden-path.jpg', alt: 'Sample photo: a paved side path by a fence', credit: { licence: 'Pexels License', photographer: 'Daniel Agundiz', page: 'https://www.pexels.com/photo/backyard-stone-path-with-wooden-fence-36866669/' } },
    { file: 'landscaper-hedge-trimming.jpg', alt: 'Sample photo: trimming a hedge with shears', credit: { licence: 'Pexels License', photographer: 'Magda Ehlers', page: 'https://www.pexels.com/photo/man-trimming-hedges-with-garden-shears-38936347/' } },
    { file: 'landscaper-lawn-mower.jpg', alt: 'Sample photo: a mower on a freshly cut lawn', credit: { licence: 'Pexels License', photographer: 'Magda Ehlers', page: 'https://www.pexels.com/photo/red-and-black-push-lawn-mower-on-green-grass-4162016/' } },
    { file: 'landscaper-stone-path.jpg', alt: 'Sample photo: a stone path between clipped hedges', credit: { licence: 'Pexels License', photographer: 'Flowers iso', page: 'https://www.pexels.com/photo/serene-stone-pathway-through-vibrant-green-garden-31363617/' } },
    { file: 'landscaper-brick-path.jpg', alt: 'Sample photo: a brick path through a garden', credit: { licence: 'Pexels License', photographer: 'Chris F', page: 'https://www.pexels.com/photo/tranquil-garden-pathway-with-lush-greenery-39810397/' } },
    { file: 'landscaper-hydrangeas.jpg', alt: 'Sample photo: hydrangeas in a raised bed', credit: { licence: 'Pexels License', photographer: 'Valeria Nikitina', page: 'https://www.pexels.com/photo/green-plants-in-the-garden-9678161/' } },
  ],
})

/** The /websites-for/ page: its own export, so the builder's code never carries it. */
export const landscaperLanding: PackLanding = {
  title: 'Websites for landscapers and gardeners, live in 15 minutes',
  description: 'A garden and landscaping website that shows off your work, with lawns, patios, planting and design ready to edit. Online in about 15 minutes for one payment.',
  headline: 'A website as good-looking as your gardens',
  intro: [
    'Gardens sell themselves in photos. A striped lawn, a new patio in the evening sun, a border in full flower: that’s what makes someone pick up the phone. Your site should get out of the way and let the pictures work.',
    'Pick Landscaper and we put a gallery near the top, then fill in lawn care, design, turfing, planting, hedges and patios. Swap in what you really do, from weekly maintenance rounds to full garden builds, and you’re live.',
  ],
  needs: [
    { title: 'A gallery of your gardens', text: 'Photos do the selling. Lead with your best finished gardens, patios and lawns, and keep adding as the seasons change.' },
    { title: 'Maintenance or builds, or both', text: 'People want to know whether you’ll cut the grass every fortnight or build them a whole new garden. Say which you do.' },
    { title: 'A free garden visit', text: 'Every garden is different, so nobody expects a price over the phone. Offering a free visit and estimate is the natural first step.' },
    { title: 'Waste taken away', text: 'Green waste is a real worry for customers. If you take it all away, say so: it’s a small line that wins jobs.' },
    { title: 'The areas you cover', text: 'Maintenance rounds work best close together. Naming your towns and villages brings in work where you already are.' },
  ],
  faqs: [
    { q: 'I mostly do maintenance rounds. Will this work for me?', a: 'Yes. Change the services to match: weekly or fortnightly mowing, hedge cutting, seasonal tidy-ups. Rewrite the top line too, so people know you take on regular work.' },
    { q: 'How many garden photos should I add?', a: 'Four to eight is a good start. The gallery layout adapts to the number you upload, and each season you can swap in fresh ones using the edit link we email you.' },
    { q: 'Can I show before-and-after shots?', a: 'Yes. Add them to your gallery side by side. Give each photo a short description, such as “Overgrown back garden, before”, so everyone can follow along.' },
    { q: 'Can I offer free garden visits?', a: 'Yes. The main button on a landscaper site is “Ask for a free estimate”, and “Free garden visits” is one of your badges. Change either if you work differently.' },
    { q: 'Does it matter that my work is seasonal?', a: 'Not at all. You can change your text and photos whenever you like, so you can push spring planting in March and hedge cutting in late summer.' },
  ],
  examples: [
    { name: 'Greenacre Gardens', location: 'Cheltenham', about: 'Friendly garden care around Cheltenham. Weekly rounds, tidy-ups and new borders, and we always take the waste with us.', years: '10', areas: ['Cheltenham', 'Charlton Kings', 'Bishops Cleeve', 'Prestbury', 'Winchcombe'], theme: 'friendly-local', seed: 79135 },
    { name: 'Fernbank Landscapes', location: 'York', about: 'Garden design and builds for York and the villages around it. Stone, timber and planting that looks better each year.', years: '18', areas: ['York', 'Haxby', 'Bishopthorpe', 'Malton', 'Tadcaster'], theme: 'craft-heritage', seed: 80246 },
    { name: 'Edge & Turf Landscaping', location: 'Reading', about: 'Patios, turf and fencing, done fast and done flat. We quote in writing and finish when we say.', years: '5', areas: ['Reading', 'Wokingham', 'Bracknell', 'Twyford'], theme: 'workwear', seed: 91357 },
  ],
}
