import { z } from 'zod'
import { cx, esc, safeUrl } from '../html'
import { inRange, pick, round2 } from '../rng'
import type { Rng } from '../rng'
import { defineSection, specSchema } from '../core/define'
import type { BodyContext } from '../core/define'
import { heroMeasuredChecks } from '../core/fit'
import { button, corner, emphasize, ghost, media, SPOTS, stars } from '../core/markup'
import type { Frame, Spot, Sticker } from '../core/markup'
import { hasMotif, rollAsym, rollCrop, rollMotif, rollRot, textSpan } from '../core/punch'
import type { RollContext } from '../core/types'
import { ALIGNS, ASYMS, BLEEDS, CROPS, MOTIFS } from '../themes/types'
import { heroView, hasPhoto, reviewCount } from '../hero/content'
import type { HeroContent } from '../hero/content'
import { estimateHero } from '../hero/estimate'

const tone = z.enum(['ground', 'surface', 'brand'])
const side = z.enum(['left', 'right'])
const spot = z.enum(SPOTS)

export const heroSchema = specSchema('hero', {
  split: {
    asym: z.enum(ASYMS), side, valign: z.enum(['center', 'end']), proof: z.enum(['under', 'strip', 'none']),
    crop: z.enum(CROPS), bleed: z.enum(BLEEDS), motif: z.enum(MOTIFS), at: spot, tone, em: z.boolean(), mphoto: z.enum(['top', 'bottom']),
  },
  // 0.55 is the least that keeps white text at 4.5:1 over a pure white photo.
  overlay: { anchor: z.enum(['bottom', 'middle', 'center']), scrim: z.number().min(0.55).max(0.85), em: z.boolean() },
  stacked: { align: z.enum(ALIGNS), image: z.enum(['bleed', 'inset', 'none']), tone, em: z.boolean() },
  typeled: { trust: z.boolean(), tone, em: z.boolean(), motif: z.enum(MOTIFS) },
  proof: { count: z.number().int().min(1).max(3), summary: z.enum(['top', 'bottom', 'none']), tone, em: z.boolean() },
  contact: { fields: z.number().int().min(2).max(4), side, tone, em: z.boolean() },
  // The generator rolls up to 0.32 and the overlap is clamped; only <= 0.25 can be stored.
  offset: { overlap: z.number().min(0).max(0.25), drop: z.number().int().min(0).max(80), motif: z.enum(MOTIFS), at: spot },
  bigphone: { photo: z.boolean(), side, crop: z.enum(CROPS), motif: z.enum(MOTIFS), stripe: z.boolean(), at: spot, tone, em: z.boolean() },
  floatcard: {
    asym: z.enum(ASYMS), side, crop: z.enum(CROPS), card: z.enum(['rating', 'fact', 'sub', 'review']), at: spot,
    motif: z.enum(MOTIFS), ticks: z.boolean(), dot: z.boolean(), em: z.boolean(),
  },
  editorial: { image: z.enum(['figure', 'none']), motif: z.enum(MOTIFS), em: z.boolean() },
  sticker: { asym: z.enum(ASYMS), side, crop: z.enum(CROPS), rot: z.number().int().min(-6).max(6), count: z.number().int().min(1).max(2), motif: z.enum(MOTIFS), blob: z.boolean(), em: z.boolean() },
})
export type HeroSpec = z.infer<typeof heroSchema>
type P<K extends HeroSpec['archetype']> = Extract<HeroSpec, { archetype: K }>['params']

const TONES = ['ground', 'ground', 'ground', 'surface', 'brand'] as const
const rollTone = (r: Rng) => pick(r, TONES)
const toneF = (t: string) => ({ ground: 0, surface: 0.5, brand: 1 })[t] ?? 0
const sideF = (s: string) => (s === 'right' ? 1 : 0)
const cropF = (c: string) => CROPS.indexOf(c as never) / 3

