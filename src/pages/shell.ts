import { BRAND } from '../brand/config'
import { FOOTER_LINKS } from '../brand/footer'
import { fillWords } from './fill'
import type { PageWords } from './fill'
import { esc, HOME_OG_IMAGE, socialTags } from './html'
import { render } from './markdown'
import type { StaticPage } from './registry'

/**
 * Our plain pages (privacy, terms, the hosting guide) as finished HTML, built from their
 * Markdown at build time: no JavaScript on the page at all. Same Block Party look as the
 * homepage: the logo bar, a coloured title tile, the text, the footer.
 */

/** The logo as plain HTML: the same markup as <Logo href="/" /> (brand/Logo.tsx; a test checks they match). */
export const logoHtml = (): string =>
  `<a href="/" class="sb-logo" aria-label="${esc(BRAND.name)} home"><span class="sb-logo-mark" aria-hidden="true"><span></span><span></span><span></span><span></span></span>`
  + `<span class="sb-logo-word" aria-hidden="true">${esc(BRAND.wordmark)}</span></a>`

export const footerHtml = (): string =>
  `<footer class="hp-foot"><span class="hp-foot-name">${esc(BRAND.wordmark)}</span>`
  + `<nav aria-label="Footer" class="hp-foot-nav">${FOOTER_LINKS.map(l => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join('')}</nav>`
  + '<span>Made in the UK</span></footer>'

/** The page's own heading, the "Last updated" line under it (if any), the rest, and its sections. */
export function splitPage(html: string): { title: string; updated: string | null; body: string; sections: { id: string; text: string }[] } {
  const h1 = /^<h1>(.*?)<\/h1>\n?/.exec(html)
  if (!h1) throw new Error('Page text must start with a "# Title" line')
  let rest = html.slice(h1[0].length)
  const updated = /^<p><em>(Last updated:.*?)<\/em><\/p>\n?/.exec(rest)
  if (updated) rest = rest.slice(updated[0].length)
  const sections = [...rest.matchAll(/<h2 id="([^"]+)">(.*?)<\/h2>/g)].map(m => ({ id: m[1], text: m[2] }))
  return { title: h1[1], updated: updated?.[1] ?? null, body: rest, sections }
}

function contents(sections: { id: string; text: string }[]): string {
  const list = `<ul class="pg-toc-list">${sections.map(s => `<li><a href="#${s.id}">${s.text}</a></li>`).join('')}</ul>`
  // A sidebar on wide screens, a fold-away list on phones (only one is ever displayed).
  return `<nav class="pg-toc pg-toc--side" aria-label="On this page"><p class="pg-toc-title">On this page</p>${list}</nav>`
    + `<details class="pg-toc pg-toc--fold"><summary>On this page</summary><nav aria-label="On this page">${list}</nav></details>`
}

export interface BuiltPage { head: string; body: string; html: string }

/** One page: <head> tags and <body> content, filled with the brand's words. */
export function buildPage(page: StaticPage, markdown: string, words: PageWords, origin: string): BuiltPage {
  const { title, updated, body, sections } = splitPage(fillWords(render(markdown), words))
  const url = `${origin}${page.path}`
  const head = [
    `<title>${esc(page.title)} · ${esc(BRAND.name)}</title>`,
    `<meta name="description" content="${esc(page.description)}">`,
    socialTags({ title: page.title, description: page.description, url, image: HOME_OG_IMAGE, imageAlt: `${BRAND.name}: websites for tradespeople`, type: 'article' }, origin),
  ].join('\n    ')
  const toc = sections.length > 2 ? contents(sections) : ''
  const html = '<div class="hp sb-ui pg"><a class="pg-skip" href="#main">Skip to main content</a><div class="hp-wrap">'
    + `<header class="hp-top">${logoHtml()}<nav aria-label="Main" class="hp-nav"><a href="/">Home</a><a href="/websites-for/">Every trade</a><a href="/build/" class="hp-nav-start">Start building</a></nav></header>`
    + `<main id="main" tabindex="-1" class="pg-main">`
    + `<div class="pg-hero pg-hero--${page.tone}"><p class="pg-kicker">${esc(page.kicker)}</p><h1 class="hp-h1 pg-h1">${title}</h1>${updated ? `<p class="pg-updated">${updated}</p>` : ''}</div>`
    + `<div class="pg-layout${toc ? '' : ' pg-layout--single'}">${toc}<article class="pg-text">${body}</article></div>`
    + '</main>'
    + footerHtml()
    + '</div></div>'
  return { head, body: html, html: `${head}\n${html}` }
}
