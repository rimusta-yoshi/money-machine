// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BRAND, PAGES } from '../brand/config'
import { Logo } from '../brand/Logo'
import { fillWords, launchProblems, pageWords, placeholdersIn } from './fill'
import { render } from './markdown'
import { STATIC_PAGES } from './registry'
import { appHeaders, appRobotsTxt, appSitemap, PUBLIC_PATHS } from './seo'
import { buildPage, logoHtml } from './shell'

const ORIGIN = 'https://localblocks.co.uk'
const source = (file: string) => readFileSync(join(process.cwd(), file), 'utf8')
const built = STATIC_PAGES.map(p => ({ page: p, ...buildPage(p, source(p.source), pageWords(9900), ORIGIN) }))
const dom = (html: string) => new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, 'text/html')

describe('markdown', () => {
  it('renders headings with anchors, paragraphs, lists, notes and inline marks', () => {
    const html = render('# Title\n\nSome *soft* and **bold** text\non two lines.\n\n## What we do\n\n- one\n- [two](/terms/)\n\n1. first\n2. second\n\n> **Note:** careful\n\n---\n')
    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<p>Some <em>soft</em> and <strong>bold</strong> text on two lines.</p>')
    expect(html).toContain('<h2 id="what-we-do">What we do</h2>')
    expect(html).toContain('<ul><li>one</li><li><a href="/terms/">two</a></li></ul>')
    expect(html).toContain('<ol><li>first</li><li>second</li></ol>')
    expect(html).toContain('<aside class="pg-note"><p><strong>Note:</strong> careful</p></aside>')
    expect(html).not.toContain('---')
  })

  it('renders tables whose cells carry their column name, with roles kept for stacking on phones', () => {
    const doc = dom(render('| Data | Kept for |\n| --- | --- |\n| Emails | 2 years |\n| Counts | 13 months |'))
    expect(doc.querySelectorAll('tbody tr')).toHaveLength(2)
    expect(doc.querySelector('table')?.getAttribute('role')).toBe('table')
    expect([...doc.querySelectorAll('tbody td')].map(td => td.getAttribute('data-label'))).toEqual(['Data', 'Kept for', 'Data', 'Kept for'])
    expect(doc.querySelector('th')?.getAttribute('scope')).toBe('col')
  })

  it('escapes everything and refuses unsafe links', () => {
    expect(render('<script>alert(1)</script> & "x"')).toBe('<p>&#60;script&#62;alert(1)&#60;/script&#62; &#38; &#34;x&#34;</p>')
    expect(() => render('[x](javascript:alert(1))')).toThrow(/not allowed/)
    expect(() => render('[x](//evil.example)')).toThrow(/not allowed/)
    expect(render('[ico](https://ico.org.uk/)')).toContain('rel="noopener"')
    expect(render('![A van](/guide/van.svg)')).toContain('<img src="/guide/van.svg" alt="A van" loading="lazy">')
  })
})

describe('words and placeholders', () => {
  it('fills words from the brand config and the price, marking placeholders', () => {
    const html = fillWords('{{brand}} costs {{price}}, run by {{ owner }}', pageWords(9900))
    expect(html).toBe(`${BRAND.name} costs £99, run by <mark class="pg-todo">[FULL NAME]</mark>`)
    expect(() => fillWords('{{nope}}', pageWords(9900))).toThrow(/Unknown word/)
  })

  it('a launch build refuses pages that still have placeholders, a staging build allows them', () => {
    const pages = built.map(b => ({ path: b.page.path, html: b.html }))
    expect(launchProblems(pages, false)).toEqual([])
    const problems = launchProblems(pages, true)
    expect(problems.join('\n')).toMatch(/\/privacy\/ still says \[FULL NAME\]/)
    expect(problems.join('\n')).toMatch(/\/terms\/ still says \[DATE\]/)
    const filled = { ...pageWords(9900), owner: 'Rob Example', address: '1 High Street, Leeds', ico: 'ZA123456', updated: '1 November 2026' }
    const done = STATIC_PAGES.map(p => ({ path: p.path, html: buildPage(p, source(p.source), filled, ORIGIN).html }))
    expect(launchProblems(done, true)).toEqual([])
    expect(placeholdersIn('<p>[FULL NAME] and [ICO REGISTRATION NUMBER]</p>')).toEqual(['[FULL NAME]', '[ICO REGISTRATION NUMBER]'])
  })
})

