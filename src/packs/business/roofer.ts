import { definePack } from '../define'
import type { PackLanding } from '../schema'

export const roofer = definePack({
  kind: 'single',
  id: 'roofer',
  slug: 'roofers',
  name: 'Roofer',
  plural: 'roofers',
  synonyms: ['roofing', 'roofing contractor', 'roof repairs', 'flat roofer', 'slater', 'guttering', 'fascias and soffits'],
  category: 'trade',
  featured: true,
  emoji: '🏠',
  look: {
    colours: { navy: '#0D2113', navyHover: '#163320', accent: '#16A34A', accentInk: '#15803D', accentTint: '#F0FDF4' },
    theme: 'workwear',
    legacyTheme: 'professional',
  },
  copy: {
    tagline: 'Roofing done properly, by local roofers.',
    cta: 'Book a free roof inspection',
    ctaNote: 'No obligation, and we come to you',
    offer: 'Free roof inspections',
  },
  services: [
    { name: 'Roof replacement', description: 'Stripped back to the rafters and re-covered in slate, tile or the closest match to your street.' },
    { name: 'Roof repairs', description: 'Slipped slates, cracked tiles and the damp patch on the bedroom ceiling, traced and fixed.' },
    { name: 'Gutters and fascias', description: 'Cleared, re-aligned or replaced in uPVC, so the rain goes where it should.' },
    { name: 'Storm damage', description: 'Quick, safe repairs after high winds, with photos for your insurer.' },
    { name: 'Flat roofing', description: 'Garages, dormers and extensions in felt, GRP fibreglass or rubber membrane.' },
    { name: 'Roof inspections', description: 'A proper look before you buy, sell or book bigger work, with photos of what we find.' },
  ],
  badges: ['Fully insured', 'Manufacturer-backed warranty', 'Emergency repairs', 'Local family business', 'Storm damage repairs'],
  sections: [
    { type: 'hero' },
    { type: 'trust_bar' },
    { type: 'services' },
    { type: 'why_us' },
    { type: 'testimonials', optional: true },
    { type: 'contact' },
  ],
  stickyCallBar: false,
  photos: [
    { file: 'roof-tiles.jpg', alt: 'Sample photo: clay roof tiles going onto battens', hero: true, credit: { licence: 'Pexels License', photographer: 'Clément Proust', page: 'https://www.pexels.com/photo/roof-construction-with-red-tiles-and-wooden-framework-31763538/' } },
    { file: 'roofer-clay-tile-roofs.jpg', alt: 'Sample photo: clay tile roofs against a blue sky', hero: true, credit: { licence: 'Pexels License', photographer: 'Jan van der Wolf', page: 'https://www.pexels.com/photo/red-roof-tiles-against-clear-blue-sky-29114658/' } },
    { file: 'roofer-slate-dormers.jpg', alt: 'Sample photo: a slate roof with two dormer windows', hero: true, credit: { licence: 'Pexels License', photographer: 'Michaela St', page: 'https://www.pexels.com/photo/slate-rooftop-with-green-shuttered-dormers-37771658/' } },
    { file: 'roofer-chimney.jpg', alt: 'Sample photo: a brick chimney on a tiled roof', hero: true, credit: { licence: 'Pexels License', photographer: 'Lena Netkach', page: 'https://www.pexels.com/photo/red-brick-chimney-on-tiled-roof-against-blue-sky-39246453/' } },
    { file: 'roofer-slate-close-up.jpg', alt: 'Sample photo: old slates on a roof, close up', hero: true, credit: { licence: 'Pexels License', photographer: 'christian hembert', page: 'https://www.pexels.com/photo/traditional-slate-roof-with-textured-patterns-37521406/' } },
    { file: 'roofer-gutter.jpg', alt: 'Sample photo: a white downpipe on a red wall', credit: { licence: 'Pexels License', photographer: 'Jan van der Wolf', page: 'https://www.pexels.com/photo/rain-gutter-on-a-wall-25907259/' } },
    { file: 'roofer-roof-renovation.jpg', alt: 'Sample photo: a roof being stripped, with a ladder by the chimney', credit: { licence: 'Pexels License', photographer: 'Clément Proust', page: 'https://www.pexels.com/photo/rustic-roof-renovation-with-chimney-and-ladder-31763534/' } },
    { file: 'roofer-tiling-in-progress.jpg', alt: 'Sample photo: a roof part way through re-tiling', credit: { licence: 'Pexels License', photographer: 'Clément Proust', page: 'https://www.pexels.com/photo/roof-installation-with-terracotta-tiles-in-progress-31763541/' } },
    { file: 'roofer-slate-roof-house.jpg', alt: 'Sample photo: a house with a slate roof and window box', credit: { licence: 'Pexels License', photographer: 'Arlind D', page: 'https://www.pexels.com/photo/charming-european-house-with-slate-roof-and-flowers-33843410/' } },
  ],
})

