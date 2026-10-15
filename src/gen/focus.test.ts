import { describe, expect, it } from 'vitest'
import { generateSpec, SECTIONS } from '.'
import { focusAttr, img } from './core/markup'
import { pageContent } from '../site/pageContent'
import { createSite } from '../site/defaults'
import { parseSite } from '../site/parse'
import { tradeById } from '../trades'
import type { Site } from '../site/schema'
import { heroView } from './hero/content'

const plumber = tradeById.plumber
const photo = { url: 'https://example.com/p.jpg', alt: 'A boiler' }

describe('focal point', () => {
  it('adds object-position only to photos that have one', () => {
    expect(img(photo)).not.toContain('style=')
    expect(img({ ...photo, focus: { x: 20, y: 75.55 } })).toContain('style="object-position:20% 75.6%"')
    expect(focusAttr({ focus: { x: 150, y: -3 } })).toBe(' style="object-position:100% 0%"')
  })

  it('is kept with the photo in the record, within 0 to 100', () => {
    const site = createSite(plumber, 4)
    const withFocus: Site = { ...site, content: { ...site.content, photos: { ...site.content.photos, hero: { ...photo, focus: { x: 30, y: 60 }, tall: true } } } }
    expect(parseSite(withFocus).content.photos.hero).toEqual({ ...photo, focus: { x: 30, y: 60 }, tall: true })
    const bad = { ...withFocus, content: { ...withFocus.content, photos: { ...withFocus.content.photos, hero: { ...photo, focus: { x: 101, y: 0 } } } } }
    expect(() => parseSite(bad)).toThrow()
  })
})

describe('tall photos', () => {
  const site = createSite(plumber, 4)
  const contentWith = (p: typeof photo & { tall?: true }) => heroView(pageContent({ ...site, content: { ...site.content, photos: { ...site.content.photos, hero: p } } }, plumber))
  const archetypes = (c: ReturnType<typeof contentWith>) =>
    Array.from({ length: 400 }, (_, i) => generateSpec(SECTIONS.hero, i + 1, c, site.style.resolved).archetype)
  const share = (xs: string[], keys: string[]) => xs.filter(x => keys.includes(x)).length / xs.length

  it('leave a landscape photo’s layouts exactly as before', () => {
    expect(archetypes(contentWith(photo))).toEqual(archetypes(contentWith({ ...photo })))
    expect(SECTIONS.hero.tilt?.(contentWith(photo))).toBeNull()
  })

  it('favour layouts that frame a portrait photo upright', () => {
    const wide = ['overlay', 'offset', 'stacked', 'editorial']
    const flat = archetypes(contentWith(photo))
    const tall = archetypes(contentWith({ ...photo, tall: true }))
    expect(share(tall, wide)).toBeLessThan(share(flat, wide))
  })
})
