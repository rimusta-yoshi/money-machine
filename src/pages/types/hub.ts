import { BRAND } from '../../brand/config'
import { money } from '../../brand/money'
import { CATEGORIES } from '../../packs'
import { PAGE_PACKS } from '../../packs/pages'
import type { Category } from '../../packs'
import { esc, HOME_OG_IMAGE, jsonLd, socialTags } from '../html'
import { chrome, crumbs, crumbsData } from './chrome'
import { HUB_PATH, typePath } from './paths'

/** The /websites-for/ hub: every business type, grouped by category, each linking to its page. */

const TITLE = 'Websites for every trade and local business'
const DESCRIPTION = 'Pick your trade to see example websites, what yours needs and what we fill in for you. Built in about 15 minutes, paid for once, no monthly fees.'
const trail = [{ name: 'Home', href: '/' }, { name: 'Websites for…', href: HUB_PATH }]

export function hubHead(origin: string): string {
  return [
    `<title>${esc(TITLE)} · ${esc(BRAND.name)}</title>`,
    `<meta name="description" content="${esc(DESCRIPTION)}">`,
    socialTags({ title: TITLE, description: DESCRIPTION, url: `${origin}${HUB_PATH}`, image: HOME_OG_IMAGE, imageAlt: `${BRAND.name}: websites for tradespeople` }, origin),
    jsonLd(crumbsData(trail, origin)),
  ].join('\n    ')
}

const TONES = ['blue', 'yellow', 'lawn', 'brick'] as const

function group(category: Category, i: number): string {
  const packs = PAGE_PACKS.filter(p => p.category === category)
  if (!packs.length) return ''
  const id = `cat-${category}`
  const cards = packs.map(p => '<li class="wf-type">'
    + `<a class="wf-type-link" href="${typePath(p)}"><span class="wf-type-emoji" aria-hidden="true">${p.emoji}</span>`
    + `<span class="wf-type-name">Websites for ${esc(p.plural)}</span></a>`
    + `<p class="wf-type-line">${esc(p.landing.headline)}</p></li>`).join('')
  return `<section class="wf-group wf-group--${TONES[i % TONES.length]}" aria-labelledby="${id}"><h2 id="${id}" class="wf-group-title">${esc(CATEGORIES[category])}</h2><ul class="wf-types">${cards}</ul></section>`
}

export function hubBody(pricePence: number): string {
  const groups = (Object.keys(CATEGORIES) as Category[]).map(group).filter(Boolean)
  const intro = '<div class="pg-hero pg-hero--yellow wf-hub-hero">'
    + '<p class="pg-kicker">Every trade we build for</p>'
    + '<h1 class="hp-h1 pg-h1">Websites for your trade</h1>'
    + `<p class="wf-hub-lead">Pick yours to see three example sites, what a good one needs, and what we fill in before you start. Every one is ${money(pricePence)} once, with no monthly fee.</p>`
    + '</div>'
  const missing = '<section class="hp-tile wf-missing" aria-labelledby="missing-h"><h2 id="missing-h" class="wf-panel-title">Don’t see your business?</h2>'
    + '<p>We add new types every month. Start with the closest one and change the wording to fit, and tell us what you do on the first step of the builder (“My business isn’t listed”) so we know what to add next.</p>'
    + '<a href="/build/" class="sb-main-btn hp-btn hp-btn--start" data-build>Start building</a></section>'
  return chrome(crumbs(trail) + intro + groups.join('') + missing)
}
