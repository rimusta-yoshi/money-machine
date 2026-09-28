import { describe, expect, it } from 'vitest'
import { estimateMeasurer, generateHeroOptions, renderSection } from '../gen'
import { plumber } from '../trades/plumber'
import { createSite } from './defaults'
import { FEATURES } from './features'
import { heroContent, siteHeroSpec } from './heroContent'

const site = {
  ...createSite(plumber, 3),
  business: { name: 'Joe Pipes', phone: '0113 496 0000', location: 'Leeds', about: '', yearsInBusiness: '', email: 'joe@example.com' },
}

describe('enquiries feature flag', () => {
  it('is off until enquiries are wired up', () => {
    expect(FEATURES.enquiries).toBe(false)
  })

  it('hides the Contact-panel hero while off, even when there is an email', () => {
    const content = heroContent(site, plumber)
    expect(content.quoteForm).toBe(false)
    const options = generateHeroOptions({ batchSeed: 1, content, style: site.style.resolved, measurer: estimateMeasurer })
    expect(options.gated.map(g => g.archetype)).toContain('contact')
    expect([...options.shown, ...options.valid, ...options.rejected].some(c => c.spec.archetype === 'contact')).toBe(false)
  })

  it('brings the Contact panel back when switched on', () => {
    expect(heroContent(site, plumber, { enquiries: true }).quoteForm).toBe(true)
    expect(heroContent({ ...site, business: { ...site.business, email: '' } }, plumber, { enquiries: true }).quoteForm).toBe(false)
  })

  it('never publishes a Contact panel that was saved before the flag went off', () => {
    const saved = { ...site, sections: { hero: { seed: 1, spec: { v: 1 as const, section: 'hero' as const, archetype: 'contact' as const, params: { fields: 3, side: 'right' as const, tone: 'ground' as const } } } } }
    const content = heroContent(saved, plumber)
    const html = renderSection(siteHeroSpec(saved, content), saved.style.resolved, content)
    expect(html).not.toContain('sb-hero--contact')
    expect(html).not.toContain('<form')
  })
})
