import { z } from 'zod'
import { esc } from '../html'
import { pick } from '../rng'
import type { PageContent } from '../content'
import { defineSection, specSchema } from '../core/define'
import { head, icon, link } from '../core/markup'

export interface AreasView {
  areas: readonly string[]
  base: string
  call: { label: string; href: string } | null
}
export const areasView = (c: PageContent): AreasView => ({
  areas: c.areas,
  base: c.business.location,
  call: c.business.tel ? { label: `Call ${c.business.phone}`, href: c.business.tel } : null,
})

const titleOf = (v: AreasView) => `Covering ${v.base || 'your area'}.`
const LEAD = 'Just outside? Give us a ring, we often can.'
const HEAD = (v: AreasView, center = false) =>
  head('areas', { eyebrow: 'Where we work', title: titleOf(v), lead: LEAD, cls: center ? 'sb-head--center' : undefined })

/** "A, B and C" */
const sentence = (xs: readonly string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

export const areasSchema = specSchema('areas', {
  chips: { align: z.enum(['left', 'center']) },
  columns: { cols: z.union([z.literal(2), z.literal(3)]) },
  split: { pins: z.boolean() },
  sentence: { align: z.enum(['left', 'center']) },
})
export type AreasSpec = z.infer<typeof areasSchema>

export const areas = defineSection<AreasSpec, AreasView>({
  type: 'areas',
  label: 'Service areas',
  view: areasView,
  schema: areasSchema,
  anchor: 'areas',
  archetypes: {
    chips: {
      label: 'Chips', why: 'needs the areas you cover',
      gate: v => v.areas.length >= 1,
      params: r => ({ align: pick(r, ['left', 'center'] as const) }),
      features: p => [p.align === 'center' ? 1 : 0],
    },
    columns: {
      label: 'Columns', why: 'needs 4+ areas',
      gate: v => v.areas.length >= 4,
      params: (r, v) => ({ cols: v.areas.length >= 9 ? 3 : pick(r, [2, 3] as const) }),
      features: p => [p.cols === 3 ? 1 : 0],
    },
    split: {
      label: 'Heading and list', why: 'needs the areas you cover',
      gate: v => v.areas.length >= 1,
      params: r => ({ pins: r() < 0.6 }),
      features: p => [p.pins ? 1 : 0],
    },
    sentence: {
      label: 'Sentence', why: 'needs 2–6 areas',
      gate: v => v.areas.length >= 2 && v.areas.length <= 6,
      params: r => ({ align: pick(r, ['left', 'center'] as const) }),
      features: p => [p.align === 'center' ? 1 : 0],
      loud: true,
    },
  },
  weights: {
    professional: { chips: 2.5, columns: 2, split: 2, sentence: 1 },
    luxury: { chips: 1, columns: 2, split: 2.5, sentence: 3 },
    family: { chips: 3, columns: 1.5, split: 1.5, sentence: 2 },
    brutalism: { chips: 1.5, columns: 3, split: 1.5, sentence: 2.5 },
  },
  fallback: { v: 1, section: 'areas', archetype: 'split', params: { pins: true } },
  cards: s => s.archetype === 'chips',
  body: (s, _style, v) => {
    const call = v.call ? link(v.call.label, v.call.href) : ''
    switch (s.archetype) {
      case 'chips': {
        const center = s.params.align === 'center'
        return { cls: center ? 'sb-center' : '', inner: `${HEAD(v, center)}<ul class="sb-row sb-area-chips">${v.areas.map(a => `<li class="sb-chip">${icon('pin', 16)}<span>${esc(a)}</span></li>`).join('')}</ul>` }
      }
      case 'columns':
        return { vars: `--sb-cols:${s.params.cols};--sb-cols-m:2;`, inner: `${HEAD(v)}<ul class="sb-grid sb-area-cols">${v.areas.map(a => `<li>${icon('pin', 16)}<span>${esc(a)}</span></li>`).join('')}</ul>` }
      case 'split':
        return { inner: `<div class="sb-split sb-split--top"><div class="sb-stack">${HEAD(v)}${call}</div><ul class="sb-area-list">${v.areas.map(a => `<li>${s.params.pins ? icon('pin', 18) : ''}<span>${esc(a)}</span></li>`).join('')}</ul></div>` }
      case 'sentence': {
        const center = s.params.align === 'center'
        return { cls: center ? 'sb-center' : '', inner: `${HEAD(v, center)}<p class="sb-area-sentence">We cover ${esc(sentence(v.areas))}.</p>${call}` }
      }
    }
  },
  words: (_s, v) => ({ title: titleOf(v), texts: v.areas }),
})

export const AREAS_CSS = `
.sb-center .sb-area-chips{justify-content:center}
.sb-area-cols{gap:12px 24px}
.sb-area-cols li,.sb-area-list li{display:flex;align-items:center;gap:10px;font-weight:600;overflow-wrap:anywhere}
.sb-area-list{display:flex;flex-direction:column}
.sb-area-list li{padding:14px 0;border-bottom:1px solid color-mix(in srgb,var(--sb-fg) 18%,transparent)}
.sb-area-sentence{font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:calc(var(--sb-h2) * 0.62);line-height:1.3;letter-spacing:var(--sb-tr);max-width:36ch}
.sb-center .sb-area-sentence{align-self:center;text-align:center}
.sb-center .sb-link{align-self:center}
@container (max-width: 719px){
  .sb-area-sentence{font-size:calc(var(--sb-h2-m) * 0.8)}
}
`
