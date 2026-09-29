import { z } from 'zod'
import { cx, esc } from '../html'
import { pick } from '../rng'
import type { PageContent, PageReview } from '../content'
import { defineSection, specSchema } from '../core/define'
import type { BodyContext } from '../core/define'
import { head, stars } from '../core/markup'
import { rollAlign, rollBreak, rollMotif } from '../core/punch'
import { THEMES } from '../themes'
import { ALIGNS, BREAKS, MOTIFS } from '../themes/types'

export interface ReviewsView {
  reviews: readonly PageReview[]
  rating: { score: number; count: number } | null
}
/** Reviews and rating only reach the page when the reviews extra is on (see pageContent). */
export const reviewsView = (c: PageContent): ReviewsView => ({ reviews: c.reviews, rating: c.rating })

const HEAD = (ctx: BodyContext, align: 'left' | 'center' | 'row' = 'left', hidden = false) =>
  head('testimonials', { eyebrow: ctx.biome.voice.eyebrows.testimonials, title: ctx.biome.voice.titles.reviews, align, hidden })

const who = (r: PageReview) => `<figcaption class="sb-who"><b>${esc(r.author)}</b>${r.location ? ` · ${esc(r.location)}` : ''}</figcaption>`
const quote = (r: PageReview, cls = '') =>
  `<figure class="${cx('sb-quote', cls)}">${stars(r.rating)}<blockquote><p>“${esc(r.text)}”</p></blockquote>${who(r)}</figure>`

const summary = (v: ReviewsView) => {
  const r = v.rating!
  return `<div class="sb-summary"><p class="sb-stat-n" aria-hidden="true">${esc(r.score)}</p>${stars(r.score)}<p class="sb-stat-l">from ${esc(r.count)} reviews</p></div>`
}

/** The first review short enough to be set large. */
const bigOne = (v: ReviewsView, max: number) => v.reviews.find(r => r.text.length <= max) ?? null