/** A spot on the photo's outer side, away from the text column. */
const outer = (r: Rng): Spot => pick(r, ['ob', 'ot'] as const)
/** A spot on the photo's inner side, facing the text: floating cards overlap the gap there. */
const inner = (r: Rng): Spot => pick(r, ['ib', 'it'] as const)

const floatOptions = (c: HeroContent) => [
  ...(c.rating ? ['rating' as const] : []),
  ...(c.facts.length ? ['fact' as const] : []),
  ...(c.reviews.some(x => x.text.length <= 140) ? ['review' as const] : []),
  'sub' as const,
]

/* ---------- shared parts ---------- */

interface TextOpts {
  em: boolean
  /** The first screen ends with this text block (a trailing figure may run on below the fold). */
  fold?: boolean
  center?: boolean
  dot?: boolean
  /** Inner HTML placed under the buttons. */
  after?: string
  /** Skip the buttons (the giant phone replaces them). */
  noCtas?: boolean
  headline?: string
}

function ctas(c: HeroContent, ctx: BodyContext): string {
  const call = c.call ? button(ctx.style, ctx.biome.voice.cta.call(c.call.number), c.call.href, ' data-call') : ''
  if (!c.call) return c.quote ? `<div class="sb-ctas">${button(ctx.style, c.quote.label, c.quote.href)}</div>` : ''
  return `<div class="sb-ctas">${call}${c.quote ? ghost(c.quote.label, c.quote.href) : ''}</div>`
}

function text(c: HeroContent, ctx: BodyContext, o: TextOpts): string {
  const eyebrow = `<p class="sb-eyebrow">${o.dot ? '<span class="sb-dot" aria-hidden="true"></span>' : ''}${esc(c.eyebrow)}</p>`
  const h1 = `<h1 id="sb-hero-title" class="sb-h1" data-heading>${o.headline ?? emphasize(c.headline, o.em)}</h1>`
  const sub = c.sub ? `<p class="sb-lead">${esc(c.sub)}</p>` : ''
  return `<div class="${cx('sb-hero-text', o.center && 'sb-center')}"${o.fold ? ' data-fold' : ''}>${eyebrow}${h1}${sub}${o.noCtas ? '' : ctas(c, ctx)}${o.after ?? ''}</div>`
}

const rating = (c: HeroContent) =>
  c.rating ? `<p class="sb-rating">${stars(c.rating.score)}<span>${esc(c.rating.score)} from ${esc(c.rating.count)} reviews</span></p>` : ''

