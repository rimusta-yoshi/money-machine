// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import axe from 'axe-core'
import { THEME_KEYS } from '../../gen'
import type { ThemeKey } from '../../gen'
import { trades } from '../../trades'
import { createSite } from '../../site/defaults'
import { withRhythm } from '../../site/page'
import type { Site } from '../../site/schema'
import { DEFAULT_THEME, styleRecord } from '../../site/style'
import type { TradeConfig } from '../../types'
import { SitePage } from './SitePage'

afterEach(cleanup)

const FULL_CONTENT: Site['content'] = {
  badges: ['Gas Safe Registered', 'Fully Insured'],
  areas: ['Headingley', 'Roundhay', 'Horsforth'],
  hours: [{ day: 'Mon – Fri', time: '8:00 – 17:00' }],
  emergency: true,
  jobsDone: '500+',
  rating: { score: 4.8, count: 27 },
  reviews: [
    { author: 'Sam P.', location: 'Leeds', text: 'Quick and tidy.', rating: 5 },
    { author: 'Ria K.', location: '', text: 'Fair price, great work.', rating: 5 },
    { author: 'Tom B.', location: 'Otley', text: 'Would use again.', rating: 4 },
  ],
  photos: {
    hero: { url: 'https://example.com/hero.jpg', alt: 'Van parked outside a house' },
    about: { url: 'https://example.com/team.jpg', alt: 'The team' },
    gallery: [1, 2, 3, 4].map(i => ({ url: `https://example.com/g${i}.jpg`, alt: `Finished job ${i}` })),
  },
}

function makeSite(trade: TradeConfig, theme: ThemeKey, seed: number, full: boolean): Site {
  const base = createSite(trade, seed)
  return withRhythm({
    ...base,
    style: theme === base.style.theme ? base.style : styleRecord(theme, base.brandColor, seed),
    business: { name: 'Joe Pipes', phone: '0113 496 0000', location: 'Leeds', about: '', yearsInBusiness: full ? '12' : '', email: 'joe@example.com' },
    extras: ['reviews'],
    content: full ? FULL_CONTENT : base.content,
  }, trade)
}

// Each trade's own theme at a few style seeds, and every other theme at one seed.
const cases = trades.flatMap(trade => THEME_KEYS.flatMap(theme =>
  (theme === DEFAULT_THEME[trade.id] ? [11, 22, 33] : [44]).flatMap(seed => [true, false].map(full => ({ trade, theme, seed, full })))))

async function axeViolations(container: HTMLElement) {
  const result = await axe.run(container, {
    // jsdom has no layout engine; contrast is checked by the generator and by axe in a real browser.
    rules: { 'color-contrast': { enabled: false } },
  })
  return result.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)
}

const headingLevels = (c: HTMLElement) => Array.from(c.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => Number(h.tagName[1]))

describe.each(cases)('$trade.id · $theme · style $seed · full content: $full', ({ trade, theme, seed, full }) => {
  const site = makeSite(trade, theme, seed, full)
  const renderPage = () => render(<SitePage site={site} trade={trade} />).container

  it('has no axe violations', async () => {
    expect(await axeViolations(renderPage())).toEqual([])
  })

  it('has exactly one h1 and never skips a heading level', () => {
    const levels = headingLevels(renderPage())
    expect(levels.filter(l => l === 1)).toHaveLength(1)
    levels.forEach((level, i) => { if (i > 0) expect(level - levels[i - 1]).toBeLessThanOrEqual(1) })
  })

  it('names every section after its heading, and ids are unique', () => {
    const c = renderPage()
    c.querySelectorAll('section').forEach(section => {
      const labelId = section.getAttribute('aria-labelledby')
      expect(labelId, section.className).toBeTruthy()
      expect(document.getElementById(labelId!)?.textContent?.trim()).toBeTruthy()
    })
    const ids = Array.from(c.querySelectorAll('[id]')).map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has a skip link, header, main landmark and footer', () => {
    const c = renderPage()
    expect(c.querySelector('a[href="#main"]')).not.toBeNull()
    expect(c.querySelector('header')).not.toBeNull()
    expect(c.querySelector('main#main')).not.toBeNull()
    expect(c.querySelector('footer')).not.toBeNull()
  })

  it('renders the chosen theme', () => {
    expect(renderPage().querySelector(`header.sb-hd .sb-header.sb-th--${theme}`)).not.toBeNull()
  })

  it('points every in-page link (header nav, quote buttons) at a section on the page', () => {
    const c = renderPage()
    const nav = c.querySelector('header nav')
    if (nav) expect(nav.getAttribute('aria-label')).toBeTruthy()
    c.querySelectorAll('a[href^="#"]').forEach(a => {
      const id = a.getAttribute('href')!.slice(1)
      expect(c.querySelector(`[id="${id}"]`), a.getAttribute('href')!).not.toBeNull()
    })
  })

  it('makes the phone number a real tel: link', () => {
    expect(renderPage().querySelector('a[href="tel:01134960000"]')).not.toBeNull()
  })

  it('hides decorative icons from screen readers and names star ratings', () => {
    const c = renderPage()
    c.querySelectorAll('svg').forEach(svg => expect(svg.getAttribute('aria-hidden')).toBe('true'))
    c.querySelectorAll('.sb-stars').forEach(stars => {
      expect(stars.getAttribute('role')).toBe('img')
      expect(stars.getAttribute('aria-label')).toMatch(/^Rated [\d.]+ out of 5$/)
    })
  })

  it('lets keyboard users reach sideways-scrolling areas', () => {
    renderPage().querySelectorAll('[data-scroll]').forEach(el => {
      expect(el.getAttribute('tabindex')).toBe('0')
      expect(el.getAttribute('aria-label')).toBeTruthy()
    })
  })

  if (!full) {
    it('publishes nothing that was not in the record', () => {
      const text = renderPage().textContent ?? ''
      for (const claim of ['4.8', '4.9', 'reviews', 'years in business', 'jobs done', 'Example', 'Headingley', '★']) {
        expect(text, claim).not.toContain(claim)
      }
      // Sections with no content of their own are left out.
      for (const cls of ['sb-trust-bar', 'sb-gallery', 'sb-certifications', 'sb-testimonials', 'sb-areas']) {
        expect(renderPage().querySelector(`.${cls}`), cls).toBeNull()
      }
    })
  }
})
