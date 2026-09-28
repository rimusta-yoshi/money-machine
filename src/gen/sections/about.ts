import { z } from 'zod'
import { esc } from '../html'
import { pick } from '../rng'
import type { PageContent, PagePhoto } from '../content'
import { defineSection, specSchema } from '../core/define'
import { head, img } from '../core/markup'

export interface AboutView {
  title: string
  body: string
  photo: PagePhoto | null
  stats: { n: string; l: string }[]
}

export function aboutView(c: PageContent): AboutView {
  const trade = c.trade.name.toLowerCase()
  const place = c.business.location
  return {
    title: place ? `Local ${trade} in ${place}.` : `Your local ${trade} team.`,
    body: c.business.about || `We’re a local, independent ${trade} business. You deal with the same people from first call to finished job.`,
    photo: c.photos.about,
    stats: [
      ...(c.business.years ? [{ n: c.business.years, l: 'Years local' }] : []),
      ...(c.jobsDone ? [{ n: c.jobsDone, l: 'Jobs done' }] : []),
      ...(c.rating ? [{ n: `${c.rating.score}/5`, l: `${c.rating.count} reviews` }] : []),
    ],
  }
}

export const aboutSchema = specSchema('about', {
  photo_split: { stats: z.boolean() },
  statement: { size: z.enum(['large', 'medium']), align: z.enum(['left', 'center']) },
  stats_led: { style: z.enum(['card', 'plain']) },
  banner: { height: z.enum(['short', 'tall']) },
})
export type AboutSpec = z.infer<typeof aboutSchema>

const statsList = (v: AboutView, card = false) =>
  v.stats.length
    ? `<ul class="sb-about-stats">${v.stats.map(s => `<li${card ? ' class="sb-card"' : ''}><span class="sb-stat-n">${esc(s.n)}</span><span class="sb-stat-l">${esc(s.l)}</span></li>`).join('')}</ul>`
    : ''

export const about = defineSection<AboutSpec, AboutView>({
  type: 'about',
  label: 'About',
  view: aboutView,
  schema: aboutSchema,
  anchor: 'about',
  archetypes: {
    photo_split: {
      label: 'Photo and story', why: 'needs a team or van photo',
      gate: v => v.photo !== null,
      params: (r, v) => ({ stats: v.stats.length > 0 && r() < 0.7 }),
      features: p => [p.stats ? 1 : 0],
      sided: true,
    },
    statement: {
      label: 'Statement', why: '',
      gate: () => true,
      params: (r, v) => ({ size: v.body.length > 220 ? 'medium' : pick(r, ['large', 'medium'] as const), align: pick(r, ['left', 'center'] as const) }),
      features: p => [p.size === 'large' ? 1 : 0, p.align === 'center' ? 1 : 0],
      loud: true,
    },
    stats_led: {
      label: 'Big numbers', why: 'needs 2 of: years in business, jobs done, rating',
      gate: v => v.stats.length >= 2,
      params: r => ({ style: pick(r, ['card', 'plain'] as const) }),
      features: p => [p.style === 'card' ? 1 : 0],
    },
    banner: {
      label: 'Photo banner', why: 'needs a team or van photo',
      gate: v => v.photo !== null,
      params: r => ({ height: pick(r, ['short', 'tall'] as const) }),
      features: p => [p.height === 'tall' ? 1 : 0],
    },
  },
  weights: {
    professional: { photo_split: 3, statement: 1.5, stats_led: 2, banner: 1 },
    luxury: { photo_split: 2, statement: 3, stats_led: 1, banner: 2.5 },
    family: { photo_split: 3, statement: 1.5, stats_led: 1.5, banner: 2 },
    brutalism: { photo_split: 1.5, statement: 3, stats_led: 2.5, banner: 1 },
  },
  fallback: { v: 1, section: 'about', archetype: 'statement', params: { size: 'medium', align: 'left' } },
  cards: s => s.archetype === 'stats_led' && s.params.style === 'card',
  body: (s, _style, v) => {
    const h = (center = false) => head('about', { eyebrow: 'About us', title: v.title, cls: center ? 'sb-head--center' : undefined })
    const body = (cls = 'sb-about-body') => `<p class="${cls}">${esc(v.body)}</p>`
    switch (s.archetype) {
      case 'photo_split':
        return { inner: `<div class="sb-split"><div class="sb-stack">${h()}${body()}${s.params.stats ? statsList(v) : ''}</div>${img(v.photo, 'sb-photo sb-about-photo')}</div>` }
      case 'statement': {
        const center = s.params.align === 'center'
        return { cls: `sb-size--${s.params.size}${center ? ' sb-center' : ''}`, inner: `${h(center)}${body('sb-about-statement')}${statsList(v)}` }
      }
      case 'stats_led':
        return { inner: `<div class="sb-split sb-split--top"><div class="sb-stack">${h()}${body()}</div>${statsList(v, s.params.style === 'card')}</div>` }
      case 'banner':
        return { cls: `sb-height--${s.params.height}`, inner: `${img(v.photo, 'sb-photo sb-about-banner')}<div class="sb-split sb-split--top">${h()}<div class="sb-stack">${body()}${statsList(v)}</div></div>` }
    }
  },
  words: (_s, v) => ({ title: v.title, texts: [v.body] }),
})

export const ABOUT_CSS = `
.sb-about-photo{aspect-ratio:4/3;min-height:280px}
.sb-about-body{font-size:18px;color:var(--sb-mu);max-width:62ch}
.sb-about-statement{font-family:var(--sb-fd);font-weight:var(--sb-dw);letter-spacing:var(--sb-tr);line-height:1.3;max-width:34ch;font-size:calc(var(--sb-h2) * 0.62)}
.sb-size--large .sb-about-statement{font-size:calc(var(--sb-h2) * 0.8)}
.sb-center .sb-about-statement{align-self:center;text-align:center}
.sb-center .sb-about-stats{justify-content:center}
.sb-about-stats{display:flex;flex-wrap:wrap;gap:var(--sb-gap) calc(var(--sb-gap) * 3)}
.sb-about-stats .sb-card{min-width:160px}
.sb-about-banner{width:100%;height:280px}
.sb-height--tall .sb-about-banner{height:420px}
@container (max-width: 719px){
  .sb-about-photo{min-height:0}
  .sb-about-statement,.sb-size--large .sb-about-statement{font-size:calc(var(--sb-h2-m) * 0.8)}
  .sb-about-banner,.sb-height--tall .sb-about-banner{height:220px}
  .sb-about-stats{gap:var(--sb-gap) calc(var(--sb-gap) * 2)}
}
`
