import { z } from 'zod'
import { cx, esc } from '../html'
import { pick } from '../rng'
import type { PageContent } from '../content'
import { defineSection, specSchema } from '../core/define'
import type { BodyContext } from '../core/define'
import { button, head, icon, link } from '../core/markup'
import type { HeadAlign, IconName } from '../core/markup'
import { rollAlign, rollAsym, rollBreak, rollMotif, textSpan } from '../core/punch'
import { THEMES } from '../themes'
import { ALIGNS, ASYMS, BREAKS, MOTIFS } from '../themes/types'
import type { Align } from '../themes/types'

export interface ServicesView {
  trade: string
  services: readonly string[]
  emergency: boolean
  phone: { number: string; href: string } | null
}

export const servicesView = (c: PageContent): ServicesView => ({
  trade: c.trade.name.toLowerCase(),
  services: c.trade.services,
  emergency: c.emergency,
  phone: c.business.tel ? { number: c.business.phone, href: c.business.tel } : null,
})

const EMERGENCY = 'Emergency call-outs'
const all = (v: ServicesView) => (v.emergency ? [EMERGENCY, ...v.services] : [...v.services])

/** A decorative icon that suits the service's name. The name beside it carries the meaning. */
export function serviceIcon(name: string): IconName {
  const n = name.toLowerCase()
  if (n === EMERGENCY.toLowerCase()) return 'clock'
  if (/leak|drain|pipe|water|tap/.test(n)) return 'drop'
  if (/electric|wiring|rewir|ev |charger|light|panel|socket|fuse/.test(n)) return 'bolt'
  if (/roof|gutter|fascia|flat|storm|chimney|slate/.test(n)) return 'roof'
  if (/paint|cabinet|stain|colour|color|wall|decor|refinish/.test(n)) return 'brush'
  if (/lawn|garden|tree|sod|landscap|snow|hedge|turf|bed/.test(n)) return 'leaf'
  if (/bath|kitchen|home|interior|exterior/.test(n)) return 'home'
  if (/inspect|safety|test|survey|consult/.test(n)) return 'shield'
  return 'wrench'
}