/** The /websites-for/ page: its own export, so the builder's code never carries it. */
export const rooferLanding: PackLanding = {
  title: 'Websites for roofers: built in 15 minutes, paid for once',
  description: 'A roofing website that builds trust fast: free inspections, warranties, storm repairs and the areas you cover, filled in for you. Pay once, no monthly fee.',
  headline: 'A roofing website people trust before you’re up the ladder',
  intro: [
    'Roofing is the trade people are most wary of. They can’t see the work, the jobs are big, and everyone has heard a cowboy story. Your site has one job: show you’re established, insured and straight with people.',
    'Pick Roofer and we lead with a free roof inspection, add repairs, replacements, flat roofs and gutters, and give you badges for warranties and storm work. Add photos of finished roofs and your site is ready to hand out on the doorstep.',
  ],
  needs: [
    { title: 'A free inspection, up front', text: 'Most roofing work starts with a look. Offering it free, with no obligation, is the easiest yes a worried homeowner can give.' },
    { title: 'Insurance and guarantees', text: 'Big jobs need reassurance. Say you’re insured and what warranty comes with new roofs and flat roofs.' },
    { title: 'Storm and emergency repairs', text: 'After a windy night people search for someone who’ll come quickly. If you do emergency work, make it obvious.' },
    { title: 'Photos from up on the roof', text: 'Customers rarely see your work up close. Photos of new ridges, valleys and flashing show them what they’re paying for.' },
    { title: 'Why you, not the next roofer', text: 'Years in the trade, local reviews and how you leave a site. A short “why choose us” section answers the cowboy worry head-on.' },
  ],
  faqs: [
    { q: 'Can I offer free roof inspections on my site?', a: 'Yes. It’s the main button on a roofer site: “Book a free roof inspection”. If you’d rather say something else, such as “Get a free quote”, you can change it.' },
    { q: 'Can I mention the guarantees I give?', a: 'Yes. Add a badge such as “10-year guarantee on new roofs” or “Manufacturer-backed warranty”. Only add what you actually offer: we never add claims for you.' },
    { q: 'I do flat roofs and fascias too. Can I list everything?', a: 'Yes. You can list up to eight services and rename any of them, so “Flat roofing” can become “GRP fibreglass roofs” if that’s what people ask you for.' },
    { q: 'Will it help after a storm, when people search for roofers?', a: 'Your site says what you do and where, in plain words search engines can read, and you can add the “Storm damage repairs” badge. Getting to the top of Google takes time and reviews, but a clear local site is the right start.' },
    { q: 'Do I need photos?', a: 'No, though they matter more for roofers than most, because customers rarely see the work up close. Sample pictures fill the gaps while you build and are never published: your live site shows only what you upload.' },
  ],
  examples: [
    { name: 'Ridgeway Roofing', location: 'Swindon', about: 'Roofers, not salesmen. We’ll get up there, take photos, and tell you whether it needs a repair or a new roof, even when the answer is a small job.', years: '17', areas: ['Swindon', 'Marlborough', 'Wootton Bassett', 'Highworth', 'Chippenham'], theme: 'workwear', seed: 13579 },
    { name: 'Holloway Slate & Tile', location: 'Cardiff', about: 'Slate and tile roofing across South Wales, from terraced repairs to full re-roofs. Every job photographed, every site swept.', years: '25', areas: ['Cardiff', 'Penarth', 'Barry', 'Caerphilly', 'Pontypridd'], theme: 'clean-pro', seed: 24681 },
    { name: 'Old Mill Roofing', location: 'Harrogate', about: 'Traditional roofing for stone cottages and period houses. We reuse good slates where we can and match the rest by eye.', years: '31', areas: ['Harrogate', 'Knaresborough', 'Ripon', 'Pateley Bridge'], theme: 'craft-heritage', seed: 35791 },
  ],
}
