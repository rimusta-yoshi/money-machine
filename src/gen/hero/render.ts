import { cx, esc, safeImageUrl, safeUrl } from '../html'
import { stars } from '../core/markup'
import { styleVars } from '../core/vars'
import type { HeroSpec, ParamsOf, SiteStyle, Tone } from '../schema'
import { ARCHETYPES, FALLBACK_SPEC } from './archetypes'
import { formButton, staticChecks } from './checks'
import type { HeroContent } from './content'
import { HERO_TITLE_ID, heroSizes } from './metrics'

/**
 * Renders a hero spec to an HTML string. Framework-free, so the same code serves the
 * builder preview and published pages. One markup for every screen size: the mobile
 * layout comes from container queries in HERO_CSS.
 */
export function renderHero(spec: HeroSpec, style: SiteStyle, content: HeroContent): string {
  const s = heroToRender(spec, style, content)
  const { cls, body, tone, vars } = BODY[s.archetype](s.params as never, style, content)
  return `<section class="${cx('sb-hero', `sb-hero--${s.archetype}`, `sb-tone--${tone}`, cls)}" aria-labelledby="${HERO_TITLE_ID}" style="${esc(styleVars(style) + (vars ?? ''))}"><div class="sb-in">${body}</div></section>`
}

/**
 * A saved spec can stop fitting after it was picked: the photo gets removed, or the brand
 * colour or theme changes. Rather than publish a broken hero, fall back to one that always works.
 */
export function heroToRender(spec: HeroSpec, style: SiteStyle, content: HeroContent): HeroSpec {
  const fits = ARCHETYPES[spec.archetype].gate(content) && staticChecks(spec, style).every(c => c.ok)
  return fits ? spec : FALLBACK_SPEC
}

/* ---------- shared parts ---------- */

const h1 = (c: HeroContent, highlight = false) =>
  `<h1 id="${HERO_TITLE_ID}" class="sb-h1" data-heading>${highlight ? `<span class="sb-hl">${esc(c.headline)}</span>` : esc(c.headline)}</h1>`

const sub = (c: HeroContent) => (c.sub ? `<p class="sb-sub">${esc(c.sub)}</p>` : '')

function ctas(style: SiteStyle, c: HeroContent, withQuote = true): string {
  const btn = (label: string, href: string) =>
    `<a class="sb-btn sb-btn--${style.button}" href="${esc(safeUrl(href))}" data-call>${esc(label)}</a>`
  const quote = c.quote ? `<a class="sb-link" href="${esc(safeUrl(c.quote.href))}">${esc(c.quote.label)}</a>` : ''
  if (!c.call) return c.quote ? `<div class="sb-ctas">${btn(c.quote.label, c.quote.href)}</div>` : ''
  return `<div class="sb-ctas">${btn(c.call.label, c.call.href)}${withQuote ? quote : ''}</div>`
}


const rating = (c: HeroContent) =>
  c.rating ? `<p class="sb-rating">${stars(c.rating.score)}<span>${esc(c.rating.score)} from ${esc(c.rating.count)} reviews</span></p>` : ''

