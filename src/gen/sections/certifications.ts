import { z } from 'zod'
import { esc } from '../html'
import { pick } from '../rng'
import type { PageContent } from '../content'
import { defineSection, specSchema } from '../core/define'
import { head, icon } from '../core/markup'

export interface CertsView { badges: readonly string[] }
export const certsView = (c: PageContent): CertsView => ({ badges: c.badges })

const TITLE = 'Our credentials mean your work is safe.'
const HEAD = { eyebrow: 'Certified & insured', title: TITLE, lead: 'Certificates available on request.' }

export const certificationsSchema = specSchema('certifications', {
  cards: { cols: z.union([z.literal(2), z.literal(3)]), mark: z.enum(['badge', 'shield']) },
  checklist: { layout: z.enum(['beside', 'below']) },
  seals: { shape: z.enum(['circle', 'rounded']), align: z.enum(['center', 'left']) },
})
export type CertificationsSpec = z.infer<typeof certificationsSchema>

export const certifications = defineSection<CertificationsSpec, CertsView>({
  type: 'certifications',
  label: 'Certifications',
  view: certsView,
  schema: certificationsSchema,
  archetypes: {
    cards: {
      label: 'Cards', why: 'needs your credentials',
      gate: v => v.badges.length >= 1,
      params: (r, v) => ({ cols: v.badges.length % 3 === 0 || v.badges.length > 4 ? 3 : 2, mark: pick(r, ['badge', 'shield'] as const) }),
      features: p => [p.cols === 3 ? 1 : 0, p.mark === 'badge' ? 1 : 0],
    },
    checklist: {
      label: 'Checklist', why: 'needs your credentials',
      gate: v => v.badges.length >= 1,
      params: r => ({ layout: pick(r, ['beside', 'below'] as const) }),
      features: p => [p.layout === 'beside' ? 1 : 0],
    },
    seals: {
      label: 'Seals', why: 'needs 2–6 short credentials',
      gate: v => v.badges.length >= 2 && v.badges.length <= 6 && v.badges.every(b => b.length <= 32),
      params: r => ({ shape: pick(r, ['circle', 'rounded'] as const), align: pick(r, ['center', 'left'] as const) }),
      features: p => [p.shape === 'circle' ? 1 : 0, p.align === 'center' ? 1 : 0],
      loud: true,
    },
  },
  weights: {
    professional: { cards: 2, checklist: 2.5, seals: 1 },
    luxury: { cards: 1, checklist: 3, seals: 1.5 },
    family: { cards: 2.5, checklist: 1.5, seals: 2 },
    brutalism: { cards: 2, checklist: 1.5, seals: 2.5 },
  },
  fallback: { v: 1, section: 'certifications', archetype: 'checklist', params: { layout: 'below' } },
  cards: s => s.archetype === 'cards',
  body: (s, _style, v) => {
    if (s.archetype === 'cards') {
      const items = v.badges.map(b => `<li class="sb-card sb-cert">${icon(s.params.mark, 28)}<p class="sb-h3">${esc(b)}</p></li>`).join('')
      return { vars: `--sb-cols:${s.params.cols};--sb-cols-m:1;`, inner: `${head('certifications', HEAD)}<ul class="sb-grid">${items}</ul>` }
    }
    if (s.archetype === 'checklist') {
      const items = v.badges.map(b => `<li>${icon('check', 22)}<span>${esc(b)}</span></li>`).join('')
      const list = `<ul class="sb-checks">${items}</ul>`
      const inner = s.params.layout === 'beside'
        ? `<div class="sb-split sb-split--top">${head('certifications', HEAD)}${list}</div>`
        : `${head('certifications', HEAD)}${list}`
      return { cls: `sb-layout--${s.params.layout}`, inner }
    }
    const center = s.params.align === 'center'
    const items = v.badges.map(b => `<li class="sb-seal">${icon('badge', 28)}<span>${esc(b)}</span></li>`).join('')
    return {
      cls: `sb-shape--${s.params.shape}`,
      inner: `${head('certifications', { ...HEAD, cls: center ? 'sb-head--center' : undefined })}<ul class="sb-seals${center ? ' sb-seals--center' : ''}">${items}</ul>`,
    }
  },
  words: (_s, v) => ({ title: TITLE, texts: v.badges }),
})

export const CERTIFICATIONS_CSS = `
.sb-cert{display:flex;flex-direction:column;gap:14px}
.sb-checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 32px}
.sb-layout--beside .sb-checks{grid-template-columns:1fr}
.sb-checks li{display:flex;align-items:flex-start;gap:12px;font-weight:600;font-size:18px}
.sb-split--top{align-items:start}
.sb-seals{display:flex;flex-wrap:wrap;gap:20px}
.sb-seals--center{justify-content:center}
.sb-seal{width:170px;min-height:170px;padding:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;font-weight:700;font-size:15px;line-height:1.3;border:var(--sb-bd) solid currentColor;overflow-wrap:break-word}
.sb-seal .sb-icon{color:currentColor}
.sb-shape--circle .sb-seal{border-radius:50%}
.sb-shape--rounded .sb-seal{border-radius:calc(var(--sb-r) + 8px)}
@container (max-width: 719px){
  .sb-checks{grid-template-columns:1fr}
  .sb-seals{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .sb-seal{width:auto;min-height:140px}
}
`
