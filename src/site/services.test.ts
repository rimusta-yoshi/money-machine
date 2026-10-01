import { describe, expect, it } from 'vitest'
import { renderPage, resolvePage } from '../gen'
import { withSamplePhotos } from '../sample/content'
import { tradeById } from '../trades'
import { createSite } from './defaults'
import { pageOrder, publishedPage } from './page'
import { pageContent } from './pageContent'
import { parseSite } from './parse'
import { siteReducer } from './reducer'

const electrician = tradeById.electrician
const base = () => {
  const s = createSite(electrician, 4)
  return { ...s, business: { ...s.business, name: 'Spark Co', phone: '01632 960 555' } }
}

describe('the customer’s own services', () => {
  it('start as the trade’s usual services', () => {
    expect(pageContent(base(), electrician).trade.services).toEqual(electrician.services)
  })

  it('replace them once edited, in the customer’s order', () => {
    const s = siteReducer(base(), { type: 'setContent', patch: { services: ['Smart thermostats', 'Rewiring'] } })!
    expect(pageContent(s, electrician).trade.services).toEqual(['Smart thermostats', 'Rewiring'])
    expect(parseSite(JSON.parse(JSON.stringify(s))).content.services).toEqual(['Smart thermostats', 'Rewiring'])
  })

  it('an emptied list hides the services section rather than falling back', () => {
    const s = siteReducer(base(), { type: 'setContent', patch: { services: [] } })!
    expect(publishedPage(s, electrician).map(x => x.type)).not.toContain('services')
  })
})

describe('sample photos while building', () => {
  const photos = [1, 2, 3, 4].map(n => ({ url: `https://example.com/s${n}.jpg`, alt: `Sample photo ${n}` }))

  it('fill only the empty slots, and mark the content as a sample', () => {
    const own = { url: 'https://example.com/mine.jpg', alt: 'My van' }
    const c = pageContent({ ...base(), content: { ...base().content, photos: { hero: own, about: null, gallery: [] } } }, electrician)
    const shown = withSamplePhotos(c, photos)
    expect(shown.photos.hero).toBe(own)
    expect(shown.photos.about).toBe(photos[1])
    expect(shown.photos.gallery).toEqual(photos.slice(2))
    expect(shown.sample).toBe(true)
  })

  it('leave a site with all its own photos as it is', () => {
    const own = (n: number) => ({ url: `https://example.com/m${n}.jpg`, alt: `Mine ${n}` })
    const c = pageContent({ ...base(), content: { ...base().content, photos: { hero: own(1), about: own(2), gallery: [own(3)] } } }, electrician)
    expect(withSamplePhotos(c, photos)).toBe(c)
  })

  it('can never be published', () => {
    const s = base()
    const content = withSamplePhotos(pageContent(s, electrician), photos)
    const page = resolvePage({ order: pageOrder(electrician, s), saved: {}, content, style: s.style.resolved, styleSeed: s.style.seed })
    expect(() => renderPage(page, s.style.resolved, content)).toThrow(/previews only/)
  })
})
