import type { PageContent, PagePhoto } from '../gen'

/**
 * Builder-only sample content: fills every optional slot so a theme's full range of
 * layouts can be seen. It is applied to the page content at render time and never
 * written to the site record, so it can't be saved or published (renderPage also
 * refuses content marked `sample`).
 */
export const SAMPLE_REVIEWS: PageContent['reviews'] = [
  { text: 'Came out on a Sunday for a burst pipe. Fixed in an hour, fair price, and left the kitchen spotless.', author: 'Sarah M', location: 'Knaresborough', rating: 5 },
  { text: 'Quoted, turned up on the day and finished early. Really pleased with the result.', author: 'James P', location: 'Ripon', rating: 5 },
  { text: 'Patient with all our questions and lovely with the kids. Would happily recommend.', author: 'Priya K', location: 'Harrogate', rating: 5 },
  { text: 'Clear price up front and no surprises on the bill. Tidy work throughout.', author: 'Mrs E. Walsh', location: 'Pannal', rating: 4 },
]

export function withSample(c: PageContent, photos: readonly PagePhoto[]): PageContent {
  const [hero, about, ...gallery] = photos
  return {
    ...c,
    business: {
      ...c.business,
      name: c.business.name || 'Hartley & Sons',
      phone: c.business.phone || '01632 960 123',
      tel: c.business.tel ?? 'tel:01632960123',
      email: c.business.email || 'hello@example.com',
      location: c.business.location || 'Harrogate',
      about: c.business.about || 'Father and son, working across the district since 1998. The person who quotes is the person who does the job.',
      years: c.business.years || '26',
    },
    badges: c.badges.length ? c.badges : ['Fully insured', 'Fixed written quotes', '12-month guarantee'],
    areas: c.areas.length ? c.areas : ['Harrogate', 'Knaresborough', 'Ripon', 'Pannal', 'Wetherby', 'Boroughbridge'],
    hours: c.hours.length ? c.hours : [{ day: 'Mon – Fri', time: '7:00 – 19:00' }, { day: 'Saturday', time: '8:00 – 14:00' }],
    emergency: true,
    jobsDone: c.jobsDone ?? '1,200+',
    rating: c.rating ?? { score: 4.9, count: 86 },
    reviews: c.reviews.length ? c.reviews : SAMPLE_REVIEWS,
    photos: {
      hero: c.photos.hero ?? hero ?? null,
      about: c.photos.about ?? about ?? null,
      gallery: c.photos.gallery.length ? c.photos.gallery : gallery,
    },
    // Forms don't send yet (FEATURES.enquiries), but the sample shows their layouts too.
    quoteForm: true,
    sample: true,
  }
}
