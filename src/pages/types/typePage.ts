import { BRAND } from '../../brand/config'
import { money } from '../../brand/money'
import { THEMES } from '../../gen'
import { PAGE_PACKS } from '../../packs/pages'
import type { PagePack } from '../../packs/pages'
import { SECTION_INFO } from '../../packs/sections'
import { MAX_SERVICES } from '../../site/limits'
import { esc, jsonLd, socialTags } from '../html'
import { chrome, crumbs, crumbsData, priceStory, priceTile } from './chrome'
import { examplePath, exampleShot, HUB_PATH, ogImage, startPath, typePath } from './paths'

/**
 * One "Websites for <type>" page, from its pack, as static HTML built at build time. Everything
 * specific to the trade comes from the pack; the frame, the price story and the button wording
 * are shared. See docs/adding-a-business-type.md.
 */

export interface TypePageOptions {
  origin: string
  pricePence: number
  /** Which example screenshots exist (npm run pack:images); a missing one shows a plain tile. */
  hasShot: (path: string) => boolean
}

/** "a plumber", "an electrician". */
export const withArticle = (word: string): string => `${/^[aeiou]/i.test(word) ? 'an' : 'a'} ${word}`
const lower = (p: PagePack) => p.name.toLowerCase()
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const startButton = (p: PagePack): string => `Start your ${lower(p)} website`
export const pageHeading = (p: PagePack): string => `Websites for ${p.plural}`

function hero(p: PagePack, o: TypePageOptions): string {
  return '<section class="hp-bento wf-hero" aria-labelledby="wf-h">'
    + '<div class="hp-tile hp-pitch wf-pitch">'
    + `<p class="hp-kicker">${esc(pageHeading(p))}</p>`
    + `<h1 id="wf-h" class="hp-h1 wf-h1">${esc(p.landing.headline)}</h1>`
    + `<p class="hp-lead">${esc(p.landing.intro[0])}</p>`
    + `<div class="hp-cta-row"><a href="${startPath(p)}" class="sb-main-btn hp-btn" data-build>${esc(startButton(p))}</a>`
    + `<span class="hp-cta-note">Free to build. Pay ${money(o.pricePence)} once, when you’re happy.</span></div>`
    + '</div>'
    + priceTile(o.pricePence)
    + '</section>'
}

function examples(p: PagePack, o: TypePageOptions): string {
  const items = p.landing.examples.map((ex, n) => {
    const look = THEMES[ex.theme].label
    const shot = exampleShot(p, n)
    const picture = o.hasShot(shot)
      ? `<img src="${shot}" alt="" width="768" height="528" loading="lazy" decoding="async">`
      : `<span class="wf-shot-none">${esc(ex.name)}</span>`
    return '<li class="wf-example">'
      + `<a class="wf-shot" href="${examplePath(p, n)}" tabindex="-1" aria-hidden="true">${picture}</a>`
      + `<h3 class="wf-example-name">${esc(ex.name)}</h3>`
      + `<p class="wf-example-meta">${esc(ex.location)} · the ${esc(look)} look</p>`
      + `<a class="wf-link" href="${examplePath(p, n)}">See the whole example<span class="sb-sr-only">: ${esc(ex.name)}</span></a>`
      + '</li>'
  })
  return '<section class="wf-block" aria-labelledby="ex-h">'
    + `<h2 id="ex-h" class="hp-h2">Three ${esc(lower(p))} websites, made with our builder</h2>`
    + '<p class="wf-sub">Made-up businesses, real pages: each one built by the same builder you’ll use, with sample photos standing in for yours.</p>'
    + `<ul class="wf-examples">${items.join('')}</ul>`
    + '</section>'
}

function story(p: PagePack): string {
  const rest = p.landing.intro.slice(1).map(t => `<p>${esc(t)}</p>`).join('')
  return `<section class="hp-tile wf-story" aria-labelledby="story-h"><h2 id="story-h" class="hp-h2">Made for ${esc(p.plural)}</h2>${rest}</section>`
}

function needs(p: PagePack): string {
  const items = p.landing.needs.map(n => `<li class="wf-need"><span class="wf-tick" aria-hidden="true"></span><h3 class="wf-need-title">${esc(n.title)}</h3><p>${esc(n.text)}</p></li>`)
  return '<section class="wf-block" aria-labelledby="needs-h">'
    + `<h2 id="needs-h" class="hp-h2">What ${esc(withArticle(lower(p)))} website needs</h2>`
    + `<ul class="wf-needs">${items.join('')}</ul></section>`
}

