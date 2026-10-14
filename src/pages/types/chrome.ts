import { BRAND } from '../../brand/config'
import { money } from '../../brand/money'
import { esc } from '../html'
import { footerHtml, logoHtml } from '../shell'
import { HUB_PATH } from './paths'

/**
 * The frame around the hub, the type pages and the 404 page: the homepage's top bar and
 * footer, a skip link and one <main>. Builder links carry `data-build` so the small script
 * (src/pages/carry.ts) can pass a visitor's ad source (?src=) on to the builder.
 */
export function chrome(main: string, start = '/build/'): string {
  return '<div class="hp sb-ui pg wf"><a class="pg-skip" href="#main">Skip to main content</a><div class="hp-wrap">'
    + `<header class="hp-top">${logoHtml()}<nav aria-label="Main" class="hp-nav"><a href="/">Home</a><a href="${HUB_PATH}">Every trade</a><a href="/faq/">FAQ</a>`
    + `<a href="${esc(start)}" class="hp-nav-start" data-build>Start building</a></nav></header>`
    + `<main id="main" tabindex="-1" class="pg-main wf-main">${main}</main>`
    + footerHtml()
    + '</div></div>'
}

/** Breadcrumbs: every step a link but the last (the page itself). */
export function crumbs(trail: { name: string; href: string }[]): string {
  const items = trail.map((c, i) => (i === trail.length - 1
    ? `<li><span aria-current="page">${esc(c.name)}</span></li>`
    : `<li><a href="${esc(c.href)}">${esc(c.name)}</a></li>`))
  return `<nav aria-label="Breadcrumb" class="wf-crumbs"><ol>${items.join('')}</ol></nav>`
}

/** The same trail for search engines. */
export const crumbsData = (trail: { name: string; href: string }[], origin: string) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: trail.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: `${origin}${c.href}` })),
})

/** The price tile: one price and the money-back guarantee (as on the homepage). */
export function priceTile(pricePence: number): string {
  const price = money(pricePence)
  const days = BRAND.guarantee.days
  return '<div class="hp-tile hp-price wf-price">'
    + '<div class="hp-price-top"><span class="hp-price-label">One price</span><span class="hp-price-mark" aria-hidden="true"><span></span><span></span><span></span><span></span></span></div>'
    + `<p class="hp-price-main"><span class="hp-price-big">${price}</span><span class="hp-price-once">once. That's it.</span></p>`
    + `<div class="hp-guarantee"><span class="hp-guarantee-badge" aria-hidden="true"><b>${days}</b>days</span>`
    + `<p><b>Money-back guarantee.</b> Not happy? Get your ${price} back within ${days} days. No questions asked.</p></div>`
    + '</div>'
}

/**
 * The price story: one payment against a typical monthly plan (as on the homepage, no names).
 * `who` is the reader, e.g. "plumbers".
 */
export function priceStory(pricePence: number, who: string, start: string, buttonText: string): string {
  const price = money(pricePence)
  return '<section aria-labelledby="price-h" class="hp-pricing wf-pricing">'
    + '<div class="hp-pricing-pitch"><h2 id="price-h" class="hp-h2">Pay once. Own it.</h2>'
    + `<p>Most website builders charge ${esc(who)} every month, for as long as the site is up. We charge you once, when you’re happy with it.</p>`
    + `<a href="${esc(start)}" class="sb-main-btn hp-btn hp-btn--start" data-build>${esc(buttonText)}</a></div>`
    + '<div class="hp-vs"><div class="hp-vs-them"><span class="hp-vs-label">A £15-a-month plan</span><del class="hp-vs-big">£540</del>'
    + '<span class="hp-vs-note">after three years. And it keeps going up every month you stay.</span></div>'
    + `<div class="hp-vs-us"><span class="hp-vs-label">${esc(BRAND.name)}</span><span class="hp-vs-big">${price}</span>`
    + `<span class="hp-vs-note">once, for good. Year one, year three, year ten: still ${price}. Money back within ${BRAND.guarantee.days} days if you change your mind.</span></div>`
    + '<span class="hp-vs-badge" aria-hidden="true">vs</span></div>'
    + '</section>'
}
