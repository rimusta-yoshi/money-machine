import { describe, expect, it } from 'vitest'
import { renderPage } from '../gen'
import { heroView } from '../gen/hero/content'
import { publishedPage } from './page'
import { tradeById, trades } from '../trades'
import { createSite } from './defaults'
import { HEADLINE_SUGGESTIONS, pickedSuggestion, suggestHeadlines } from './headlines'
import { LIMITS } from './limits'
import { pageContent } from './pageContent'
import { parseSite } from './parse'
import type { Site } from './schema'

const plumber = tradeById.plumber
const at = (site: Site, location: string): Site => ({ ...site, business: { ...site.business, location } })

describe('headline suggestions', () => {
  it('offers three, naming the town twice when there is one', () => {
    const s = suggestHeadlines(at(createSite(plumber, 3), 'Harrogate'), plumber)
    expect(s).toHaveLength(HEADLINE_SUGGESTIONS)
    expect(s.filter(h => h.includes('Harrogate'))).toHaveLength(2)
    expect(new Set(s).size).toBe(3)
    expect(s.join(' ')).not.toContain('{town}')
  })

  it('offers three without a town, and never a placeholder', () => {
    for (const trade of trades) {
      const s = suggestHeadlines(createSite(trade, 5), trade)
      expect(s).toHaveLength(3)
      for (const h of s) {
        expect(h).not.toContain('{')
        expect(h.length).toBeLessThanOrEqual(LIMITS.headline)
      }
    }
  })

  it('stays within the limit with the longest town allowed', () => {
    const town = 'Knaresborough-upon-Wolverhampton'.slice(0, LIMITS.location)
    for (const trade of trades) {
      for (const h of suggestHeadlines(at(createSite(trade, 9), town), trade)) expect(h.length).toBeLessThanOrEqual(LIMITS.headline)
    }
  })

  it('is the same for the same site, and varies between sites', () => {
    const a = at(createSite(plumber, 11), 'Leeds')
    expect(suggestHeadlines(a, plumber)).toEqual(suggestHeadlines(a, plumber))
    const seen = new Set(Array.from({ length: 12 }, (_, i) => suggestHeadlines(at(createSite(plumber, 100 + i), 'Leeds'), plumber).join('|')))
    expect(seen.size).toBeGreaterThan(3)
  })

  it('knows which suggestion is picked', () => {
    expect(pickedSuggestion(null, ['a', 'b'])).toBe(-1)
    expect(pickedSuggestion('b', ['a', 'b'])).toBe(1)
    expect(pickedSuggestion('mine', ['a', 'b'])).toBe(-1)
  })
})

describe('the customer’s headline', () => {
  const base = at(createSite(plumber, 21), 'Leeds')

  it('leaves the page exactly as before until one is picked', () => {
    const before = renderPage(publishedPage(base, plumber), base.style.resolved, pageContent(base, plumber, undefined, 2026))
    const parsed = parseSite(JSON.parse(JSON.stringify(base)))
    const after = renderPage(publishedPage(parsed, plumber), parsed.style.resolved, pageContent(parsed, plumber, undefined, 2026))
    expect(after).toBe(before)
    expect(heroView(pageContent(base, plumber)).headline).toBe(plumber.tagline)
  })

  it('is the hero headline once picked; the title and meta stay from the basics', () => {
    const site: Site = { ...base, content: { ...base.content, headline: 'Leeds plumbing, done right.' } }
    expect(heroView(pageContent(site, plumber)).headline).toBe('Leeds plumbing, done right.')
    expect(pageContent(site, plumber).trade.tagline).toBe(plumber.tagline)
  })

  it('is limited to 60 characters and may be cleared', () => {
    const ok = { ...base, content: { ...base.content, headline: 'x'.repeat(LIMITS.headline) } }
    expect(() => parseSite(ok)).not.toThrow()
    expect(() => parseSite({ ...base, content: { ...base.content, headline: 'x'.repeat(LIMITS.headline + 1) } })).toThrow()
    expect(parseSite({ ...base, content: { ...base.content, headline: null } }).content.headline).toBeNull()
  })
})
