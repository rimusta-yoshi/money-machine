import { describe, expect, it } from 'vitest'
import { renderPage } from '../gen'
import { withSample } from '../sample/content'
import { plumber } from '../trades/plumber'
import { createSite } from './defaults'
import { publishedPage } from './page'
import { pageContent } from './pageContent'
import { parseSite } from './parse'

// samplePhotos() draws on a canvas, which node doesn't have; plain https photos stand in.
const PHOTOS = [1, 2, 3, 4, 5].map(i => ({ url: `https://example.com/sample${i}.jpg`, alt: `Sample photo ${i}` }))
const site = createSite(plumber, 7)

describe('sample content', () => {
  it('can be previewed but never published', () => {
    const content = withSample(pageContent(site, plumber), PHOTOS)
    expect(content.sample).toBe(true)
    const page = publishedPage(site, plumber)
    expect(() => renderPage(page, site.style.resolved, content)).toThrow(/previews only/)
    expect(() => renderPage(page, site.style.resolved, content, { preview: false })).toThrow(/previews only/)
    expect(renderPage(page, site.style.resolved, content, { preview: true })).toContain('Hartley &amp; Sons')
  })

  it('never reaches a record: sample fields are stripped when a site is parsed', () => {
    const sampled = withSample(pageContent(site, plumber), PHOTOS)
    const tampered = { ...site, sample: true, content: { ...site.content, sample: true }, business: { ...site.business, sample: true } }
    const parsed = parseSite(JSON.parse(JSON.stringify(tampered)))
    expect(parsed).not.toHaveProperty('sample')
    expect(parsed.content).not.toHaveProperty('sample')
    expect(parsed.business).not.toHaveProperty('sample')
    expect(parsed).toEqual(site)
    // The page built from the parsed record is real content only, so it publishes.
    const content = pageContent(parsed, plumber)
    expect(content.sample).toBeUndefined()
    expect(JSON.stringify(content)).not.toContain(sampled.business.name)
    expect(() => renderPage(publishedPage(parsed, plumber), parsed.style.resolved, content)).not.toThrow()
  })
})
