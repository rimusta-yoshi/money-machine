// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { parseSite } from '../site/parse'
import { unsavedSections } from '../site/page'
import { tradeById } from '../trades'
import { homeDocument, longDate, privacyDocument, siteCss, siteFavicon } from './document'
import type { DocumentOptions } from './document'
import { clip, robotsTxt, sitemapXml } from './meta'
import { finishedSite } from './test/sites'

const plumber = tradeById.plumber
const opts: DocumentOptions = {
  origin: 'https://joes-plumbing.siteblocks.co.uk', base: '', cssHref: '/site-abc.css', noindex: true, date: new Date('2026-10-02T12:00:00Z'),
}
const dom = (html: string) => new DOMParser().parseFromString(html, 'text/html')

describe('the test fixture', () => {
  it('is a valid record with every section saved', () => {
    const site = finishedSite()
    expect(parseSite(JSON.parse(JSON.stringify(site)))).toEqual(site)
    expect(unsavedSections(site, plumber)).toEqual([])
  })
})

describe('homeDocument', () => {
  const site = finishedSite({ content: { photos: { hero: { url: '/photos/abc123.webp', alt: 'A new boiler' }, about: null, gallery: [] } } })
  const doc = dom(homeDocument(site, plumber, opts))

  it('has a language, title, description and one h1', () => {
    expect(doc.documentElement.lang).toBe('en-GB')
    expect(doc.title).toBe("Joe's Plumbing — Plumber in Leeds")
    expect(doc.querySelector('meta[name=description]')?.getAttribute('content')).toMatch(/^Family-run since 2009/)
    expect(doc.querySelectorAll('h1')).toHaveLength(1)
    expect(doc.querySelector('main#main')).not.toBeNull()
  })

  it('carries Open Graph tags with absolute URLs, the icon and the stylesheet', () => {
    const og = (p: string) => doc.querySelector(`meta[property="${p}"]`)?.getAttribute('content')
    expect(og('og:title')).toBe("Joe's Plumbing — Plumber in Leeds")
    expect(og('og:url')).toBe('https://joes-plumbing.siteblocks.co.uk/')
    expect(og('og:image')).toBe('https://joes-plumbing.siteblocks.co.uk/photos/abc123.webp')
    expect(doc.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe('https://joes-plumbing.siteblocks.co.uk/')
    expect(doc.querySelector('link[rel=icon]')?.getAttribute('href')).toBe('/favicon.svg')
    expect(doc.querySelector('link[rel=stylesheet]')?.getAttribute('href')).toBe('/site-abc.css')
  })

  it('asks search engines to stay away while noindex is on', () => {
    expect(doc.querySelector('meta[name=robots]')?.getAttribute('content')).toBe('noindex, nofollow')
    const open = dom(homeDocument(site, plumber, { ...opts, noindex: false }))
    expect(open.querySelector('meta[name=robots]')).toBeNull()
  })

  it('links the privacy notice from the footer', () => {
    const link = doc.querySelector('footer a[href="/privacy"]')
    expect(link?.textContent).toBe('Privacy notice')
  })

  it('serves the hero photo from the site itself', () => {
    expect([...doc.querySelectorAll('img')].map(i => i.getAttribute('src'))).toContain('/photos/abc123.webp')
  })

  it('marks previews and keeps them out of search', () => {
    // A real preview token's shape: base64url, mixed case.
    const base = '/Ab3_x-YzQw9KLmN0pqRstUv12345678'
    const p = dom(homeDocument(site, plumber, { ...opts, base, preview: true, noindex: false }))
    expect(p.querySelector('aside[aria-label="Preview notice"]')?.textContent).toBe('Preview — not live yet')
    expect(p.querySelector('meta[name=robots]')?.getAttribute('content')).toBe('noindex, nofollow')
    expect(p.querySelector('link[rel=canonical]')).toBeNull()
    expect(p.querySelector(`footer a[href="${base}/privacy"]`)).not.toBeNull()
  })

  it('refuses nothing it needs: a bare record still renders', () => {
    const bare = finishedSite({ business: { about: '', location: '' }, content: { badges: null, areas: null, whyUs: null, jobsDone: null, emergency: null } })
    const d = dom(homeDocument(bare, plumber, opts))
    expect(d.title).toBe("Joe's Plumbing — Plumber")
    expect(d.querySelector('meta[name=description]')?.getAttribute('content')).toContain('Free quotes')
  })
})

describe('privacyDocument', () => {
  const site = finishedSite()
  const doc = dom(privacyDocument(site, plumber, opts))

  it('is a full page with the site header, footer and one h1', () => {
    expect(doc.title).toBe("Privacy notice — Joe's Plumbing")
    expect(doc.querySelector('header')).not.toBeNull()
    expect(doc.querySelector('footer')).not.toBeNull()
    expect([...doc.querySelectorAll('h1')].map(h => h.textContent)).toEqual(['Privacy notice'])
    expect(doc.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe('https://joes-plumbing.siteblocks.co.uk/privacy')
  })

  it('names the business, how to reach it, and the date', () => {
    const text = doc.querySelector('main')!.textContent!
    expect(text).toContain("This website belongs to Joe's Plumbing, Leeds.")
    expect(text).toContain('joe@example.com')
    expect(text).toContain('0113 496 0000')
    expect(text).toContain('Last updated 2 October 2026.')
    expect(doc.querySelector('main a[href="/"]')).not.toBeNull()
  })
})

describe('site extras', () => {
  it('builds a stylesheet with only self-hosted fonts', () => {
    const css = siteCss(finishedSite())
    expect(css).toContain("src:url('/fonts/")
    expect(css).not.toMatch(/url\(['"]?https?:|@import/)
    expect(css).toContain('.sb-preview-bar')
  })

  it('draws a favicon from the brand colour and first letter', () => {
    const svg = siteFavicon(finishedSite(), plumber)
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/)
    expect(svg).toContain('>J</text>')
  })

  it('writes a sitemap and robots rules', () => {
    const xml = sitemapXml('https://a.siteblocks.co.uk', ['/', '/privacy'], '2026-10-02')
    expect(xml).toContain('<loc>https://a.siteblocks.co.uk/privacy</loc>')
    expect(robotsTxt('https://a.siteblocks.co.uk', true)).toBe('User-agent: *\nDisallow: /\n')
    expect(robotsTxt('https://a.siteblocks.co.uk', false)).toContain('Sitemap: https://a.siteblocks.co.uk/sitemap.xml')
  })

  it('formats dates and clips descriptions at a word', () => {
    expect(longDate(new Date('2026-01-31T23:00:00Z'))).toBe('31 January 2026')
    const c = clip('word '.repeat(60))
    expect(c.length).toBeLessThanOrEqual(155)
    expect(c.endsWith('word…')).toBe(true)
  })
})
