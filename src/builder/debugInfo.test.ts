import { describe, expect, it } from 'vitest'
import { plumber } from '../trades/plumber'
import { createSite } from '../site/defaults'
import { parseSite } from '../site/parse'
import { debugInfo } from './debugInfo'

const photo = (n: number) => ({ url: `data:image/jpeg;base64,${'A'.repeat(4000)}${n}`, alt: `Job ${n}` })

describe('debug info', () => {
  it('keeps the record but swaps photos for short stand-ins that still load', () => {
    const base = createSite(plumber, 5)
    const site = { ...base, content: { ...base.content, photos: { hero: photo(1), about: null, gallery: [photo(2), photo(3)] } } }
    const info = debugInfo(site, 'build', { section: 'gallery', batchSeed: 9, index: 1, shown: [], loading: false, samples: true }, new Date('2026-10-11T10:00:00Z'))
    expect(info).toMatchObject({ kind: 'localblocks-debug', v: 1, at: '2026-10-11T10:00:00.000Z', step: 'build', build: { section: 'gallery', batchSeed: 9 } })
    expect(info.site.content.photos.hero?.url).toBe('https://photo.invalid/own-1.jpg')
    expect(info.site.content.photos.gallery.map(p => p.url)).toEqual(['https://photo.invalid/own-2.jpg', 'https://photo.invalid/own-3.jpg'])
    expect(info.site.content.photos.gallery[1].alt).toBe('Job 3')
    expect(JSON.stringify(info).length).toBeLessThan(20_000)
    expect(parseSite(JSON.parse(JSON.stringify(info.site)))).toEqual(info.site)
    // The rest of the record is untouched.
    expect({ ...info.site, content: site.content }).toEqual(site)
  })

  it('only describes the build step while building', () => {
    expect(debugInfo(createSite(plumber, 5), 'look', { section: 'hero', batchSeed: 1, index: 0, shown: [], loading: false, samples: false }).build).toBeNull()
  })
})
