import { z } from 'zod'
import { esc } from '../html'
import { pick } from '../rng'
import type { PageContent, PageReview } from '../content'
import { defineSection, specSchema } from '../core/define'
import { head, stars } from '../core/markup'

export interface ReviewsView {
  reviews: readonly PageReview[]
  rating: { score: number; count: number } | null
}
/** Reviews and rating only reach the page when the reviews extra is on (see pageContent). */
export const reviewsView = (c: PageContent): ReviewsView => ({ reviews: c.reviews, rating: c.rating })

const titleOf = (v: ReviewsView) => (v.rating ? `Rated ${v.rating.score} from ${v.rating.count} reviews.` : 'What our customers say.')
const HEAD = (v: ReviewsView, center = false) =>
  head('testimonials', { eyebrow: 'Reviews', title: titleOf(v), cls: center ? 'sb-head--center' : undefined })

const quote = (r: PageReview, cls = '') =>
  `<figure class="sb-quote${cls}">${stars(r.rating)}<blockquote><p>“${esc(r.text)}”</p></blockquote><figcaption class="sb-who"><b>${esc(r.author)}</b>${r.location ? `, ${esc(r.location)}` : ''}</figcaption></figure>`

export const testimonialsSchema = specSchema('testimonials', {
  cards: { count: z.union([z.literal(1), z.literal(2), z.literal(3)]), style: z.enum(['card', 'rule']) },
  spotlight: { align: z.enum(['left', 'center']) },
  split: { count: z.union([z.literal(1), z.literal(2)]) },
  scroll: { style: z.enum(['card', 'rule']) },
  list: { cols: z.union([z.literal(1), z.literal(2)]) },
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
      params: (r, v) => ({ count: Math.min(3, v.reviews.length) as 1 | 2 | 3, style: pick(r, ['card', 'rule'] as const) }),
      features: p => [p.count / 3, p.style === 'card' ? 1 : 0],
    },
    spotlight: {
      label: 'Spotlight quote', why: 'needs a review',
      gate: v => v.reviews.length >= 1 && v.reviews[0].text.length <= 280,
      params: r => ({ align: pick(r, ['left', 'center'] as const) }),
      features: p => [p.align === 'center' ? 1 : 0],
      loud: true,
    },
    split: {
      label: 'Rating and quotes', why: 'needs your star rating and a review',
      gate: v => v.rating !== null && v.reviews.length >= 1,
      params: (r, v) => ({ count: v.reviews.length >= 2 ? pick(r, [1, 2] as const) : 1 }),
      features: p => [p.count / 2],
    },
    scroll: {
      label: 'Scrolling reviews', why: 'needs 3+ reviews',
      gate: v => v.reviews.length >= 3,
      params: r => ({ style: pick(r, ['card', 'rule'] as const) }),
      features: p => [p.style === 'card' ? 1 : 0],
    },
    list: {
      label: 'Review list', why: 'needs 2+ reviews',
      gate: v => v.reviews.length >= 2,
      params: (r, v) => ({ cols: v.reviews.length >= 4 ? pick(r, [1, 2] as const) : 1 }),
      features: p => [p.cols === 2 ? 1 : 0],
    },
  },
  weights: {
    professional: { cards: 3, spotlight: 1, split: 2.5, scroll: 1.5, list: 1 },
    luxury: { cards: 1, spotlight: 3, split: 1.5, scroll: 1, list: 2 },
    family: { cards: 3, spotlight: 1.5, split: 2, scroll: 2, list: 1 },
    brutalism: { cards: 2, spotlight: 2.5, split: 1, scroll: 1.5, list: 2 },
  },
  fallback: { v: 1, section: 'testimonials', archetype: 'cards', params: { count: 1, style: 'rule' } },
  cards: s => (s.archetype === 'cards' || s.archetype === 'scroll') ? s.params.style === 'card' : s.archetype === 'split',
  body: (s, _style, v) => {
    switch (s.archetype) {
      case 'cards': {
        const cls = s.params.style === 'card' ? 'sb-card' : 'sb-rule'
        return { vars: `--sb-cols:${s.params.count};--sb-cols-m:1;`, inner: `${HEAD(v)}<ul class="sb-grid">${v.reviews.slice(0, s.params.count).map(r => `<li class="${cls}">${quote(r)}</li>`).join('')}</ul>` }
      }
      case 'spotlight': {
        const center = s.params.align === 'center'
        return { cls: center ? 'sb-center' : '', inner: `${HEAD(v, center)}${quote(v.reviews[0], ' sb-quote--big')}` }
      }
      case 'split': {
        const r = v.rating!
        const summary = `<div class="sb-summary"><p class="sb-stat-n" aria-hidden="true">${esc(r.score)}</p>${stars(r.score)}<p class="sb-stat-l">from ${esc(r.count)} reviews</p></div>`
        return { inner: `<div class="sb-split sb-split--top"><div class="sb-stack">${HEAD(v)}${summary}</div><ul class="sb-stack">${v.reviews.slice(0, s.params.count).map(q => `<li class="sb-card">${quote(q)}</li>`).join('')}</ul></div>` }
      }
      case 'scroll': {
        const cls = s.params.style === 'card' ? 'sb-card' : 'sb-rule'
        return { inner: `${HEAD(v)}<ul data-scroll tabindex="0" aria-label="Customer reviews, scroll sideways for more">${v.reviews.map(r => `<li class="${cls}">${quote(r)}</li>`).join('')}</ul>` }
      }
      case 'list':
        return { vars: `--sb-cols:${s.params.cols};--sb-cols-m:1;`, inner: `${HEAD(v)}<ul class="sb-grid sb-review-list">${v.reviews.map(r => `<li class="sb-rule">${quote(r)}</li>`).join('')}</ul>` }
    }
  },
  words: (_s, v) => ({ title: titleOf(v), texts: v.reviews.map(r => r.text) }),
})

export const TESTIMONIALS_CSS = `
.sb-quote{display:flex;flex-direction:column;gap:12px}
.sb-quote--big p{font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:calc(var(--sb-h2) * 0.62);line-height:1.3;letter-spacing:var(--sb-tr);max-width:36ch}
.sb-center .sb-quote--big{align-items:center;text-align:center;align-self:center}
.sb-summary{display:flex;flex-direction:column;gap:8px}
.sb-summary .sb-stat-n{font-size:calc(var(--sb-h2) * 1.6)}
.sb-review-list{gap:0 calc(var(--sb-gap) * 3)}
.sb-review-list li{padding-bottom:var(--sb-gap)}
@container (max-width: 719px){
  .sb-quote--big p{font-size:calc(var(--sb-h2-m) * 0.75)}
}
`
