// @vitest-environment jsdom
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BRAND } from '../../brand/config'
import { tradeFromSearch } from '../../builder/steps'
import { packImages } from '../../packs/check'
import { PAGE_PACKS } from '../../packs/pages'
import { carrySource } from '../carry'
import { notFoundBody, notFoundHead } from '../notFound'
import { exampleFiles } from './exampleSite'
import { hubBody, hubHead } from './hub'
import { exampleShot, HUB_PATH, ogImage, startPath, typePath } from './paths'
import { startButton, typePageBody, typePageHead, withArticle } from './typePage'

const ORIGIN = 'https://localblocks.co.uk'
const publicFile = (path: string) => existsSync(join(process.cwd(), 'public', path))
const OPTIONS = { origin: ORIGIN, pricePence: 9900, hasShot: (path: string) => publicFile(path.slice(1)) }
const dom = (html: string) => new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, 'text/html')
const ldOf = (head: string) => [...head.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m => JSON.parse(m[1]))

describe.each(PAGE_PACKS)('the page for $plural', pack => {
  const head = typePageHead(pack, OPTIONS)
  const doc = dom(typePageBody(pack, OPTIONS))

  it('has its own title, description, address and preview image', () => {
    expect(head).toContain(`<title>${pack.landing.title} · ${BRAND.name}</title>`)
    expect(head).toContain(`<link rel="canonical" href="${ORIGIN}/websites-for/${pack.slug}/">`)
    expect(head).toContain(`<meta property="og:image" content="${ORIGIN}${ogImage(pack)}">`)
    expect(publicFile(ogImage(pack).slice(1))).toBe(true)
  })

  it('marks up its FAQs and breadcrumbs for search engines', () => {
    const [faq, crumbs] = ldOf(head)
    expect(faq['@type']).toBe('FAQPage')
    expect(faq.mainEntity.map((q: { name: string }) => q.name)).toEqual(pack.landing.faqs.map(f => f.q))
    expect(crumbs.itemListElement.map((c: { item: string }) => c.item)).toEqual([`${ORIGIN}/`, `${ORIGIN}${HUB_PATH}`, `${ORIGIN}${typePath(pack)}`])
  })

  it('starts the builder with the trade picked, from every start button', () => {
    const starts = [...doc.querySelectorAll<HTMLAnchorElement>('a[data-build]')]
    expect(starts.length).toBeGreaterThanOrEqual(3)
    for (const a of starts) expect(a.getAttribute('href')).toBe(startPath(pack))
    expect(doc.body.textContent).toContain(startButton(pack))
    expect(tradeFromSearch(new URL(startPath(pack), ORIGIN).search)).toBe(pack.id)
  })

  it('shows the trade’s own content: one h1, three examples, the checklist, services, FAQs', () => {
    expect(doc.querySelectorAll('h1')).toHaveLength(1)
    expect(doc.querySelector('h1')?.textContent).toBe(pack.landing.headline)
    expect([...doc.querySelectorAll('.wf-example-name')].map(e => e.textContent)).toEqual(pack.landing.examples.map(e => e.name))
    expect(doc.querySelectorAll('.wf-need')).toHaveLength(pack.landing.needs.length)
    expect(doc.querySelectorAll('.wf-panel--services li')).toHaveLength(pack.services.length)
    expect(doc.querySelectorAll('.hp-faq')).toHaveLength(pack.landing.faqs.length)
    expect(doc.body.textContent).toContain(`What ${withArticle(pack.name.toLowerCase())} website needs`)
    // Headings go h1 -> h2 -> h3, never skipping a level.
    const levels = [...doc.querySelectorAll('h1, h2, h3')].map(h => Number(h.tagName[1]))
    levels.forEach((l, i) => { if (i) expect(l - levels[i - 1]).toBeLessThanOrEqual(1) })
  })

  it('has every example screenshot, and links to the hub, the homepage and the other trades', () => {
    for (const n of [0, 1, 2]) expect(doc.querySelector(`img[src="${exampleShot(pack, n)}"]`)).not.toBeNull()
    const links = [...doc.querySelectorAll('a')].map(a => a.getAttribute('href'))
    expect(links).toContain(HUB_PATH)
    expect(links).toContain('/')
    for (const other of PAGE_PACKS.filter(p => p !== pack)) expect(links).toContain(typePath(other))
    expect(packImages(pack.slug)).toEqual({ og: ogImage(pack).slice(1), examples: [0, 1, 2].map(n => exampleShot(pack, n).slice(1)) })
  })

  it('renders each example with the real generator, kept out of search', () => {
    const ex = exampleFiles(pack, 0, ORIGIN, new Date(Date.UTC(2026, 9, 1)))
    const page = ex.files[`websites-for/${pack.slug}/example-1/index.html`]
    expect(page).toContain('<meta name="robots" content="noindex')
    expect(page).toContain(pack.landing.examples[0].name.replace(/&/g, '&amp;'))
    expect(page).toContain('/photos/')
    expect(ex.photos.length).toBeGreaterThanOrEqual(3)
    expect(ex.files[`websites-for/${pack.slug}/example-1/site.css`]).toContain('.sb-')
  })
})

describe('the hub', () => {
  it('lists every type by category, links home and to the builder', () => {
    const doc = dom(hubBody(9900))
    expect([...doc.querySelectorAll('.wf-type-link')].map(a => a.getAttribute('href')).sort()).toEqual(PAGE_PACKS.map(typePath).sort())
    expect(doc.querySelectorAll('h1')).toHaveLength(1)
    expect(hubHead(ORIGIN)).toContain(`<link rel="canonical" href="${ORIGIN}${HUB_PATH}">`)
    expect(doc.body.textContent).toContain('My business isn’t listed')
  })
})

describe('the 404 page', () => {
  it('is never indexed and links to the builder, the hub and home', () => {
    expect(notFoundHead()).toContain('<meta name="robots" content="noindex">')
    const links = [...dom(notFoundBody()).querySelectorAll('main a')].map(a => a.getAttribute('href'))
    expect(links).toEqual(expect.arrayContaining(['/build/', HUB_PATH, '/']))
  })
})

describe('carrying the ad source to the builder', () => {
  it('adds ?src= to builder links only, keeping the trade', () => {
    const doc = dom('<a data-build href="/build/?trade=roofer">Start</a><a href="/faq/">FAQ</a>')
    carrySource(doc, '?src=fb&utm_campaign=oct-test')
    expect(doc.querySelector('a[data-build]')?.getAttribute('href')).toBe('/build/?trade=roofer&src=fb&utm_campaign=oct-test')
    expect(doc.querySelector('a:not([data-build])')?.getAttribute('href')).toBe('/faq/')
  })

  it('leaves links alone without a source', () => {
    const doc = dom('<a data-build href="/build/?trade=roofer">Start</a>')
    carrySource(doc, '')
    expect(doc.querySelector('a')?.getAttribute('href')).toBe('/build/?trade=roofer')
  })
})
