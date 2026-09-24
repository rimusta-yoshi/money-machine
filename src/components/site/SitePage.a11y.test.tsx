// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import axe from 'axe-core'
import { trades } from '../../trades'
import { createSite } from '../../site/defaults'
import type { Site } from '../../site/schema'
import type { TradeConfig } from '../../types'
import type { RenderMode } from '../../site/resolve'
import { SitePage } from './SitePage'

afterEach(cleanup)

const FULL_CONTENT: Site['content'] = {
  badges: ['Gas Safe Registered', 'Fully Insured'],
  areas: ['Headingley', 'Roundhay'],
  hours: [{ day: 'Mon – Fri', time: '8:00 – 17:00' }],
  emergency: true,
  jobsDone: '500+',
  rating: { score: 4.8, count: 27 },
  reviews: [{ author: 'Sam P.', location: 'Leeds', text: 'Quick and tidy.', rating: 5 }],
  photos: {
    hero: { url: 'https://example.com/hero.jpg', alt: 'Van parked outside a house' },
    about: { url: 'https://example.com/team.jpg', alt: 'The team' },
    gallery: [{ url: 'https://example.com/g1.jpg', alt: 'New bathroom' }],
  },
}

function makeSite(trade: TradeConfig, variantIdx: number, full: boolean): Site {
  const base = createSite(trade)
  const selections = Object.fromEntries(
    trade.sections.map(s => [s.type, s.variants[variantIdx % s.variants.length].id]),
  )
  return {
    ...base,
    business: { name: 'Joe Pipes', phone: '0113 496 0000', location: 'Leeds', about: '', yearsInBusiness: '12', email: 'joe@example.com' },
    extras: ['reviews'],
    selections,
    content: full ? FULL_CONTENT : base.content,
  }
}

const maxVariants = (t: TradeConfig) => Math.max(...t.sections.map(s => s.variants.length))

const cases = trades.flatMap(trade =>
  Array.from({ length: maxVariants(trade) }, (_, v) =>
    (['builder', 'live'] as RenderMode[]).flatMap(mode =>
      [true, false].map(full => ({ trade, v, mode, full })),
    ),
  ).flat(),
)

async function axeViolations(container: HTMLElement) {
  const result = await axe.run(container, {
    // jsdom has no layout engine, so contrast is covered by contrast.test.ts instead.
    rules: { 'color-contrast': { enabled: false } },
  })
  return result.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)
}

function headingLevels(container: HTMLElement): number[] {
  return Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => Number(h.tagName[1]))
}

describe.each(cases)('$trade.id · layout $v · $mode · full content: $full', ({ trade, v, mode, full }) => {
  const site = makeSite(trade, v, full)
  const renderPage = () => render(<SitePage site={site} trade={trade} mode={mode} />).container

  it('has no axe violations', async () => {
    expect(await axeViolations(renderPage())).toEqual([])
  })

  it('has exactly one h1 and never skips a heading level', () => {
    const levels = headingLevels(renderPage())
    expect(levels.filter(l => l === 1)).toHaveLength(1)
    levels.forEach((level, i) => {
      if (i > 0) expect(level - levels[i - 1]).toBeLessThanOrEqual(1)
    })
  })

  it('names every section after its heading', () => {
    const sections = renderPage().querySelectorAll('section')
    sections.forEach(section => {
      const labelId = section.getAttribute('aria-labelledby')
      expect(labelId, section.className).toBeTruthy()
      expect(document.getElementById(labelId!)?.textContent?.trim()).toBeTruthy()
    })
  })

  it('has a skip link, main landmark and footer', () => {
    const c = renderPage()
    const skip = c.querySelector('a[href="#main"]')
    expect(skip).not.toBeNull()
    expect(c.querySelector('main#main')).not.toBeNull()
    expect(c.querySelector('footer')).not.toBeNull()
  })

  it('makes the phone number a real tel: link', () => {
    expect(renderPage().querySelector('a[href="tel:01134960000"]')).not.toBeNull()
  })

  it('hides decorative icons from screen readers', () => {
    renderPage().querySelectorAll('svg').forEach(svg => {
      expect(svg.getAttribute('aria-hidden')).toBe('true')
    })
  })

  it('announces star ratings as words', () => {
    renderPage().querySelectorAll('.ff-stars').forEach(stars => {
      expect(stars.getAttribute('role')).toBe('img')
      expect(stars.getAttribute('aria-label')).toMatch(/^Rated [\d.]+ out of 5/)
    })
  })

  if (mode === 'live' && !full) {
    it('publishes none of the example claims', () => {
      const text = renderPage().textContent ?? ''
      for (const claim of ['312', '4.9', '2,800', '£2m', 'hello@', 'Sarah M.', 'Riverside', '24/7', 'Example']) {
        expect(text, claim).not.toContain(claim)
      }
    })
  }

  if (mode === 'builder' && !full) {
    it('labels example content visibly as an example', () => {
      expect(renderPage().querySelectorAll('.ff-example').length).toBeGreaterThan(0)
    })
  }
})