export const testimonialsSchema = specSchema('testimonials', {
  cards: { count: z.union([z.literal(1), z.literal(2), z.literal(3)]), align: z.enum(ALIGNS), brk: z.enum(BREAKS) },
  spotlight: { align: z.enum(ALIGNS), brk: z.enum(BREAKS) },
  split: { count: z.union([z.literal(1), z.literal(2)]), brk: z.enum(BREAKS) },
  scroll: { brk: z.enum(BREAKS) },
  list: { cols: z.union([z.literal(1), z.literal(2)]), brk: z.enum(BREAKS) },
  bigquote: { brk: z.enum(BREAKS) },
  centred: { motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
  bubble: { motif: z.enum(MOTIFS), side: z.enum(['left', 'right']) },
  panel: { count: z.union([z.literal(1), z.literal(2)]) },
})
export type TestimonialsSpec = z.infer<typeof testimonialsSchema>

export const testimonials = defineSection<TestimonialsSpec, ReviewsView>({
  type: 'testimonials',
  label: 'Reviews',
  view: reviewsView,
  schema: testimonialsSchema,
  anchor: 'reviews',
  archetypes: {
    cards: {
      label: 'Review cards', why: 'needs reviews',
      gate: v => v.reviews.length >= 1,
      params: (r, { content: v, biome: t }) => ({ count: Math.min(3, v.reviews.length) as 1 | 2 | 3, align: rollAlign(r, t, ['left', 'split', 'center']), brk: rollBreak(r, t, ['band', 'rule', 'panel']) }),
      features: p => [p.count / 3, ALIGNS.indexOf(p.align) / 2, BREAKS.indexOf(p.brk) / 2],
      focal: (_p, z) => ({ focal: z.h2, second: 17 }),
    },
    spotlight: {
      label: 'Spotlight quote', why: 'needs a review of 280 characters or fewer',
      gate: v => !!bigOne(v, 280),
      params: (r, { biome: t }) => ({ align: rollAlign(r, t, ['left', 'center']), brk: rollBreak(r, t, ['band', 'panel', 'rule']) }),
      features: p => [p.align === 'center' ? 1 : 0, BREAKS.indexOf(p.brk) / 2, 1],
      focal: (_p, z) => ({ focal: z.h2 * 0.62, second: 17 }),
      loud: true,
    },
    split: {
      label: 'Rating and quotes', why: 'needs your star rating and a review',
      gate: v => v.rating !== null && v.reviews.length >= 1,
      params: (r, { content: v, biome: t }) => ({ count: v.reviews.length >= 2 ? pick(r, [1, 2] as const) : 1, brk: rollBreak(r, t, ['band', 'rule']) }),
      features: p => [p.count / 2, 0.5],
      focal: (_p, z) => ({ focal: z.xl * 1.4, second: z.h2 }),
    },
    scroll: {
      label: 'Scrolling reviews', why: 'needs 3+ reviews',
      gate: v => v.reviews.length >= 3,
      params: (r, { biome: t }) => ({ brk: rollBreak(r, t, ['band', 'rule']) }),
      features: p => [p.brk === 'rule' ? 1 : 0, 1],
      focal: (_p, z) => ({ focal: z.h2, second: 17 }),
    },
    list: {
      label: 'Review list', why: 'needs 2+ reviews',
      gate: v => v.reviews.length >= 2,
      params: (r, { content: v, biome: t }) => ({ cols: v.reviews.length >= 4 ? pick(r, [1, 2] as const) : 1, brk: rollBreak(r, t, ['band', 'rule']) }),
      features: p => [p.cols - 1, 0.3],
      focal: (_p, z) => ({ focal: z.h2, second: 17 }),
    },
    bigquote: {
      label: 'Giant quote', why: 'needs a review of 200 characters or fewer',
      gate: v => !!bigOne(v, 200),
      params: (r, { biome: t }) => ({ brk: rollBreak(r, t, ['band', 'rule']) }),
      features: p => [p.brk === 'rule' ? 1 : 0, 1, 1],
      focal: (_p, z) => ({ focal: z.xl * 2, second: z.h2 * 0.6 }),
      loud: true,
    },
    centred: {
      label: 'Centred quote', why: 'needs a review of 280 characters or fewer',
      gate: v => !!bigOne(v, 280),
      params: (r, { biome: t }) => ({ motif: rollMotif(r, t, 'testimonials', ['diamond'], 0.15), brk: rollBreak(r, t, ['band', 'rule']) }),
      features: p => [p.motif === 'diamond' ? 1 : 0, 1, 1],
      focal: (_p, z) => ({ focal: z.h2 * 0.75, second: 15 }),
      loud: true,
    },
    bubble: {
      label: 'Speech bubble', why: 'needs a review of 220 characters or fewer',
      gate: v => !!bigOne(v, 220),
      params: (r, { biome: t }) => ({ motif: rollMotif(r, t, 'testimonials', ['bubble'], 0.05), side: pick(r, ['left', 'right'] as const) }),
      features: p => [p.side === 'right' ? 1 : 0, 1, 1],
      focal: (_p, z) => ({ focal: z.h2 * 0.62, second: 19 }),
    },
    panel: {
      label: 'Rating panel', why: 'needs your star rating and a review',
      gate: v => v.rating !== null && v.reviews.length >= 1,
      params: (r, { content: v }) => ({ count: v.reviews.length >= 2 ? pick(r, [2, 2, 1] as const) : 1 }),
      features: p => [p.count / 2, 1, 1],
      focal: (_p, z) => ({ focal: z.xl * 1.4, second: z.h2 }),
    },
  },
  weights: {
    'workwear': { cards: 2, spotlight: 1, split: 1.4, scroll: 1.4, list: 1.2, bigquote: 3.5 },
    'clean-pro': { cards: 3, spotlight: 1.2, split: 2.4, scroll: 1.6, list: 1, panel: 3 },
    'craft-heritage': { cards: 1, spotlight: 1.4, split: 1.4, scroll: 1, list: 2, centred: 3.5 },
    'friendly-local': { cards: 2.6, spotlight: 1, split: 1.6, scroll: 2, list: 1, bubble: 3.5 },
  },
  fallback: { v: 2, section: 'testimonials', archetype: 'cards', step: 2, params: { count: 1, align: 'left', brk: 'band' } },
  panel: s => s.archetype === 'panel' || (s.params as { brk?: string }).brk === 'panel',
  body: (s, v, ctx) => {
    switch (s.archetype) {
      case 'cards': {
        const p = s.params
        const align = p.align === 'split' ? 'row' : p.align
        return { vars: `--sb-cols:${p.count};--sb-cols-m:1;`, inner: `${HEAD(ctx, align)}<ul class="sb-grid sb-reviews">${v.reviews.slice(0, p.count).map(r => `<li class="sb-card">${quote(r)}</li>`).join('')}</ul>` }
      }
      case 'spotlight': {
        const center = s.params.align === 'center'
        return { cls: center ? 'sb-center' : '', inner: `${HEAD(ctx, center ? 'center' : 'left')}${quote(bigOne(v, 280)!, 'sb-quote--big')}` }
      }
      case 'split':
        return {
          vars: '--sb-ta:5;',
          inner: `<div class="sb-cols sb-cols--top"><div class="sb-main sb-stack">${HEAD(ctx)}${summary(v)}</div><ul class="sb-aside sb-stack">${v.reviews.slice(0, s.params.count).map(q => `<li class="sb-card">${quote(q)}</li>`).join('')}</ul></div>`,
        }
      case 'scroll':
        return { inner: `${HEAD(ctx, 'row')}<ul class="sb-reviews" data-scroll tabindex="0" aria-label="Customer reviews, scroll sideways for more">${v.reviews.map(r => `<li class="sb-card">${quote(r)}</li>`).join('')}</ul>` }
      case 'list':
        return { vars: `--sb-cols:${s.params.cols};--sb-cols-m:1;`, inner: `${HEAD(ctx)}<ul class="sb-grid sb-review-list">${v.reviews.map(r => `<li>${quote(r)}</li>`).join('')}</ul>` }
      case 'bigquote': {
        const r = bigOne(v, 200)!
        return { inner: `${HEAD(ctx, 'left', true)}<div class="sb-bigquote"><figure class="sb-quote">${stars(r.rating)}<blockquote><p>${esc(r.text)}</p></blockquote>${who(r)}</figure></div>` }
      }
      case 'centred': {
        const r = bigOne(v, 280)!
        const orn = ctx.motif ? '<div class="sb-diamond" aria-hidden="true"><span></span></div>' : ''
        return { cls: 'sb-center', inner: `${HEAD(ctx, 'center', true)}<figure class="sb-centred">${orn}<blockquote><p>“${esc(r.text)}”</p></blockquote>${who(r)}</figure>` }
      }
      case 'bubble': {
        const r = bigOne(v, 220)!
        const p = s.params
        return {
          inner: `${HEAD(ctx)}<figure class="${cx('sb-speech', p.side === 'right' && 'sb-speech--right', ctx.motif && 'sb-speech--tail')}"><blockquote class="sb-speech-b">${stars(r.rating)}<p>“${esc(r.text)}”</p></blockquote><figcaption class="sb-speech-who"><b>${esc(r.author)}</b>${r.location ? `<span class="sb-mu">${esc(r.location)}</span>` : ''}</figcaption></figure>`,
        }
      }
      case 'panel': {
        const p = s.params
        return {
          brk: 'panel', vars: '--sb-ta:4;',
          inner: `<div class="sb-cols sb-cols--top"><div class="sb-main sb-stack">${HEAD(ctx)}${summary(v)}</div><ul class="sb-aside sb-grid" style="--sb-cols:${p.count};--sb-cols-m:1">${v.reviews.slice(0, p.count).map(q => `<li class="sb-card">${quote(q)}</li>`).join('')}</ul></div>`,
        }
      }
    }
  },
  words: (s, v, style) => ({
    title: s.archetype === 'bigquote' || s.archetype === 'centred' ? '' : THEMES[style.theme].voice.titles.reviews,
    texts: v.reviews.map(r => r.text),
  }),
})

export const TESTIMONIALS_CSS = `
.sb-quote{display:flex;flex-direction:column;gap:12px}
.sb-quote p{font-size:17px;line-height:1.55}
.sb-who{font-size:15px;color:var(--sb-mu)}
.sb-who b{color:var(--sb-fg);font-weight:700}
.sb-quote--big p{font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:calc(var(--sb-h2) * 0.62);line-height:1.25;letter-spacing:var(--sb-dtr);max-width:34ch}
.sb-center .sb-quote--big{align-items:center;text-align:center;align-self:center}
.sb-summary{display:flex;flex-direction:column;gap:8px}
.sb-summary .sb-stat-n{font-size:calc(var(--sb-xl) * 1.4)}
.sb-review-list{gap:0 calc(var(--sb-gap) * 3)}
.sb-review-list>li{padding:var(--sb-gap) 0;border-top:1px solid var(--sb-hair)}
.sb-bigquote{position:relative;padding-left:calc(var(--sb-xl) * 1.5)}
.sb-bigquote::before{content:"\\201C";position:absolute;left:0;top:-0.08em;font-family:var(--sb-fd);font-size:calc(var(--sb-xl) * 2.1);line-height:0.8;color:var(--sb-accent)}
.sb-bigquote p{font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:calc(var(--sb-h2) * 0.6);line-height:1.15;letter-spacing:var(--sb-dtr);text-transform:var(--sb-dup);max-width:26ch}
.sb-bigquote .sb-who{font-family:var(--sb-fl);font-weight:var(--sb-lw);letter-spacing:var(--sb-ltr);text-transform:var(--sb-lup);font-size:18px}
.sb-bigquote .sb-who b{font-weight:inherit;color:var(--sb-mu)}
.sb-centred{display:flex;flex-direction:column;align-items:center;gap:24px;text-align:center}
.sb-centred p{font-family:var(--sb-fd);font-style:italic;font-weight:var(--sb-dw);font-size:calc(var(--sb-h2) * 0.72);line-height:1.3;max-width:26ch}
.sb-centred .sb-who{font-family:var(--sb-fl);font-weight:var(--sb-lw);font-size:13px;letter-spacing:var(--sb-ltr);text-transform:var(--sb-lup)}
.sb-speech{display:flex;align-items:center;gap:calc(var(--sb-gap) * 2.5)}
.sb-speech--right{flex-direction:row-reverse;text-align:right}
.sb-speech-b{position:relative;flex:1;display:flex;flex-direction:column;gap:12px;padding:44px 48px;border-radius:36px;background:#FFFFFF;color:var(--sb-ink);box-shadow:0 10px 30px color-mix(in srgb,var(--sb-ink) 8%,transparent)}
.sb-speech-b .sb-stars{color:var(--sb-brand-text)}
.sb-speech-b p{font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:calc(var(--sb-h2) * 0.6);line-height:1.3;letter-spacing:var(--sb-dtr)}
.sb-speech--tail .sb-speech-b::after{content:"";position:absolute;left:64px;bottom:-20px;width:44px;height:44px;background:#FFFFFF;transform:rotate(45deg);border-radius:6px}
.sb-speech--right.sb-speech--tail .sb-speech-b::after{left:auto;right:64px}
.sb-speech-who{display:flex;flex-direction:column;gap:4px;min-width:180px;font-size:19px}
.sb-speech-who .sb-mu{font-size:16px}
@container (max-width: 719px){
  .sb-quote--big p{font-size:calc(var(--sb-h2m) * 0.7)}
  .sb-bigquote{padding-left:0;padding-top:calc(var(--sb-xlm) * 1.1)}
  .sb-bigquote::before{font-size:calc(var(--sb-xlm) * 1.8)}
  .sb-bigquote p{font-size:calc(var(--sb-h2m) * 0.72)}
  .sb-centred p{font-size:calc(var(--sb-h2m) * 0.75)}
  .sb-speech,.sb-speech--right{flex-direction:column;align-items:stretch;text-align:left;gap:34px}
  .sb-speech-b{padding:28px 24px}
  .sb-speech-b p{font-size:calc(var(--sb-h2m) * 0.66)}
  .sb-speech--right.sb-speech--tail .sb-speech-b::after{right:auto;left:48px}
}
`
