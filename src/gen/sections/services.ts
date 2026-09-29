import { z } from 'zod'
import { esc } from '../html'
import { pick } from '../rng'
import type { PageContent } from '../content'
import { defineSection, specSchema } from '../core/define'
import { head, icon, link } from '../core/markup'
import type { IconName } from '../core/markup'

export interface ServicesView {
  trade: string
  services: readonly string[]
  emergency: boolean
  phone: { label: string; href: string } | null
}

export const servicesView = (c: PageContent): ServicesView => ({
  trade: c.trade.name.toLowerCase(),
  services: c.trade.services,
  emergency: c.emergency,
  phone: c.business.tel ? { label: `Call ${c.business.phone}`, href: c.business.tel } : null,
})

const TITLE = 'Whatever the job, we’ve got it covered.'
const headOf = (v: ServicesView, center = false) => head('services', {
  eyebrow: 'Our services',
  title: TITLE,
  lead: `Professional ${v.trade} services. Quoted straight, done properly.`,
  cls: center ? 'sb-head--center' : undefined,
})
const ICONS: IconName[] = ['wrench', 'check', 'shield', 'sparkle', 'home', 'tag', 'bolt', 'star']
const EMERGENCY = 'Emergency call-outs'

export const servicesSchema = specSchema('services', {
  cards: { cols: z.union([z.literal(2), z.literal(3)]), style: z.enum(['filled', 'bordered', 'plain']), icons: z.boolean() },
  list: { cols: z.union([z.literal(1), z.literal(2)]) },
  feature: { lead: z.enum(['emergency', 'first']) },
  split: { numbered: z.boolean() },
  chips: { align: z.enum(['center', 'left']) },
})
export type ServicesSpec = z.infer<typeof servicesSchema>

const all = (v: ServicesView) => (v.emergency ? [EMERGENCY, ...v.services] : [...v.services])

