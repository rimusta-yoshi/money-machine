import { z } from 'zod'
import { esc } from '../html'
import { pick } from '../rng'
import type { PageContent, PagePhoto } from '../content'
import { defineSection, specSchema } from '../core/define'
import { head, icon, img } from '../core/markup'
import type { IconName } from '../core/markup'

/** How the business works. Promises about approach, not facts like ratings or years. */
const POINTS: readonly [string, string][] = [
  ['Quick to respond', 'We get back to you fast and turn up when we say we will.'],
  ['Clear pricing', 'A straightforward quote before any work starts. No hidden charges.'],
  ['Properly qualified', 'Trained and experienced in the work we do.'],
  ['Clean and tidy', 'Dust sheets down, mess cleared up. We treat your home like ours.'],
  ['Kept in the loop', 'Updates as the job goes, and a follow-up once it’s done.'],
]
const ICONS: IconName[] = ['bolt', 'tag', 'badge', 'sparkle', 'chat']
const TITLE = 'Five things we get right, every job.'

export interface WhyView {
  points: readonly [string, string][]
  /** A real photo to sit beside the points, if the customer has one. */
  photo: PagePhoto | null
}
export const whyView = (c: PageContent): WhyView => ({ points: POINTS, photo: c.photos.about ?? c.photos.gallery[0] ?? null })

export const whyUsSchema = specSchema('why_us', {
  grid: { cols: z.union([z.literal(2), z.literal(3)]), style: z.enum(['card', 'plain']), icons: z.boolean() },
  rows: { icons: z.boolean() },
  split: { numbered: z.boolean() },
  numbered: { align: z.enum(['left', 'center']) },
  photo_points: { icons: z.boolean() },
})
export type WhyUsSpec = z.infer<typeof whyUsSchema>

const HEAD = (center = false) => head('why_us', { eyebrow: 'Why choose us', title: TITLE, cls: center ? 'sb-head--center' : undefined })
const point = ([t, d]: readonly [string, string], mark: string) =>
  `${mark}<div class="sb-point"><h3 class="sb-h3">${esc(t)}</h3><p class="sb-mu">${esc(d)}</p></div>`
const num = (i: number) => `<span class="sb-num sb-num--big" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>`

export const whyUs = defineSection<WhyUsSpec, WhyView>({
  type: 'why_us',
  label: 'Why us',
  view: whyView,
  schema: whyUsSchema,
  archetypes: {
    grid: {
      label: 'Grid', why: '',
      gate: () => true,
      params: r => ({ cols: pick(r, [2, 3] as const), style: pick(r, ['card', 'plain'] as const), icons: r() < 0.6 }),
      features: p => [p.cols === 3 ? 1 : 0, p.style === 'card' ? 1 : 0, p.icons ? 1 : 0],
    },
    rows: {
      label: 'Rows', why: '',
      gate: () => true,
      params: r => ({ icons: r() < 0.7 }),
      features: p => [p.icons ? 1 : 0],
    },
    split: {
      label: 'Heading and points', why: '',
      gate: () => true,
      params: r => ({ numbered: r() < 0.5 }),
      features: p => [p.numbered ? 1 : 0],
      loud: true,
    },
    numbered: {
      label: 'Numbered', why: '',
      gate: () => true,
      params: r => ({ align: pick(r, ['left', 'center'] as const) }),
      features: p => [p.align === 'center' ? 1 : 0],
      loud: true,
    },
    photo_points: {
      label: 'Photo and points', why: 'needs a photo',
      gate: v => v.photo !== null,
      params: r => ({ icons: r() < 0.6 }),
      features: p => [p.icons ? 1 : 0],
      sided: true,
    },
  },
  weights: {
    professional: { grid: 2.5, rows: 2, split: 2, numbered: 1, photo_points: 2 },
    luxury: { grid: 1, rows: 2.5, split: 2.5, numbered: 2, photo_points: 2 },
    family: { grid: 3, rows: 2, split: 1, numbered: 1.5, photo_points: 2.5 },
    brutalism: { grid: 1.5, rows: 1.5, split: 2, numbered: 3, photo_points: 1 },
  },
  fallback: { v: 1, section: 'why_us', archetype: 'rows', params: { icons: true } },
  cards: s => s.archetype === 'grid' && s.params.style === 'card',
  body: (s, _style, v) => {
    const mark = (i: number, on: boolean) => (on ? `<span class="sb-point-icon">${icon(ICONS[i % ICONS.length], 24)}</span>` : '')
    switch (s.archetype) {
      case 'grid': {
        const li = v.points.map((p, i) => `<li class="${s.params.style === 'card' ? 'sb-card ' : 'sb-rule '}sb-point-cell">${point(p, mark(i, s.params.icons))}</li>`).join('')
        return { vars: `--sb-cols:${s.params.cols};--sb-cols-m:1;`, inner: `${HEAD()}<ul class="sb-grid">${li}</ul>` }
      }
      case 'rows': {
        const li = v.points.map((p, i) => `<li class="sb-point-row">${point(p, mark(i, s.params.icons))}</li>`).join('')
        return { inner: `${HEAD()}<ul class="sb-points">${li}</ul>` }
      }
      case 'split': {
        const li = v.points.map((p, i) => `<li class="sb-point-row">${point(p, s.params.numbered ? num(i) : mark(i, true))}</li>`).join('')
        return { inner: `<div class="sb-split sb-split--top">${HEAD()}<ul class="sb-points">${li}</ul></div>` }
      }
      case 'numbered': {
        const center = s.params.align === 'center'
        const li = v.points.map((p, i) => `<li class="sb-point-num">${point(p, num(i))}</li>`).join('')
        return { cls: center ? 'sb-center' : '', inner: `${HEAD(center)}<ol class="sb-grid sb-points-num" style="--sb-cols:${v.points.length > 4 ? 3 : 2};--sb-cols-m:1">${li}</ol>` }
      }
      case 'photo_points': {
        const li = v.points.map((p, i) => `<li class="sb-point-row">${point(p, mark(i, s.params.icons))}</li>`).join('')
        return { inner: `${HEAD()}<div class="sb-split sb-split--top"><ul class="sb-points">${li}</ul>${img(v.photo, 'sb-photo sb-why-photo')}</div>` }
      }
    }
  },
  words: (_s, v) => ({ title: TITLE, texts: v.points.flat() }),
})

export const WHY_US_CSS = `
.sb-points{display:flex;flex-direction:column}
.sb-point-row{display:flex;gap:16px;align-items:flex-start;padding:18px 0;border-bottom:1px solid color-mix(in srgb,var(--sb-fg) 18%,transparent)}
.sb-point-row:first-child{padding-top:0}
.sb-point{display:flex;flex-direction:column;gap:6px}
.sb-point-cell{display:flex;flex-direction:column;gap:14px}
.sb-point-icon{display:inline-flex}
.sb-num--big{font-size:calc(var(--sb-h2) * 0.8);line-height:1}
.sb-point-num{display:flex;flex-direction:column;gap:12px}
.sb-center .sb-point-num{align-items:center;text-align:center}
.sb-why-photo{aspect-ratio:4/5;min-height:320px}
@container (max-width: 719px){
  .sb-why-photo{aspect-ratio:4/3;min-height:0}
  .sb-num--big{font-size:calc(var(--sb-h2-m) * 0.9)}
}
`
