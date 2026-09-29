import { describe, expect, it } from 'vitest'
import { contact } from '../gen/sections/contact'
import { estimateMeasurer, generateHeroOptions, generateOptions, heroView, renderPage, viewOf } from '../gen'
import { plumber } from '../trades/plumber'
import { createSite } from './defaults'
import { FEATURES } from './features'
import { publishedPage } from './page'
import { pageContent } from './pageContent'

const site = {
  ...createSite(plumber, 3),
  business: { name: 'Joe Pipes', phone: '0113 496 0000', location: 'Leeds', about: '', yearsInBusiness: '', email: 'joe@example.com' },
}

describe('enquiries feature flag', () => {
  it('is off until enquiries are wired up', () => {
    expect(FEATURES.enquiries).toBe(false)
  })

  it('hides the Contact-panel hero while off, even when there is an email', () => {
    const content = heroView(pageContent(site, plumber))
    expect(content.quoteForm).toBe(false)
    const options = generateHeroOptions({ batchSeed: 1, content, style: site.style.resolved, measurer: estimateMeasurer })
    expect(options.gated.map(g => g.archetype)).toContain('contact')
    expect([...options.valid, ...options.rejected].some(c => c.spec.archetype === 'contact')).toBe(false)
  })

  it('hides the contact section’s form layout too, while keeping phone and email layouts', () => {
    const options = generateOptions(contact, { batchSeed: 1, content: viewOf('contact', pageContent(site, plumber)) as never, style: site.style.resolved, measurer: estimateMeasurer })
    expect(options.gated.map(g => g.archetype)).toContain('form')
    expect(options.shown.length).toBeGreaterThan(0)
  })

  it('brings the forms back when switched on', () => {
    expect(pageContent(site, plumber, { enquiries: true }).quoteForm).toBe(true)
    expect(pageContent({ ...site, business: { ...site.business, email: '' } }, plumber, { enquiries: true }).quoteForm).toBe(false)
  })

  it('never publishes a form that was saved before the flag went off', () => {
    const saved = {
      ...site,
      sections: {
        hero: { seed: 1, spec: { v: 1 as const, section: 'hero' as const, archetype: 'contact' as const, params: { fields: 3, side: 'right' as const, tone: 'ground' as const } } },
        contact: { seed: 1, spec: { v: 1 as const, section: 'contact' as const, archetype: 'form' as const, params: { fields: 4 as const } } },
      },
    }
    const html = renderPage(publishedPage(saved, plumber), saved.style.resolved, pageContent(saved, plumber))
    expect(html).not.toContain('sb-hero--contact')
    expect(html).not.toContain('sb-contact--form')
    expect(html).not.toContain('<form')
  })
})
