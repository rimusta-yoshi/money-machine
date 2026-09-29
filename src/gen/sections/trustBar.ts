import { z } from 'zod'
import { esc } from '../html'
import { pick } from '../rng'
import { businessName } from '../content'
import type { PageContent } from '../content'
import { defineSection, specSchema } from '../core/define'
import { head, icon } from '../core/markup'
import type { IconName } from '../core/markup'

export interface TrustView {
  name: string
  items: { icon: IconName; text: string }[]
  stats: { n: string; l: string }[]
}

export function trustView(c: PageContent): TrustView {
  const items: TrustView['items'] = [
    ...c.badges.map(text => ({ icon: 'shield' as const, text })),
    ...(c.rating ? [{ icon: 'star' as const, text: `Rated ${c.rating.score} from ${c.rating.count} reviews` }] : []),
    ...(c.emergency ? [{ icon: 'clock' as const, text: 'Emergency call-outs' }] : []),
    ...(c.business.years ? [{ icon: 'badge' as const, text: `${c.business.years} years in business` }] : []),
    ...(c.jobsDone ? [{ icon: 'check' as const, text: `${c.jobsDone} jobs done` }] : []),
  ]
  const stats = [
    ...(c.business.years ? [{ n: c.business.years, l: 'Years in business' }] : []),
    ...(c.jobsDone ? [{ n: c.jobsDone, l: 'Jobs done' }] : []),
    ...(c.rating ? [{ n: `${c.rating.score}/5`, l: `From ${c.rating.count} reviews` }] : []),
  ]
  return { name: businessName(c), items, stats }
}

export const trustBarSchema = specSchema('trust_bar', {
  strip: { align: z.enum(['center', 'left']), divider: z.enum(['dot', 'none']) },
  tiles: { style: z.enum(['card', 'plain']) },
  stats: { style: z.enum(['card', 'plain']) },
})
export type TrustBarSpec = z.infer<typeof trustBarSchema>

export const trustBar = defineSection<TrustBarSpec, TrustView>({
  type: 'trust_bar',
  label: 'Trust bar',
  view: trustView,
  schema: trustBarSchema,
  archetypes: {
    strip: {
      label: 'Strip', why: 'needs a credential, rating or other fact',
      gate: v => v.items.length >= 1,
      params: r => ({ align: pick(r, ['center', 'left'] as const), divider: pick(r, ['dot', 'none'] as const) }),
      features: p => [p.align === 'center' ? 1 : 0, p.divider === 'dot' ? 1 : 0],
    },
    tiles: {
      label: 'Tiles', why: 'needs 2+ credentials or facts',
      gate: v => v.items.length >= 2,
      params: r => ({ style: pick(r, ['card', 'plain'] as const) }),
      features: p => [p.style === 'card' ? 1 : 0],
      loud: true,
    },
    stats: {
      label: 'Big numbers', why: 'needs 2 of: years in business, jobs done, rating',
      gate: v => v.stats.length >= 2,
      params: r => ({ style: pick(r, ['card', 'plain'] as const) }),
      features: p => [p.style === 'card' ? 1 : 0],
      loud: true,
    },
  },
  weights: {
    professional: { strip: 2, tiles: 1.5, stats: 1.5 },
    luxury: { strip: 3, tiles: 1, stats: 1.5 },
    family: { strip: 1.5, tiles: 2.5, stats: 1.5 },
    brutalism: { strip: 1.5, tiles: 1.5, stats: 3 },
  },
  fallback: { v: 1, section: 'trust_bar', archetype: 'strip', params: { align: 'center', divider: 'none' } },
  cards: s => s.archetype !== 'strip' && s.params.style === 'card',
  body: (s, _style, v) => {
    const title = head('trust_bar', { title: `Why choose ${v.name}`, hidden: true })
    if (s.archetype === 'strip') {
      const items = v.items.map(i => `<li>${icon(i.icon, 18)}<span>${esc(i.text)}</span></li>`).join('')
      return { cls: `sb-align--${s.params.align} sb-div--${s.params.divider}`, inner: `${title}<ul class="sb-trust-strip">${items}</ul>` }
    }
    if (s.archetype === 'tiles') {
      const cls = s.params.style === 'card' ? 'sb-card' : 'sb-tile'
      const items = v.items.map(i => `<li class="${cls}">${icon(i.icon, 24)}<span>${esc(i.text)}</span></li>`).join('')
      return { vars: `--sb-cols:${Math.min(4, v.items.length)};--sb-cols-m:2;`, inner: `${title}<ul class="sb-grid sb-trust-tiles">${items}</ul>` }
    }
    const cls = s.params.style === 'card' ? 'sb-card' : 'sb-tile'
    const stats = v.stats.map(st => `<li class="${cls}"><span class="sb-stat-n">${esc(st.n)}</span><span class="sb-stat-l">${esc(st.l)}</span></li>`).join('')
    return { vars: `--sb-cols:${v.stats.length};--sb-cols-m:${v.stats.length === 2 ? 2 : 1};`, inner: `${title}<ul class="sb-grid sb-trust-stats">${stats}</ul>` }
  },
  // The heading is for screen readers only, so it takes no lines.
  words: (_s, v) => ({ title: '', texts: v.items.map(i => i.text) }),
})

export const TRUST_BAR_CSS = `
.sb-trust-bar .sb-wrap{padding-block:calc(var(--sb-py) * 0.45)}
.sb-trust-strip{display:flex;flex-wrap:wrap;gap:12px 32px;font-weight:600;font-size:16px}
.sb-trust-strip li{display:flex;align-items:center;gap:10px;min-height:32px}
.sb-align--center .sb-trust-strip{justify-content:center}
.sb-div--dot .sb-trust-strip li+li::before{content:"";width:5px;height:5px;margin-right:22px;border-radius:50%;background:currentColor;opacity:0.5}
.sb-trust-tiles li{display:flex;align-items:center;gap:12px;font-weight:600}
.sb-trust-tiles .sb-tile,.sb-trust-stats .sb-tile{padding:var(--sb-gap) 0;border-top:var(--sb-bd) solid color-mix(in srgb,var(--sb-fg) 25%,transparent)}
.sb-trust-stats li{text-align:left}
@container (max-width: 719px){
  .sb-trust-strip{flex-direction:column;gap:8px}
  .sb-div--dot .sb-trust-strip li+li::before{display:none}
  .sb-align--center .sb-trust-strip{align-items:flex-start}
}
`