export const services = defineSection<ServicesSpec, ServicesView>({
  type: 'services',
  label: 'Services',
  view: servicesView,
  schema: servicesSchema,
  anchor: 'services',
  archetypes: {
    cards: {
      label: 'Card grid', why: 'needs your services',
      gate: v => v.services.length >= 1,
      params: r => ({ cols: pick(r, [2, 3] as const), style: pick(r, ['filled', 'bordered', 'plain'] as const), icons: r() < 0.6 }),
      features: p => [p.cols === 3 ? 1 : 0, ['filled', 'bordered', 'plain'].indexOf(p.style) / 2, p.icons ? 1 : 0],
    },
    list: {
      label: 'List', why: 'needs your services',
      gate: v => v.services.length >= 1,
      params: r => ({ cols: pick(r, [1, 2] as const) }),
      features: p => [p.cols === 2 ? 1 : 0],
    },
    feature: {
      label: 'Feature and list', why: 'needs 3+ services',
      gate: v => v.services.length >= 3,
      params: (r, v) => ({ lead: v.emergency && r() < 0.7 ? 'emergency' : 'first' }),
      features: p => [p.lead === 'emergency' ? 1 : 0],
      sided: true,
    },
    split: {
      label: 'Heading and list', why: 'needs your services',
      gate: v => v.services.length >= 1,
      params: r => ({ numbered: r() < 0.5 }),
      features: p => [p.numbered ? 1 : 0],
    },
    chips: {
      label: 'Chips', why: 'needs your services',
      gate: v => v.services.length >= 1,
      params: r => ({ align: pick(r, ['center', 'left'] as const) }),
      features: p => [p.align === 'center' ? 1 : 0],
      loud: true,
    },
  },
  weights: {
    professional: { cards: 3, list: 2, feature: 1.5, split: 2, chips: 0.5 },
    luxury: { cards: 1, list: 3, feature: 2, split: 2.5, chips: 0.5 },
    family: { cards: 3, list: 1, feature: 1.5, split: 1, chips: 2 },
    brutalism: { cards: 2, list: 3, feature: 1, split: 2.5, chips: 1 },
  },
  fallback: { v: 1, section: 'services', archetype: 'list', params: { cols: 1 } },
  cards: s => s.archetype === 'feature' || s.archetype === 'chips' || (s.archetype === 'cards' && s.params.style !== 'plain'),
  body: (s, _style, v) => {
    const items = all(v)
    switch (s.archetype) {
      case 'cards': {
        const cls = s.params.style === 'filled' ? 'sb-card' : s.params.style === 'bordered' ? 'sb-card sb-card--line' : 'sb-rule'
        const li = items.map((t, i) => `<li class="${cls} sb-svc">${s.params.icons ? icon(t === EMERGENCY ? 'bolt' : ICONS[i % ICONS.length], 26) : ''}<h3 class="sb-h3">${esc(t)}</h3></li>`).join('')
        return { vars: `--sb-cols:${s.params.cols};--sb-cols-m:1;`, inner: `${headOf(v)}<ul class="sb-grid">${li}</ul>` }
      }
      case 'list': {
        const li = items.map(t => `<li class="sb-svc-row">${icon(t === EMERGENCY ? 'bolt' : 'check', 22)}<h3 class="sb-h3">${esc(t)}</h3></li>`).join('')
        return { cls: `sb-cols--${s.params.cols}`, inner: `${headOf(v)}<ul class="sb-svc-list">${li}</ul>` }
      }
      case 'feature': {
        const [lead, ...rest] = s.params.lead === 'emergency' && v.emergency ? [EMERGENCY, ...v.services] : [...v.services]
        const blurb = lead === EMERGENCY ? 'Something urgent? Call us and we’ll prioritise it.' : 'Our most requested job, quoted clearly before we start.'
        const call = v.phone ? link(v.phone.label, v.phone.href) : ''
        const panel = `<div class="sb-card sb-side-media sb-svc-feature">${icon(lead === EMERGENCY ? 'bolt' : 'wrench', 32)}<h3 class="sb-h3">${esc(lead)}</h3><p class="sb-mu">${blurb}</p>${call}</div>`
        const li = rest.map(t => `<li class="sb-svc-row">${icon('check', 22)}<h3 class="sb-h3">${esc(t)}</h3></li>`).join('')
        return { inner: `${headOf(v)}<div class="sb-split"><ul class="sb-svc-list">${li}</ul>${panel}</div>` }
      }
      case 'split': {
        const li = items.map((t, i) => `<li class="sb-svc-row">${s.params.numbered ? `<span class="sb-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>` : icon('check', 22)}<h3 class="sb-h3">${esc(t)}</h3></li>`).join('')
        return { inner: `<div class="sb-split sb-split--top">${headOf(v)}<ul class="sb-svc-list">${li}</ul></div>` }
      }
      case 'chips': {
        const center = s.params.align === 'center'
        const li = items.map(t => `<li class="sb-chip">${icon(t === EMERGENCY ? 'bolt' : 'check', 18)}<span>${esc(t)}</span></li>`).join('')
        return { inner: `${headOf(v, center)}<ul class="sb-row sb-svc-chips${center ? ' sb-svc-chips--center' : ''}">${li}</ul>` }
      }
    }
  },
  words: (_s, v) => ({ title: TITLE, texts: all(v) }),
})

export const SERVICES_CSS = `
.sb-svc{display:flex;flex-direction:column;gap:14px}
.sb-card--line{background:transparent;border-color:color-mix(in srgb,var(--sb-fg) 30%,transparent);--sb-fg:inherit;color:inherit}
.sb-svc-list{display:grid;grid-template-columns:1fr;gap:0 40px}
.sb-cols--2 .sb-svc-list{grid-template-columns:repeat(2,minmax(0,1fr))}
.sb-svc-row{display:flex;align-items:center;gap:14px;padding:16px 0;border-bottom:1px solid color-mix(in srgb,var(--sb-fg) 18%,transparent)}
.sb-num{font-family:var(--sb-fd);font-weight:var(--sb-dw);color:var(--sb-link);min-width:2ch}
.sb-svc-feature{display:flex;flex-direction:column;gap:12px;padding:calc(var(--sb-gap) * 2)}
.sb-svc-chips--center{justify-content:center}
.sb-split--top{align-items:start}
@container (max-width: 719px){
  .sb-cols--2 .sb-svc-list{grid-template-columns:1fr}
  .sb-svc-row{padding:12px 0}
}
`