function filledIn(p: PagePack): string {
  const services = p.services.map(s => `<li><h3 class="wf-item-title">${esc(s.name)}</h3><p>${esc(s.description)}</p></li>`).join('')
  const sections = [...p.sections, { type: 'footer' as const, optional: undefined }]
    .map(s => `<li><span class="wf-item-title">${esc(SECTION_INFO[s.type].name)}${s.optional ? ' <span class="wf-tag">if you want it</span>' : ''}</span><span class="wf-item-text">${esc(SECTION_INFO[s.type].text)}</span></li>`).join('')
  const badges = p.badges.map(b => `<li class="hp-chip wf-badge">${esc(b)}</li>`).join('')
  return '<section class="wf-two" aria-labelledby="fill-h">'
    + `<h2 id="fill-h" class="hp-h2 wf-span">Filled in before you start</h2>`
    + `<div class="hp-tile wf-panel wf-panel--services"><h3 class="wf-panel-title">Services we add for you</h3><ul class="wf-list">${services}</ul>`
    + `<p class="wf-small">Change, add or remove any of them. You can list up to ${MAX_SERVICES} services.</p></div>`
    + `<div class="hp-tile wf-panel wf-panel--sections"><h3 class="wf-panel-title">The sections your site gets, in order</h3><ol class="wf-list wf-list--sections">${sections}</ol>`
    + `<h3 class="wf-panel-title wf-badges-title">Badges you can add</h3><ul class="wf-badges">${badges}</ul>`
    + '<p class="wf-small">Only the ones that are true for you: we never add a badge on your behalf.</p></div>'
    + '</section>'
}

function faqs(p: PagePack): string {
  const items = p.landing.faqs.map(f => `<details class="hp-faq"><summary>${esc(f.q)}<span class="hp-plus" aria-hidden="true">+</span></summary><p>${esc(f.a)}</p></details>`)
  return '<section class="hp-bento wf-faq" aria-labelledby="faq-h">'
    + `<div class="hp-tile hp-faq-title"><h2 id="faq-h" class="hp-h2">${esc(cap(lower(p)))} website questions</h2>`
    + '<p class="wf-faq-more">More about paying, domains and refunds in the <a href="/faq/">full FAQ</a>.</p></div>'
    + `<div class="hp-faqs">${items.join('')}</div></section>`
}

function finalCall(p: PagePack): string {
  const others = PAGE_PACKS.filter(o => o.id !== p.id).map(o => `<li><a href="${typePath(o)}">${esc(cap(o.plural))}</a></li>`).join('')
  return '<section class="hp-bento wf-final-row" aria-labelledby="cta-h">'
    + `<div class="hp-tile hp-final"><h2 id="cta-h" class="hp-h2 hp-h2--final">Your ${esc(lower(p))} website is three picks away.</h2>`
    + `<a href="${startPath(p)}" class="sb-main-btn hp-btn hp-btn--dark" data-build>${esc(startButton(p))}</a></div>`
    + `<nav class="hp-tile wf-others" aria-labelledby="others-h"><h2 id="others-h" class="wf-panel-title">Websites for other trades</h2><ul>${others}</ul>`
    + `<p><a href="${HUB_PATH}">See every trade</a></p></nav>`
    + '</section>'
}

const trail = (p: PagePack) => [
  { name: 'Home', href: '/' },
  { name: 'Websites for…', href: HUB_PATH },
  { name: cap(p.plural), href: typePath(p) },
]

function faqData(p: PagePack) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: p.landing.faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
}

export function typePageHead(p: PagePack, o: TypePageOptions): string {
  return [
    `<title>${esc(p.landing.title)} · ${esc(BRAND.name)}</title>`,
    `<meta name="description" content="${esc(p.landing.description)}">`,
    socialTags({ title: p.landing.title, description: p.landing.description, url: `${o.origin}${typePath(p)}`, image: ogImage(p), imageAlt: `${pageHeading(p)}, from ${BRAND.name}` }, o.origin),
    jsonLd(faqData(p)),
    jsonLd(crumbsData(trail(p), o.origin)),
  ].join('\n    ')
}

export function typePageBody(p: PagePack, o: TypePageOptions): string {
  return chrome(crumbs(trail(p)) + hero(p, o) + examples(p, o) + story(p) + needs(p) + filledIn(p) + priceStory(o.pricePence, p.plural, startPath(p), startButton(p)) + faqs(p) + finalCall(p), startPath(p))
}