const trust = (items: readonly string[], cls = 'sb-trust') =>
  items.length ? `<ul class="${cls}" aria-label="Credentials">${items.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : ''

function photo(c: HeroContent, cls: string, attrs = ''): string {
  const src = c.photo ? safeImageUrl(c.photo.url) : ''
  if (!c.photo || !src) return ''
  return `<div class="${cls}"${attrs}><img src="${esc(src)}" alt="${esc(c.photo.alt)}" decoding="async"></div>`
}

const review = (r: HeroContent['reviews'][number]) =>
  `<figure class="sb-card sb-review"><blockquote><p>${esc(r.text)}</p></blockquote><figcaption>${esc(r.author)}${r.location ? `, ${esc(r.location)}` : ''}</figcaption></figure>`

const summary = (c: HeroContent) =>
  c.rating
    ? `<div class="sb-sum"><p class="sb-sum-n" aria-hidden="true">${esc(c.rating.score)}</p><div>${stars(c.rating.score)}<p class="sb-sum-c">from ${esc(c.rating.count)} reviews</p></div></div>`
    : ''

const FIELDS = [
  { id: 'name', label: 'Your name', input: 'type="text" autocomplete="name" required maxlength="80"' },
  { id: 'phone', label: 'Phone', input: 'type="tel" autocomplete="tel" required maxlength="30"' },
  { id: 'postcode', label: 'Postcode', input: 'type="text" autocomplete="postal-code" maxlength="12"' },
  { id: 'job', label: 'What needs doing?', input: '' },
]

function form(style: SiteStyle, fields: number): string {
  const field = (f: typeof FIELDS[number]) => {
    const id = `sb-f-${f.id}`
    const control = f.input
      ? `<input id="${id}" name="${f.id}" ${f.input}>`
      : `<textarea id="${id}" name="${f.id}" rows="3" maxlength="1000"></textarea>`
    return `<div class="sb-field"><label for="${id}">${f.label}</label>${control}</div>`
  }
  return `<form class="sb-card sb-form" aria-labelledby="sb-form-title" method="post">`
    + `<h2 id="sb-form-title" class="sb-form-h">Request a free quote</h2>`
    + FIELDS.slice(0, fields).map(field).join('')
    + `<button type="submit" class="sb-btn sb-btn--${formButton(style.button)}">Send request</button></form>`
}

/* ---------- archetype bodies ---------- */

interface Body { cls: string; body: string; tone: Tone | 'photo'; vars?: string }
type BodyFn<K extends HeroSpec['archetype']> = (p: ParamsOf<K>, style: SiteStyle, c: HeroContent) => Body

const BODY: { [K in HeroSpec['archetype']]: BodyFn<K> } = {
  split: (p, style, c) => {
    const [a, b] = [p.ratio, Math.round((1 - p.ratio) * 100) / 100]
    const cols = p.side === 'right' ? `${a}fr ${b}fr` : `${b}fr ${a}fr`
    const strip = p.proof === 'strip' ? `<div class="sb-strip">${rating(c)}${trust(c.badges.slice(0, 3), 'sb-trust sb-trust--plain')}</div>` : ''
    const under = p.proof === 'under' ? rating(c) || trust(c.badges.slice(0, 3)) : ''
    return {
      cls: cx(`sb-side--${p.side}`, `sb-valign--${p.valign}`, `sb-mphoto--${p.mobilePhoto}`),
      tone: p.tone,
      vars: `--sb-cols:${cols};`,
      body: `<div class="sb-grid"><div class="sb-text">${h1(c)}${sub(c)}${ctas(style, c)}${under}</div>${photo(c, 'sb-photo')}</div>${strip}`,
    }
  },
  overlay: (p, style, c) => ({
    cls: `sb-anchor--${p.anchor}`,
    tone: 'photo',
    vars: `--sb-scrim:${p.scrim};`,
    body: `<div class="sb-bg">${photo(c, 'sb-bgimg')}<div class="sb-scrim"></div></div><div class="sb-text">${h1(c)}${sub(c)}${ctas(style, c)}${rating(c)}</div>`,
  }),
  stacked: (p, style, c) => ({
    cls: cx(`sb-align--${p.align}`, `sb-image--${p.image}`),
    tone: p.tone,
    body: `<div class="sb-text">${h1(c)}${sub(c)}${ctas(style, c)}${p.image === 'none' ? rating(c) : ''}</div>${p.image === 'none' ? '' : photo(c, 'sb-photo')}`,
  }),
  card: (p, style, c) => ({
    cls: `sb-pos--${p.pos}`,
    tone: 'ground',
    body: `<div class="sb-bg">${photo(c, 'sb-bgimg')}</div><div class="sb-card sb-card--${p.surface} sb-herocard">${h1(c)}${sub(c)}${ctas(style, c)}${rating(c)}</div>`,
  }),
  offset: (p, style, c) => ({
    cls: '',
    tone: 'ground',
    vars: `--sb-drop:${p.drop}px;--sb-k:${Math.round((1 / (1 - p.overlap)) * 1000) / 1000};`,
    body: `${photo(c, 'sb-photo')}<div class="sb-text">${h1(c, true)}<div class="sb-rest">${sub(c)}${ctas(style, c)}${rating(c)}</div></div>`,
  }),
  typeled: (p, style, c) => {
    const z = heroSizes(style)
    return {
      cls: '',
      tone: p.tone,
      vars: `--sb-hs-t:${z.typeled(p.scale)}px;--sb-hs-tm:${z.typeledMobile}px;`,
      body: `${h1(c)}<div class="sb-row">${sub(c)}${ctas(style, c)}</div>${p.trust ? trust(c.badges) : ''}`,
    }
  },
  proof: (p, style, c) => {
    const reviews = c.reviews.slice(0, p.count).map(review).join('')
    const sum = p.summary === 'none' ? '' : summary(c)
    return {
      cls: `sb-summary--${p.summary}`,
      tone: p.tone,
      body: `<div class="sb-grid sb-grid--proof"><div class="sb-text">${h1(c)}${sub(c)}${ctas(style, c)}${p.team ? photo(c, 'sb-photo sb-team') : ''}</div>`
        + `<div class="sb-proof">${p.summary === 'top' ? sum + reviews : reviews + sum}</div></div>`,
    }
  },
  contact: (p, style, c) => ({
    cls: `sb-side--${p.side}`,
    tone: p.tone,
    body: `<div class="sb-grid sb-grid--contact"><div class="sb-text">${h1(c)}${sub(c)}${ctas(style, c, false)}${rating(c)}</div>${form(style, p.fields)}</div>`,
  }),
}
