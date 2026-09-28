import { z } from 'zod'
import { esc } from '../html'
import { pick } from '../rng'
import { businessName } from '../content'
import type { PageContent } from '../content'
import { defineSection, specSchema } from '../core/define'
import { icon, link } from '../core/markup'

export interface FooterView {
  name: string
  tagline: string
  phone: { label: string; href: string } | null
  email: string
  services: readonly string[]
  areas: readonly string[]
  year: number
}

export const footerView = (c: PageContent): FooterView => ({
  name: businessName(c),
  tagline: `${c.trade.name}${c.business.location ? ` · ${c.business.location}` : ''}`,
  phone: c.business.tel ? { label: c.business.phone, href: c.business.tel } : null,
  email: c.business.email,
  services: c.trade.services.slice(0, 6),
  areas: c.areas.slice(0, 6),
  year: c.year,
})

export const footerSchema = specSchema('footer', {
  simple: { align: z.enum(['left', 'center']) },
  columns: { lists: z.enum(['services', 'both']) },
  split: { size: z.enum(['large', 'medium']) },
})
export type FooterSpec = z.infer<typeof footerSchema>

const lines = (v: FooterView) => [
  v.phone ? `<li>${icon('phone', 16)}${link(v.phone.label, v.phone.href)}</li>` : '',
  v.email ? `<li>${icon('mail', 16)}${link(v.email, `mailto:${v.email}`)}</li>` : '',
].join('')
const copy = (v: FooterView) => `<p class="sb-copy">© ${v.year} ${esc(v.name)}</p>`
const brand = (v: FooterView) => `<div class="sb-ft-brand"><p class="sb-ft-name">${esc(v.name)}</p><p class="sb-mu">${esc(v.tagline)}</p></div>`
const navList = (label: string, items: readonly string[]) =>
  items.length ? `<div class="sb-ft-col"><p class="sb-ft-label">${label}</p><ul>${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>` : ''

export const footer = defineSection<FooterSpec, FooterView>({
  type: 'footer',
  label: 'Footer',
  view: footerView,
  schema: footerSchema,
  tag: 'footer',
  checkBands: ['ink'],
  fixedBand: () => 'ink',
  archetypes: {
    simple: {
      label: 'Simple', why: '',
      gate: () => true,
      params: r => ({ align: pick(r, ['left', 'center'] as const) }),
      features: p => [p.align === 'center' ? 1 : 0],
    },
    columns: {
      label: 'Columns', why: '',
      gate: () => true,
      params: (r, v) => ({ lists: v.areas.length ? pick(r, ['services', 'both'] as const) : 'services' }),
      features: p => [p.lists === 'both' ? 1 : 0],
    },
    split: {
      label: 'Big name', why: '',
      gate: () => true,
      params: r => ({ size: pick(r, ['large', 'medium'] as const) }),
      features: p => [p.size === 'large' ? 1 : 0],
    },
  },
  weights: {
    professional: { simple: 1.5, columns: 3, split: 1 },
    luxury: { simple: 3, columns: 1, split: 2 },
    family: { simple: 2, columns: 2.5, split: 1 },
    brutalism: { simple: 1, columns: 1.5, split: 3 },
  },
  fallback: { v: 1, section: 'footer', archetype: 'simple', params: { align: 'left' } },
  cards: () => false,
  body: (s, _style, v) => {
    switch (s.archetype) {
      case 'simple': {
        const center = s.params.align === 'center'
        return { cls: center ? 'sb-center' : '', inner: `<div class="sb-ft-simple">${brand(v)}<ul class="sb-ft-lines">${lines(v)}</ul></div>${copy(v)}` }
      }
      case 'columns':
        return {
          inner: `<div class="sb-ft-cols">${brand(v)}<div class="sb-ft-col"><p class="sb-ft-label">Contact</p><ul class="sb-ft-lines">${lines(v)}</ul></div>${navList('Services', v.services)}${s.params.lists === 'both' ? navList('Areas', v.areas) : ''}</div>${copy(v)}`,
        }
      case 'split':
        return { cls: `sb-size--${s.params.size}`, inner: `<div class="sb-ft-split"><p class="sb-ft-big">${esc(v.name)}</p><ul class="sb-ft-lines">${lines(v)}</ul></div>${copy(v)}` }
    }
  },
  words: (_s, v) => ({ title: '', texts: [v.name] }),
})

export const FOOTER_CSS = `
.sb-footer .sb-wrap{padding-block:calc(var(--sb-py) * 0.7);gap:calc(var(--sb-gap) * 2)}
.sb-ft-name{font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:22px;letter-spacing:var(--sb-tr);text-transform:var(--sb-up)}
.sb-ft-simple{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:var(--sb-gap)}
.sb-center .sb-ft-simple{flex-direction:column;text-align:center}
.sb-center .sb-copy{text-align:center}
.sb-ft-lines{display:flex;flex-wrap:wrap;gap:0 24px}
.sb-ft-lines li{display:flex;align-items:center;gap:8px}
.sb-ft-lines .sb-icon{color:currentColor}
.sb-ft-cols{display:grid;grid-template-columns:1.4fr repeat(3,minmax(0,1fr));gap:calc(var(--sb-gap) * 2)}
.sb-ft-cols .sb-ft-lines{flex-direction:column}
.sb-ft-col ul{display:flex;flex-direction:column;gap:6px}
.sb-ft-label{font-weight:700;font-size:14px;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:10px}
.sb-ft-split{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:var(--sb-gap)}
.sb-ft-big{font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:var(--sb-h2);line-height:1;letter-spacing:var(--sb-tr);text-transform:var(--sb-up);overflow-wrap:anywhere}
.sb-size--large .sb-ft-big{font-size:calc(var(--sb-h2) * 1.4)}
.sb-copy{font-size:14px;opacity:0.9;border-top:1px solid color-mix(in srgb,var(--sb-fg) 25%,transparent);padding-top:var(--sb-gap)}
@container (max-width: 719px){
  .sb-ft-cols{grid-template-columns:1fr}
  .sb-ft-lines{flex-direction:column}
  .sb-ft-big,.sb-size--large .sb-ft-big{font-size:var(--sb-h2-m)}
}
`