export const servicesSchema = specSchema('services', {
  cards: { cols: z.union([z.literal(2), z.literal(3), z.literal(4)]), align: z.enum(ALIGNS), motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
  list: { cols: z.union([z.literal(1), z.literal(2)]), align: z.enum(ALIGNS), motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
  split: { asym: z.enum(ASYMS), motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
  feature: { lead: z.enum(['emergency', 'first']), motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
  chips: { align: z.enum(ALIGNS) },
  pricelist: { asym: z.enum(ASYMS), ends: z.enum(['number', 'none']), motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
  poster: { motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
  bento: { lead: z.enum(['emergency', 'first']), brk: z.enum(BREAKS) },
})
export type ServicesSpec = z.infer<typeof servicesSchema>

const headAlign = (a: Align): HeadAlign => (a === 'split' ? 'row' : a)
const alignF = (a: Align) => ALIGNS.indexOf(a) / 2

function headOf(v: ServicesView, ctx: BodyContext, align: HeadAlign = 'left') {
  const t = ctx.biome
  return head('services', {
    eyebrow: t.voice.eyebrows.services,
    title: t.voice.titles.services,
    lead: `${v.trade[0].toUpperCase()}${v.trade.slice(1)} work, quoted clearly and done properly.`,
    align,
  })
}

/** The marker in front of a service: a numeral (drawn by CSS), an icon tile, or a plain icon. */
function mark(name: string, motif: string, on: boolean): string {
  if (on && motif === 'icontile') return `<span class="sb-icon-tile">${icon(serviceIcon(name), 24)}</span>`
  if (on && (motif === 'numbers' || motif === 'circles' || motif === 'ticks' || motif === 'toprule')) return ''
  return icon(serviceIcon(name), 30)
}

const listClass = (motif: string, on: boolean) =>
  cx('sb-list', on && (motif === 'numbers' || motif === 'circles') && 'sb-list--num', on && motif === 'ticks' && 'sb-list--tick')

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
      params: (r, { content: v, biome: t }) => ({
        cols: all(v).length % 4 === 0 ? pick(r, [4, 2] as const) : all(v).length % 3 === 0 ? pick(r, [3, 3, 2] as const) : pick(r, [2, 3, 4] as const),
        align: rollAlign(r, t, ['left', 'split', 'center']),
        motif: rollMotif(r, t, 'services', ['numbers', 'toprule', 'icontile', 'pastel'], 0.15),
        brk: rollBreak(r, t, ['band', 'rule']),
      }),
      features: p => [(p.cols - 2) / 2, alignF(p.align), MOTIFS.indexOf(p.motif) / MOTIFS.length, p.brk === 'band' ? 0 : 1],
      focal: (_p, z) => ({ focal: z.h2, second: z.h3 }),
    },
    list: {
      label: 'List', why: 'needs your services',
      gate: v => v.services.length >= 1,
      params: (r, { biome: t }) => ({
        cols: pick(r, [1, 2] as const), align: rollAlign(r, t, ['left', 'split']),
        motif: rollMotif(r, t, 'services', ['numbers', 'ticks', 'circles'], 0.25), brk: rollBreak(r, t, ['band', 'rule', 'panel']),
      }),
      features: p => [p.cols - 1, alignF(p.align), MOTIFS.indexOf(p.motif) / MOTIFS.length, BREAKS.indexOf(p.brk) / 2],
      focal: (_p, z) => ({ focal: z.h2, second: z.h3 }),
    },
    split: {
      label: 'Heading and list', why: 'needs your services',
      gate: v => v.services.length >= 1,
      params: (r, { biome: t }) => ({
        asym: rollAsym(r, t, ['4/8', '5/7', '6/6']), motif: rollMotif(r, t, 'services', ['numbers', 'ticks', 'circles'], 0.25), brk: rollBreak(r, t, ['band', 'rule', 'panel']),
      }),
      features: p => [textSpan(p.asym) / 8, MOTIFS.indexOf(p.motif) / MOTIFS.length, BREAKS.indexOf(p.brk) / 2],
      focal: (_p, z) => ({ focal: z.h2, second: z.h3 }),
    },
    feature: {
      label: 'Feature and list', why: 'needs 3+ services',
      gate: v => v.services.length >= 3,
      params: (r, { content: v, biome: t }) => ({
        lead: v.emergency && r() < 0.7 ? 'emergency' : 'first', motif: rollMotif(r, t, 'services', ['icontile', 'toprule', 'numbers', 'circles'], 0.3), brk: rollBreak(r, t, ['band', 'rule']),
      }),
      features: p => [p.lead === 'emergency' ? 1 : 0, MOTIFS.indexOf(p.motif) / MOTIFS.length],
      focal: (_p, z) => ({ focal: z.h2, second: z.h3 * 1.3 }),
      sided: true,
    },
    chips: {
      label: 'Chips', why: 'needs your services',
      gate: v => v.services.length >= 1,
      params: (r, { biome: t }) => ({ align: rollAlign(r, t, ['center', 'left']) }),
      features: p => [alignF(p.align)],
      focal: (_p, z) => ({ focal: z.h2, second: 17 }),
      loud: true,
    },
    pricelist: {
      label: 'Price list', why: 'needs your services',
      gate: v => v.services.length >= 2,
      params: (r, { biome: t }) => ({
        asym: rollAsym(r, t, ['4/8', '5/7']), ends: pick(r, ['number', 'number', 'none'] as const), motif: 'leaders' as const, brk: rollBreak(r, t, ['band', 'rule']),
      }),
      features: p => [textSpan(p.asym) / 8, p.ends === 'number' ? 1 : 0, 1],
      focal: (_p, z) => ({ focal: z.h2, second: z.h3 }),
    },
    poster: {
      label: 'Poster rows', why: 'needs your services',
      gate: v => v.services.length >= 2 && v.services.length <= 8,
      params: (r, { biome: t }) => ({ motif: rollMotif(r, t, 'services', ['numbers'], 0.25), brk: rollBreak(r, t, ['band', 'rule']) }),
      features: p => [p.motif === 'numbers' ? 1 : 0, 1, 1],
      focal: (_p, z) => ({ focal: z.xl, second: z.h2 * 0.75 }),
    },
    bento: {
      label: 'Featured card and grid', why: 'needs 3+ services',
      gate: v => v.services.length >= 3,
      params: (r, { content: v, biome: t }) => ({ lead: v.emergency && r() < 0.6 ? 'emergency' : 'first', brk: rollBreak(r, t, ['band', 'panel']) }),
      features: p => [p.lead === 'emergency' ? 1 : 0, 1, 0.5],
      focal: (_p, z) => ({ focal: z.h2, second: z.h3 * 1.4 }),
    },
  },
  weights: {
    'workwear': { cards: 3, list: 1.6, split: 2, feature: 1.2, chips: 0.6, poster: 3 },
    'clean-pro': { cards: 3, list: 1.2, split: 2, feature: 1.6, chips: 1, bento: 2.6 },
    'craft-heritage': { cards: 1, list: 1.4, split: 2, feature: 1, pricelist: 4 },
    'friendly-local': { cards: 3.5, list: 1.2, split: 1.2, feature: 1.2, chips: 2 },
  },
  fallback: { v: 2, section: 'services', archetype: 'list', step: 2, params: { cols: 1, align: 'left', motif: 'none', brk: 'band' } },
  body: (s, v, ctx) => {
    const items = all(v)
    const on = ctx.motif
    switch (s.archetype) {
      case 'cards': {
        const p = s.params
        const numbered = on && p.motif === 'numbers'
        const cls = cx('sb-grid sb-svc-cards', numbered && 'sb-list--num', on && p.motif === 'pastel' && 'sb-pastel', on && p.motif === 'toprule' && 'sb-svc-cards--rule')
        const li = items.map(t => `<li class="sb-card sb-svc">${mark(t, p.motif, on)}<h3 class="sb-h3">${esc(t)}</h3></li>`).join('')
        const tag = numbered ? 'ol' : 'ul'
        return { vars: `--sb-cols:${p.cols};--sb-cols-m:${p.cols === 4 ? 2 : 1};`, inner: `${headOf(v, ctx, headAlign(p.align))}<${tag} class="${cls}">${li}</${tag}>` }
      }
      case 'list': {
        const p = s.params
        const cls = cx(listClass(p.motif, on), 'sb-svc-list', p.cols === 2 && 'sb-svc-list--2')
        const li = items.map(t => `<li>${on && p.motif !== 'none' ? '' : icon(serviceIcon(t), 26)}<h3 class="sb-h3">${esc(t)}</h3></li>`).join('')
        const tag = cls.includes('--num') ? 'ol' : 'ul'
        return { inner: `${headOf(v, ctx, headAlign(p.align))}<${tag} class="${cls}">${li}</${tag}>` }
      }
      case 'split': {
        const p = s.params
        const cls = cx(listClass(p.motif, on), 'sb-svc-list')
        const li = items.map(t => `<li>${on && p.motif !== 'none' ? '' : icon(serviceIcon(t), 26)}<h3 class="sb-h3">${esc(t)}</h3></li>`).join('')
        const tag = cls.includes('--num') ? 'ol' : 'ul'
        return { vars: `--sb-ta:${textSpan(p.asym)};`, inner: `<div class="sb-cols sb-cols--top"><div class="sb-main sb-sticky">${headOf(v, ctx)}</div><${tag} class="sb-aside ${cls}">${li}</${tag}></div>` }
      }
      case 'feature': {
        const p = s.params
        const [lead, ...rest] = p.lead === 'emergency' && v.emergency ? [EMERGENCY, ...v.services] : [...v.services]
        const blurb = lead === EMERGENCY ? 'Something urgent? Call and we’ll prioritise it.' : 'Our most requested job, quoted clearly before we start.'
        const call = v.phone ? link(ctx.biome.voice.cta.call(v.phone.number), v.phone.href) : ''
        const panel = `<div class="sb-card sb-svc-feature sb-aside">${mark(lead, p.motif === 'icontile' ? 'icontile' : 'none', on)}<h3 class="sb-h3 sb-svc-feature-h">${esc(lead)}</h3><p class="sb-mu">${blurb}</p>${call}</div>`
        const cls = cx(listClass(p.motif === 'numbers' || p.motif === 'circles' ? p.motif : 'none', on), 'sb-svc-list sb-main')
        const li = rest.map(t => `<li>${on && (p.motif === 'numbers' || p.motif === 'circles') ? '' : icon(serviceIcon(t), 24)}<h3 class="sb-h3">${esc(t)}</h3></li>`).join('')
        return { vars: '--sb-ta:7;', inner: `${headOf(v, ctx)}<div class="sb-cols sb-cols--top sb-cols--media-last"><ul class="${cls}">${li}</ul>${panel}</div>` }
      }
      case 'chips': {
        const center = s.params.align === 'center'
        const li = items.map(t => `<li class="sb-chip">${icon(serviceIcon(t), 18)}<span>${esc(t)}</span></li>`).join('')
        return { inner: `${headOf(v, ctx, center ? 'center' : 'left')}<ul class="sb-row sb-svc-chips${center ? ' sb-svc-chips--center' : ''}">${li}</ul>` }
      }
      case 'pricelist': {
        const p = s.params
        const li = items.map((t, i) => `<li><h3 class="sb-h3">${esc(t)}</h3>${on ? '<span class="sb-dots" aria-hidden="true"></span>' : ''}${p.ends === 'number' ? `<span class="sb-end" aria-hidden="true">No. ${String(i + 1).padStart(2, '0')}</span>` : ''}</li>`).join('')
        return { vars: `--sb-ta:${textSpan(p.asym)};`, inner: `<div class="sb-cols sb-cols--top"><div class="sb-main">${headOf(v, ctx)}</div><ul class="sb-aside sb-list sb-leaders sb-svc-prices">${li}</ul></div>` }
      }
      case 'poster': {
        const p = s.params
        const numbered = on && p.motif === 'numbers'
        const tag = numbered ? 'ol' : 'ul'
        const li = items.map(t => `<li><h3 class="sb-svc-poster-h">${esc(t)}</h3></li>`).join('')
        return { inner: `${headOf(v, ctx, 'row')}<${tag} class="${cx('sb-list sb-svc-poster', numbered && 'sb-list--num')}">${li}</${tag}>` }
      }
      case 'bento': {
        const p = s.params
        const [lead, ...rest] = p.lead === 'emergency' && v.emergency ? [EMERGENCY, ...v.services] : [...v.services]
        const blurb = lead === EMERGENCY ? 'Something urgent? Call and we’ll prioritise it.' : 'Our most requested job, quoted clearly before we start.'
        const call = v.phone ? button(ctx.style, ctx.biome.voice.cta.call(v.phone.number), v.phone.href) : ''
        const big = `<li class="sb-svc-bento-lead"><span class="sb-icon-tile">${icon(serviceIcon(lead), 26)}</span><h3 class="sb-h2 sb-svc-bento-h">${esc(lead)}</h3><p>${blurb}</p>${call}</li>`
        const small = rest.map(t => `<li class="sb-card sb-svc"><span class="sb-icon-tile">${icon(serviceIcon(t), 22)}</span><h3 class="sb-h3">${esc(t)}</h3></li>`).join('')
        return { inner: `${headOf(v, ctx)}<ul class="sb-svc-bento">${big}${small}</ul>` }
      }
    }
  },
  words: (s, v, style) => ({
    title: THEMES[style.theme].voice.titles.services,
    texts: all(v),
    col: s.archetype === 'split' || s.archetype === 'pricelist' ? 400 : 760,
  }),
})

export const SERVICES_CSS = `
.sb-svc{min-height:100%}
.sb-svc-cards>li.sb-card{justify-content:flex-start}
.sb-svc-list{width:100%}
.sb-svc-list>li{align-items:center}
.sb-svc-list--2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:calc(var(--sb-gap) * 3)}
.sb-svc-list--2>li:nth-last-child(2){border-bottom:1px solid var(--sb-hair)}
.sb-svc-list .sb-h3{font-size:calc(var(--sb-h3) * 1.08)}
.sb-sticky{position:sticky;top:24px}
.sb-svc-feature{padding:calc(var(--sb-gap) * 2)}
.sb-svc-feature-h{font-size:calc(var(--sb-h3) * 1.35)}
.sb-svc-chips--center{justify-content:center}
.sb-svc-prices>li{gap:16px;padding:22px 0}
.sb-svc-prices .sb-h3{flex:0 1 auto}
.sb-svc-poster>li{align-items:baseline;padding:14px 0}
.sb-svc-poster-h{margin:0;font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:calc(var(--sb-h2) * 0.78);line-height:1;letter-spacing:var(--sb-dtr);text-transform:var(--sb-dup);overflow-wrap:break-word;min-width:0}
.sb-svc-poster.sb-list--num>li::before{font-size:calc(var(--sb-h2) * 0.78);line-height:1}
.sb-svc-bento{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:calc(var(--sb-gap) * 1.25)}
.sb-svc-bento-lead{grid-row:span 2;display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-end;gap:16px;padding:32px;border-radius:calc(var(--sb-r) + 4px);background:var(--sb-brand-fill);box-shadow:inset 0 0 0 2px var(--sb-brand-edge);color:var(--sb-brand-ink);--sb-fg:var(--sb-brand-ink);--sb-btn-bg:var(--sb-brand-ink);--sb-btn-fg:var(--sb-brand-fill);--sb-btn-edge:var(--sb-brand-ink)}
.sb-svc-bento-lead .sb-icon-tile{background:color-mix(in srgb,var(--sb-brand-ink) 16%,transparent)}
.sb-svc-bento-lead .sb-icon-tile .sb-icon{color:var(--sb-brand-ink)}
.sb-svc-bento-h{font-size:calc(var(--sb-h2) * 0.8)}
.sb-svc-cards--rule>li.sb-card{border-top-width:6px}
.sb-sec.sb-th--workwear .sb-svc-cards .sb-h3{font-size:28px}
.sb-sec.sb-th--workwear.sb-plain .sb-svc-cards>li.sb-card,.sb-sec.sb-th--workwear .sb-svc-cards:not(.sb-svc-cards--rule):not(.sb-list--num)>li.sb-card{border-top-width:2px}
.sb-sec.sb-th--craft-heritage .sb-svc-prices .sb-h3{font-size:28px}
@container (max-width: 719px){
  .sb-svc-list--2{grid-template-columns:1fr}
  .sb-sticky{position:static}
  .sb-svc-prices>li{flex-wrap:wrap;padding:16px 0}
  .sb-svc-prices .sb-dots{display:none}
  .sb-svc-prices .sb-end{width:100%}
  .sb-svc-poster-h,.sb-svc-poster.sb-list--num>li::before{font-size:calc(var(--sb-h2m) * 0.8)}
  .sb-svc-bento{grid-template-columns:1fr}
  .sb-svc-bento-lead{grid-row:auto;padding:26px}
  .sb-svc-bento-h{font-size:var(--sb-h2m)}
}
`