const trust = (items: readonly string[], cls = 'sb-trust') =>
  items.length ? `<ul class="${cls}" aria-label="Credentials">${items.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : ''

const ticks = (c: HeroContent) => trust(c.badges.slice(0, 3), 'sb-ticks')

const review = (x: HeroContent['reviews'][number]) =>
  `<figure class="sb-card sb-review"><blockquote><p>${esc(x.text)}</p></blockquote><figcaption>${esc(x.author)}${x.location ? `, ${esc(x.location)}` : ''}</figcaption></figure>`

const summary = (c: HeroContent) =>
  c.rating ? `<div class="sb-sum"><p class="sb-sum-n" aria-hidden="true">${esc(c.rating.score)}</p><div>${stars(c.rating.score)}<p class="sb-mu">from ${esc(c.rating.count)} reviews</p></div></div>` : ''

const FIELDS = [
  { id: 'name', label: 'Your name', input: 'type="text" autocomplete="name" required maxlength="80"' },
  { id: 'phone', label: 'Phone', input: 'type="tel" autocomplete="tel" required maxlength="30"' },
  { id: 'postcode', label: 'Postcode', input: 'type="text" autocomplete="postal-code" maxlength="12"' },
  { id: 'job', label: 'What needs doing?', input: '' },
]

function form(ctx: BodyContext, fields: number): string {
  const field = (f: typeof FIELDS[number]) => {
    const id = `sb-f-${f.id}`
    const control = f.input ? `<input id="${id}" name="${f.id}" ${f.input}>` : `<textarea id="${id}" name="${f.id}" rows="3" maxlength="1000"></textarea>`
    return `<div class="sb-field"><label for="${id}">${f.label}</label>${control}</div>`
  }
  const btn = ctx.style.button === 'outline' ? 'solid' : ctx.style.button
  return `<form class="sb-card sb-form" aria-labelledby="sb-form-title" method="post"><h2 id="sb-form-title" class="sb-form-h">Request a free quote</h2>`
    + FIELDS.slice(0, fields).map(field).join('')
    + `<button type="submit" class="sb-btn sb-btn--${btn}">${esc(ctx.biome.voice.cta.send)}</button></form>`
}

/** Grid columns for a text/photo split. */
const cols = (asym: string) => `--sb-ta:${textSpan(asym as never)};`

function floatCard(c: HeroContent, kind: P<'floatcard'>['card']): string {
  switch (kind) {
    case 'rating': return c.rating ? `<p class="sb-float-l">Customer rating</p>${stars(c.rating.score)}<p>${esc(c.rating.score)} from ${esc(c.rating.count)} reviews</p>` : ''
    case 'fact': return c.facts[0] ? `<p class="sb-float-l">Good to know</p><p>${esc(c.facts[0])}</p>` : ''
    case 'review': {
      const x = c.reviews.find(v => v.text.length <= 140)
      return x ? `<p>“${esc(x.text)}”</p><p class="sb-float-l">${esc(x.author)}</p>` : ''
    }
    default: return `<p class="sb-float-l">How it works</p><p>${esc(c.subtext)}.</p>`
  }
}

/** Up to two short true facts for stickers: one low on the inner side, one high on the outer. */
function stickers(c: HeroContent, count: number, side: 'left' | 'right'): Sticker[] {
  const spots: Spot[] = ['ib', 'ot']
  return c.facts.slice(0, count).map((t, i) => ({ text: t, ink: i === 1, at: corner(spots[i], side) }))
}

/* ---------- the section ---------- */

export const hero = defineSection<HeroSpec, HeroContent>({
  type: 'hero',
  label: 'Hero',
  view: heroView,
  schema: heroSchema,
  checkBands: ['ground'],
  archetypes: {
    split: {
      label: 'Split', why: 'needs a photo',
      gate: hasPhoto,
      params: (r, { content: c, biome: t }: RollContext<HeroContent>) => {
        const s = pick(r, ['right', 'left'] as const)
        const motif = rollMotif(r, t, 'hero', ['stripe', 'caption', 'blob', 'ticks'], 0.25)
        return {
          asym: rollAsym(r, t, ['7/5', '6/6', '5/7', '8/4']), side: s, valign: pick(r, ['center', 'end'] as const),
          proof: c.rating || c.badges.length ? pick(r, ['under', 'strip', 'none'] as const) : 'none',
          crop: rollCrop(r, t), bleed: pick(r, t.punch.bleed), motif: motif === 'ticks' && !c.badges.length ? 'none' : motif,
          at: outer(r), tone: rollTone(r), em: r() < 0.65, mphoto: pick(r, ['bottom', 'bottom', 'top'] as const),
        }
      },
      features: p => [textSpan(p.asym) / 8, sideF(p.side), cropF(p.crop), p.proof === 'strip' ? 1 : 0, toneF(p.tone), p.bleed === 'edge' ? 1 : 0],
      focal: (_p, z) => ({ focal: z.h1, second: z.lead }),
    },
    overlay: {
      label: 'Photo behind', why: 'needs a photo',
      gate: hasPhoto,
      params: r => ({ anchor: pick(r, ['bottom', 'middle', 'center'] as const), scrim: round2(inRange(r, [0.58, 0.78])), em: r() < 0.5 }),
      features: p => [['bottom', 'middle', 'center'].indexOf(p.anchor) / 2, (p.scrim - 0.55) * 4, 1, 1],
      focal: (_p, z) => ({ focal: z.h1, second: z.lead }),
    },
    stacked: {
      label: 'Stacked', why: '',
      gate: () => true,
      params: (r, { content: c, biome: t }) => ({
        align: pick(r, t.punch.align.filter(a => a !== 'split')),
        image: hasPhoto(c) ? pick(r, ['bleed', 'inset', 'none'] as const) : 'none', tone: rollTone(r), em: r() < 0.6,
      }),
      features: p => [p.align === 'center' ? 1 : 0, ['bleed', 'inset', 'none'].indexOf(p.image) / 2, toneF(p.tone)],
      focal: (_p, z) => ({ focal: z.h1, second: z.lead }),
    },
    typeled: {
      label: 'Type-led', why: '',
      gate: () => true,
      params: (r, { content: c, biome: t }) => ({ trust: c.badges.length > 0 && r() < 0.7, tone: rollTone(r), em: r() < 0.75, motif: rollMotif(r, t, 'hero', ['stripe', 'dot'], 0.4) }),
      features: p => [p.trust ? 1 : 0, toneF(p.tone), p.motif === 'none' ? 0 : 1],
      focal: (_p, z) => ({ focal: z.h1 * 1.05, second: z.lead }),
    },
    proof: {
      label: 'Reviews first', why: 'needs 3+ reviews',
      gate: c => reviewCount(c) >= 3,
      params: (r, { content: c }) => ({
        count: 1 + Math.floor(r() * Math.min(3, reviewCount(c))), summary: c.rating ? pick(r, ['top', 'bottom'] as const) : 'none', tone: rollTone(r), em: r() < 0.5,
      }),
      features: p => [p.count / 3, p.summary === 'top' ? 1 : p.summary === 'bottom' ? 0.5 : 0, toneF(p.tone)],
      focal: (_p, z) => ({ focal: z.h1, second: z.xl }),
    },
    contact: {
      label: 'Quote form', why: 'needs an email for enquiries',
      gate: c => c.quoteForm,
      params: r => ({ fields: 2 + Math.floor(r() * 3), side: pick(r, ['right', 'left'] as const), tone: rollTone(r), em: r() < 0.5 }),
      features: p => [p.fields / 4, sideF(p.side), toneF(p.tone)],
      focal: (_p, z) => ({ focal: z.h1, second: 26 }),
    },
    offset: {
      label: 'Headline across the photo', why: 'needs a photo',
      gate: hasPhoto,
      params: (r, { biome: t }) => ({
        overlap: Math.min(0.25, round2(inRange(r, [0.08, 0.32]))), drop: Math.round(inRange(r, [0, 70])),
        motif: rollMotif(r, t, 'hero', ['stripe'], 0.3), at: pick(r, ['ob', 'ib'] as const),
      }),
      features: p => [p.overlap * 4, p.drop / 70, p.motif === 'none' ? 0 : 1],
      focal: (_p, z) => ({ focal: z.h1, second: z.lead }),
    },
    bigphone: {
      label: 'Giant phone number', why: 'needs a phone number',
      gate: c => c.call !== null,
      params: (r, { content: c, biome: t }) => {
        const s = pick(r, ['right', 'left'] as const)
        return {
          photo: hasPhoto(c) && r() < 0.6, side: s, crop: rollCrop(r, t, ['4:5', '1:1']), motif: rollMotif(r, t, 'hero', ['bigphone'], 0),
          stripe: hasMotif(t, 'hero', ['stripe']) && r() < 0.7, at: outer(r), tone: rollTone(r), em: r() < 0.6,
        }
      },
      features: p => [p.photo ? 1 : 0, sideF(p.side), toneF(p.tone), p.stripe ? 1 : 0],
      focal: (_p, z) => ({ focal: z.h1, second: z.h2 }),
      drawn: p => (p.stripe ? ['stripe'] : []),
    },
    floatcard: {
      label: 'Floating card', why: 'needs a photo',
      gate: hasPhoto,
      params: (r, { content: c, biome: t }) => {
        const s = pick(r, ['right', 'left'] as const)
        return {
          asym: rollAsym(r, t, ['6/6', '7/5']), side: s, crop: rollCrop(r, t, ['4:5', '1:1']), card: pick(r, floatOptions(c)), at: inner(r),
          motif: 'floatcard' as const, ticks: c.badges.length > 0 && r() < 0.7, dot: r() < 0.6, em: r() < 0.4,
        }
      },
      features: p => [textSpan(p.asym) / 8, sideF(p.side), cropF(p.crop), ['rating', 'fact', 'sub', 'review'].indexOf(p.card) / 3, p.ticks ? 1 : 0],
      focal: (_p, z) => ({ focal: z.h1, second: z.lead }),
    },
    editorial: {
      label: 'Editorial', why: '',
      gate: () => true,
      params: (r, { content: c, biome: t }) => ({
        image: hasPhoto(c) && r() < 0.8 ? 'figure' : 'none', motif: hasMotif(t, 'hero', ['caption']) && r() < 0.8 ? 'caption' : 'none', em: r() < 0.85,
      }),
      features: p => [p.image === 'figure' ? 1 : 0, p.motif === 'caption' ? 1 : 0, p.em ? 1 : 0],
      focal: (_p, z) => ({ focal: z.h1, second: z.lead }),
    },
    sticker: {
      label: 'Photo with stickers', why: 'needs a photo and a credential, rating or other fact',
      gate: c => hasPhoto(c) && c.facts.length >= 1,
      params: (r, { content: c, biome: t }) => ({
        asym: rollAsym(r, t, ['6/6', '7/5']), side: pick(r, ['right', 'left'] as const), crop: rollCrop(r, t, ['4:5', '1:1']),
        rot: rollRot(r, t), count: c.facts.length >= 2 && r() < 0.7 ? 2 : 1, motif: rollMotif(r, t, 'hero', ['sticker'], 0),
        blob: hasMotif(t, 'hero', ['blob']) && r() < 0.8, em: r() < 0.5,
      }),
      features: p => [textSpan(p.asym) / 8, sideF(p.side), cropF(p.crop), p.count / 2, p.blob ? 1 : 0],
      drawn: p => (p.blob ? ['blob'] : []),
      focal: (_p, z) => ({ focal: z.h1, second: z.lead }),
    },
  },
  weights: {
    'workwear': { split: 3, overlay: 2, stacked: 1.2, typeled: 2.4, proof: 1, contact: 1, offset: 2, bigphone: 3.2 },
    'clean-pro': { split: 2.5, overlay: 1.2, stacked: 1.5, typeled: 1, proof: 1.5, contact: 2, floatcard: 3.6 },
    'craft-heritage': { split: 1.6, overlay: 1, stacked: 1.8, typeled: 1.4, proof: 1, contact: 0.8, editorial: 4 },
    'friendly-local': { split: 2.4, stacked: 1.4, typeled: 1, proof: 2, contact: 1.5, sticker: 4 },
  },
  fallback: { v: 2, section: 'hero', archetype: 'stacked', step: 2, params: { align: 'left', image: 'none', tone: 'ground', em: false } },
  fixedBand: spec => {
    if (spec.archetype === 'overlay') return 'photo'
    if (spec.archetype === 'offset' || spec.archetype === 'floatcard' || spec.archetype === 'editorial' || spec.archetype === 'sticker') return 'ground'
    return spec.params.tone
  },
  contrast: (spec, style) => ({
    button: style.button,
    scrim: spec.archetype === 'overlay' ? spec.params.scrim : undefined,
  }),
  measured: (_spec, m) => heroMeasuredChecks(m),
  estimate: estimateHero,
  body: (spec, c, ctx) => {
    const t = ctx.biome
    const motifOn = (m: string) => ctx.motif && (spec.params as { motif?: string }).motif === m
    switch (spec.archetype) {
      case 'split': {
        const p = spec.params
        const strip = p.proof === 'strip' ? `<div class="sb-hero-strip">${rating(c)}${trust(c.badges.slice(0, 3), 'sb-trust sb-trust--plain')}</div>` : ''
        const under = p.proof === 'under' ? rating(c) || trust(c.badges.slice(0, 3)) : ''
        const frame: Frame = {
          crop: p.crop, cls: p.bleed === 'edge' ? 'sb-bleed--edge' : undefined, stripe: motifOn('stripe') ? corner(p.at, ctx.rhythm.side) : undefined,
          blob: motifOn('blob'), caption: motifOn('caption') ? c.photo?.alt : undefined,
        }
        const after = `${motifOn('ticks') ? ticks(c) : ''}${under}`
        return {
          cls: cx(`sb-va--${p.valign}`), vars: cols(p.asym),
          inner: `<div class="${cx('sb-cols', p.mphoto === 'bottom' && 'sb-cols--media-last')}"><div class="sb-main">${text(c, ctx, { em: p.em, after })}</div>`
            + `${media(c.photo, { ...frame, cls: cx('sb-aside', frame.cls) }, 'eager')}</div>${strip}`,
        }
      }
      case 'overlay': {
        const p = spec.params
        return {
          cls: `sb-anchor--${p.anchor}`, vars: `--sb-scrim:${p.scrim};`,
          inner: `<div class="sb-hero-bg">${media(c.photo, { crop: 'fill' }, 'eager')}<div class="sb-hero-scrim"></div></div>${text(c, ctx, { em: p.em, center: p.anchor === 'center', after: rating(c) })}`,
        }
      }
      case 'stacked': {
        const p = spec.params
        const image = p.image === 'none' ? '' : media(c.photo, { crop: 'fill' }, 'eager')
        return { cls: `sb-image--${p.image}`, inner: `${text(c, ctx, { em: p.em, center: p.align === 'center', after: p.image === 'none' ? rating(c) : '', fold: p.image !== 'none' })}${image}` }
      }
      case 'typeled': {
        const p = spec.params
        const eyebrow = `<p class="sb-eyebrow">${motifOn('dot') ? '<span class="sb-dot" aria-hidden="true"></span>' : ''}${esc(c.eyebrow)}</p>`
        const h1 = `<h1 id="sb-hero-title" class="sb-h1" data-heading>${emphasize(c.headline, p.em)}</h1>`
        const sub = c.sub ? `<p class="sb-lead">${esc(c.sub)}</p>` : ''
        const stripe = motifOn('stripe') ? '<div class="sb-divider" aria-hidden="true"><span></span></div>' : ''
        return {
          inner: `<div class="sb-hero-text">${eyebrow}${h1}${stripe}<div class="sb-hero-foot">${sub}${ctas(c, ctx)}</div>${p.trust ? trust(c.badges) : ''}</div>`,
        }
      }
      case 'proof': {
        const p = spec.params
        const reviews = c.reviews.slice(0, p.count).map(review).join('')
        const sum = p.summary === 'none' ? '' : summary(c)
        return {
          vars: '--sb-ta:7;',
          inner: `<div class="sb-cols"><div class="sb-main">${text(c, ctx, { em: p.em })}</div><div class="sb-aside sb-proof">${p.summary === 'top' ? sum + reviews : reviews + sum}</div></div>`,
        }
      }
      case 'contact': {
        const p = spec.params
        return {
          vars: '--sb-ta:7;',
          inner: `<div class="${cx('sb-cols', p.side === 'left' && 'sb-cols--flip')}"><div class="sb-main">${text(c, ctx, { em: p.em, after: rating(c) })}</div><div class="sb-aside">${form(ctx, p.fields)}</div></div>`,
        }
      }
      case 'offset': {
        const p = spec.params
        const k = Math.round((1 / (1 - p.overlap)) * 1000) / 1000
        const h1 = `<h1 id="sb-hero-title" class="sb-h1" data-heading><span class="sb-hl">${esc(c.headline)}</span></h1>`
        const eyebrow = `<p class="sb-eyebrow">${esc(c.eyebrow)}</p>`
        const sub = c.sub ? `<p class="sb-lead">${esc(c.sub)}</p>` : ''
        return {
          vars: `--sb-drop:${p.drop}px;--sb-k:${k};`,
          inner: `<div class="sb-offset-photo">${media(c.photo, { crop: 'fill', stripe: motifOn('stripe') ? corner(p.at, 'right') : undefined }, 'eager')}</div>`
            + `<div class="sb-hero-text">${eyebrow}${h1}<div class="sb-rest">${sub}${ctas(c, ctx)}${rating(c)}</div></div>`,
        }
      }
      case 'bigphone': {
        const p = spec.params
        const call = c.call!
        const phone = `<p class="sb-bigphone-l">${esc(t.voice.cta.callShort)}</p><a class="sb-bigphone" href="${esc(safeUrl(call.href))}" data-call aria-label="${esc(t.voice.cta.call(call.number))}">${esc(call.number)}</a>`
        const quote = c.quote ? `<div class="sb-ctas">${ghost(c.quote.label, c.quote.href)}</div>` : ''
        // Without a photo, the hazard stripe runs as a divider under the headline instead.
        const stripeOn = ctx.motif && p.stripe
        const stripe = !p.photo && stripeOn ? '<div class="sb-divider" aria-hidden="true"><span></span></div>' : ''
        const body = text(c, ctx, { em: p.em, noCtas: true, after: `${stripe}<div class="sb-stack">${phone}</div>${quote}` })
        if (!p.photo) return { inner: body }
        return {
          vars: '--sb-ta:8;',
          inner: `<div class="sb-cols sb-cols--media-last"><div class="sb-main">${body}</div>${media(c.photo, { crop: p.crop, cls: 'sb-aside', stripe: stripeOn ? corner(p.at, ctx.rhythm.side) : undefined }, 'eager')}</div>`,
        }
      }
      case 'floatcard': {
        const p = spec.params
        const card = motifOn('floatcard') ? floatCard(c, p.card) : ''
        return {
          vars: cols(p.asym),
          inner: `<div class="sb-cols sb-cols--media-last"><div class="sb-main">${text(c, ctx, { em: p.em, dot: p.dot, after: p.ticks ? ticks(c) : '' })}</div>`
            + `${media(c.photo, { crop: p.crop, cls: 'sb-aside', float: card ? { html: card, at: corner(p.at, ctx.rhythm.side) } : undefined }, 'eager')}</div>`,
        }
      }
      case 'editorial': {
        const p = spec.params
        const figure = p.image === 'figure' ? media(c.photo, { crop: 'fill', caption: motifOn('caption') ? c.photo?.alt : undefined }, 'eager') : ''
        return { cls: `sb-image--${p.image}`, inner: `${text(c, ctx, { em: p.em, center: true, fold: !!figure })}${figure}` }
      }
      case 'sticker': {
        const p = spec.params
        return {
          vars: cols(p.asym),
          inner: `<div class="sb-cols sb-cols--media-last"><div class="sb-main">${text(c, ctx, { em: p.em })}</div>`
            + `${media(c.photo, { crop: p.crop, cls: 'sb-aside', blob: ctx.motif && p.blob, stickers: motifOn('sticker') ? stickers(c, p.count, ctx.rhythm.side) : [], rot: p.rot }, 'eager')}</div>`,
        }
      }
    }
  },
  words: (_s, c) => ({ title: c.headline, texts: [c.sub] }),
})