describe('our plain pages', () => {
  it.each(built)('$page.path has one h1, a title, the footer links and no unfilled words', ({ page, head, body }) => {
    const doc = dom(body)
    expect(doc.querySelectorAll('h1')).toHaveLength(1)
    expect(doc.querySelector('h1')?.textContent).toBe(page.title)
    expect(head).toContain(`<title>${page.title} · ${BRAND.name}</title>`)
    expect(head).toContain(`<link rel="canonical" href="${ORIGIN}${page.path}">`)
    expect(body).not.toMatch(/\{\{|\}\}/)
    expect(doc.querySelector('main#main')).not.toBeNull()
    expect(doc.querySelector('a.pg-skip')?.getAttribute('href')).toBe('#main')
    const footer = [...doc.querySelectorAll('footer a')].map(a => a.getAttribute('href'))
    expect(footer).toEqual([PAGES.privacy, PAGES.terms, PAGES.hostingGuide, `mailto:${BRAND.email}`])
    // Headings go h1 -> h2 -> h3, never skipping a level.
    const levels = [...doc.querySelectorAll('h1, h2, h3')].map(h => Number(h.tagName[1]))
    levels.forEach((l, i) => { if (i) expect(l - levels[i - 1]).toBeLessThanOrEqual(1) })
  })

  it('the legal pages show the placeholders until they are filled in, and the price from the server config', () => {
    const [privacy, terms] = built
    expect(privacy.body).toContain('<mark class="pg-todo">[ICO REGISTRATION NUMBER]</mark>')
    expect(terms.body).toContain('You pay £99 once.')
    expect(terms.body).toContain(`your-name.${BRAND.domain}`)
    expect(terms.body).toContain(`href="${PAGES.hostingGuide}"`)
    expect(privacy.body).not.toMatch(/siteblocks/)
  })

  it('the logo is the same markup as the React logo', () => {
    expect(logoHtml()).toBe(renderToStaticMarkup(createElement(Logo, { href: '/' })))
  })

  it('every picture the guide shows exists', () => {
    for (const [, src] of built[2].body.matchAll(/<img src="([^"]+)"/g)) expect(() => source(join('public', src))).not.toThrow()
  })
})

describe('launch switch for search engines', () => {
  it('before launch: nothing indexed, no sitemap', () => {
    expect(appRobotsTxt(false, ORIGIN)).toBe('User-agent: *\nDisallow: /\n')
    expect(appSitemap(false, ORIGIN, new Date())).toBeNull()
    expect(appHeaders(false)).toMatch(/^\/\*\n {2}X-Robots-Tag: noindex, nofollow$/m)
  })

  it('after launch: the homepage, legal pages and guide are open, the builder and dashboard are not', () => {
    const robots = appRobotsTxt(true, ORIGIN)
    expect(robots).toContain('Disallow: /build/')
    expect(robots).toContain('Disallow: /admin/')
    expect(robots).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`)
    const sitemap = appSitemap(true, ORIGIN, new Date('2026-11-01'))!
    expect([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])).toEqual(PUBLIC_PATHS.map(p => ORIGIN + p))
    expect(PUBLIC_PATHS).toEqual(['/', '/privacy/', '/terms/', '/guide/host-your-own-site/'])
    const headers = appHeaders(true)
    expect(headers).not.toMatch(/^\/\*\n {2}X-Robots-Tag/m)
    expect(headers).toMatch(/^\/build\/\*\n {2}X-Robots-Tag: noindex, nofollow$/m)
    expect(headers).toMatch(/^\/admin\/\*\n {2}Cache-Control: no-store\n {2}X-Robots-Tag: noindex, nofollow$/m)
  })
})
