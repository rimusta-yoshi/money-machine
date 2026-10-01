import { z } from 'zod'
import { cx, esc } from '../html'
import { pick } from '../rng'
import { businessName } from '../content'
import type { PageContent } from '../content'
import { defineSection, specSchema } from '../core/define'
import { icon, link } from '../core/markup'
import type { Biome } from '../themes/types'

export interface FooterView {
  name: string
  tagline: string
  place: string
  phone: { number: string; href: string } | null
  email: string
  services: readonly string[]
  areas: readonly string[]
  year: number
}

export const footerView = (c: PageContent): FooterView => ({
  name: businessName(c),
  tagline: `${c.trade.name}${c.business.location ? ` · ${c.business.location}` : ''}`,
  place: c.business.location,
  phone: c.business.tel ? { number: c.business.phone, href: c.business.tel } : null,
  email: c.business.email,
  services: c.trade.services.slice(0, 6),
  areas: c.areas.slice(0, 6),
  year: c.year,
})

const tone = z.enum(['plain', 'inverse'])

export const footerSchema = specSchema('footer', {
  simple: { align: z.enum(['left', 'center']), tone },
  columns: { lists: z.enum(['services', 'both']), tone },
  split: { size: z.enum(['large', 'medium']), tone },
  colophon: { rule: z.boolean() },
})
export type FooterSpec = z.infer<typeof footerSchema>

/** Only Clean Pro and Friendly Local end on a dark band; the others keep their ground to the bottom. */
const canInvert = (t: Biome) => t.key === 'clean-pro' || t.key === 'friendly-local'
const rollTone = (r: () => number, t: Biome) => (canInvert(t) && r() < 0.5 ? 'inverse' as const : 'plain' as const)

const lines = (v: FooterView) => [
  v.phone ? `<li>${icon('phone', 16)}${link(v.phone.number, v.phone.href)}</li>` : '',
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
  checkBands: ['ground', 'ink'],
  trim: (v, omit) => (omit.has('areas') ? { ...v, areas: [] } : v),
  fixedBand: s => ('tone' in s.params && s.params.tone === 'inverse' ? 'ink' : 'ground'),
  archetypes: {
    simple: {
      label: 'Simple', why: '',
      gate: () => true,
      params: (r, { biome: t }) => ({ align: pick(r, ['left', 'center'] as const), tone: rollTone(r, t) }),
      features: p => [p.align === 'center' ? 1 : 0, p.tone === 'inverse' ? 1 : 0],
      allows: (p, t) => p.tone === 'plain' || canInvert(t),
    },
    columns: {
      label: 'Columns', why: '',
      gate: () => true,
      params: (r, { content: v, biome: t }) => ({ lists: v.areas.length ? pick(r, ['services', 'both'] as const) : 'services', tone: rollTone(r, t) }),
      shows: p => (p.lists === 'both' ? [{ facet: 'areas' }] : []),
      features: p => [p.lists === 'both' ? 1 : 0, p.tone === 'inverse' ? 1 : 0],
      allows: (p, t) => p.tone === 'plain' || canInvert(t),
    },
    split: {
      label: 'Big name', why: '',
      gate: () => true,
      params: (r, { biome: t }) => ({ size: pick(r, ['large', 'medium'] as const), tone: rollTone(r, t) }),
      features: p => [p.size === 'large' ? 1 : 0, p.tone === 'inverse' ? 1 : 0, 1],
      focal: (p, z) => ({ focal: p.size === 'large' ? z.h2 * 1.4 : z.h2, second: 17 }),
      allows: (p, t) => p.tone === 'plain' || canInvert(t),
    },
    colophon: {
      label: 'Colophon', why: '',
      gate: () => true,
      params: r => ({ rule: r() < 0.7 }),
      features: p => [p.rule ? 1 : 0, 0, 1],
    },
  },
  weights: {
    'workwear': { simple: 1.4, columns: 2, split: 3 },
    'clean-pro': { simple: 2, columns: 3, split: 1 },
    'craft-heritage': { simple: 1.6, columns: 1.4, split: 1, colophon: 3.5 },
    'friendly-local': { simple: 2.4, columns: 2.4, split: 1.4 },
  },
  fallback: { v: 2, section: 'footer', archetype: 'simple', step: 2, params: { align: 'left', tone: 'plain' } },
  body: (s, v) => {
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
      case 'colophon':
        return {
          cls: cx('sb-center', s.params.rule && 'sb-ft-ruled'),
          inner: `<div class="sb-ft-colophon"><p class="sb-ft-name">${esc(v.name)}</p><p class="sb-ft-small">${esc(v.tagline)}</p><ul class="sb-ft-lines">${lines(v)}</ul></div>${copy(v)}`,
        }
    }
  },
  words: (_s, v) => ({ title: '', texts: [v.name] }),
})

export const FOOTER_CSS = `
.sb-footer .sb-wrap{padding-block:calc(var(--sb-py) * 0.6);gap:calc(var(--sb-gap) * 2)}
.sb-footer.sb-tone--ground .sb-wrap{border-top:1px solid var(--sb-hair)}
.sb-ft-name{font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:24px;letter-spacing:var(--sb-dtr);text-transform:var(--sb-dup)}
.sb-ft-simple{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:var(--sb-gap)}
.sb-center .sb-ft-simple{flex-direction:column;text-align:center}
.sb-center .sb-copy{text-align:center}
.sb-ft-lines{display:flex;flex-wrap:wrap;gap:0 24px}
.sb-ft-lines li{display:flex;align-items:center;gap:8px}
.sb-ft-lines .sb-icon{color:currentColor}
.sb-ft-cols{display:grid;grid-template-columns:1.4fr repeat(3,minmax(0,1fr));gap:calc(var(--sb-gap) * 2)}
.sb-ft-cols .sb-ft-lines{flex-direction:column}
.sb-ft-col ul{display:flex;flex-direction:column;gap:6px}
.sb-ft-label{font-family:var(--sb-fl);font-weight:var(--sb-lw);font-size:14px;letter-spacing:max(var(--sb-ltr),0.06em);text-transform:uppercase;margin-bottom:10px}
.sb-ft-split{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:var(--sb-gap)}
.sb-ft-big{font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:var(--sb-h2);line-height:var(--sb-dlh);letter-spacing:var(--sb-dtr);text-transform:var(--sb-dup);overflow-wrap:anywhere}
.sb-size--large .sb-ft-big{font-size:calc(var(--sb-h2) * 1.4)}
.sb-ft-colophon{display:flex;flex-direction:column;align-items:center;gap:12px}
.sb-ft-colophon .sb-ft-name{font-size:34px}
.sb-ft-small{font-family:var(--sb-fl);font-weight:var(--sb-lw);font-size:13px;letter-spacing:var(--sb-ltr);text-transform:var(--sb-lup)}
.sb-ft-ruled .sb-ft-colophon{padding-top:18px;border-top:1px solid var(--sb-fg);box-shadow:0 -5px 0 -4px var(--sb-fg);width:100%}
.sb-copy{font-size:14px;color:var(--sb-mu);border-top:1px solid var(--sb-hair);padding-top:var(--sb-gap)}
@container (max-width: 719px){
  .sb-ft-cols{grid-template-columns:1fr}
  .sb-ft-lines{flex-direction:column}
  .sb-ft-big,.sb-size--large .sb-ft-big{font-size:var(--sb-h2m)}
}
`
