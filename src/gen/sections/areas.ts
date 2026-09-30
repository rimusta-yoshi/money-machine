import { z } from 'zod'
import { cx, esc } from '../html'
import { pick } from '../rng'
import type { PageContent } from '../content'
import { defineSection, specSchema } from '../core/define'
import type { BodyContext } from '../core/define'
import { head, icon, link } from '../core/markup'
import { rollAlign, rollAsym, rollBreak, rollMotif, textSpan } from '../core/punch'
import { THEMES } from '../themes'
import { ALIGNS, ASYMS, BREAKS, MOTIFS } from '../themes/types'

export interface AreasView {
  areas: readonly string[]
  base: string
  call: { number: string; href: string } | null
}
export const areasView = (c: PageContent): AreasView => ({
  areas: c.areas,
  base: c.business.location,
  call: c.business.tel ? { number: c.business.phone, href: c.business.tel } : null,
})

const LEAD = 'Just outside? Give us a ring, we often can.'
const HEAD = (v: AreasView, ctx: BodyContext, align: 'left' | 'center' | 'row' = 'left', lead = true) =>
  head('areas', { eyebrow: ctx.biome.voice.eyebrows.areas, title: ctx.biome.voice.titles.areas(v.base), lead: lead ? LEAD : undefined, align })

/** "A, B and C" */
const sentence = (xs: readonly string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

export const areasSchema = specSchema('areas', {
  chips: { align: z.enum(ALIGNS), motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
  columns: { cols: z.union([z.literal(2), z.literal(3), z.literal(4)]), motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
  split: { asym: z.enum(ASYMS), motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
  sentence: { align: z.enum(ALIGNS), brk: z.enum(BREAKS) },
  ticker: { divider: z.enum(['slash', 'dot']), brk: z.enum(BREAKS) },
  gazetteer: { cols: z.union([z.literal(2), z.literal(3)]), motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
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
      params: (r, { biome: t }) => ({ align: rollAlign(r, t, ['left', 'center']), motif: rollMotif(r, t, 'areas', ['pastel'], 0.3), brk: rollBreak(r, t, ['band', 'panel', 'rule']) }),
      shows: () => [{ facet: 'areas', core: true }],
      features: p => [p.align === 'center' ? 1 : 0, p.motif === 'pastel' ? 1 : 0, BREAKS.indexOf(p.brk) / 2],
      focal: (_p, z) => ({ focal: z.h2, second: 17 }),
    },
    columns: {
      label: 'Columns', why: 'needs 4+ areas',
      gate: v => v.areas.length >= 4,
      params: (r, { content: v, biome: t }) => ({ cols: v.areas.length >= 9 ? pick(r, [3, 4] as const) : pick(r, [2, 3] as const), motif: rollMotif(r, t, 'areas', ['numbers', 'ticks', 'circles'], 0.35), brk: rollBreak(r, t, ['band', 'rule']) }),
      shows: () => [{ facet: 'areas', core: true }],
      features: p => [(p.cols - 2) / 2, MOTIFS.indexOf(p.motif) / MOTIFS.length],
      focal: (_p, z) => ({ focal: z.h2, second: 17 }),
    },
    split: {
      label: 'Heading and list', why: 'needs the areas you cover',
      gate: v => v.areas.length >= 1,
      params: (r, { biome: t }) => ({ asym: rollAsym(r, t, ['5/7', '6/6', '4/8']), motif: rollMotif(r, t, 'areas', ['numbers', 'ticks', 'circles'], 0.4), brk: rollBreak(r, t, ['band', 'panel', 'rule']) }),
      shows: () => [{ facet: 'areas', core: true }],
      features: p => [textSpan(p.asym) / 8, MOTIFS.indexOf(p.motif) / MOTIFS.length, BREAKS.indexOf(p.brk) / 2],
      focal: (_p, z) => ({ focal: z.h2, second: 17 }),
    },
    sentence: {
      label: 'Sentence', why: 'needs 2–6 areas',
      gate: v => v.areas.length >= 2 && v.areas.length <= 6,
      params: (r, { biome: t }) => ({ align: rollAlign(r, t, ['left', 'center']), brk: rollBreak(r, t, ['band', 'panel', 'rule']) }),
      shows: () => [{ facet: 'areas', core: true }],
      features: p => [p.align === 'center' ? 1 : 0, BREAKS.indexOf(p.brk) / 2, 1],
      focal: (_p, z) => ({ focal: z.h2, second: z.h2 * 0.62 }),
      loud: true,
    },
    ticker: {
      label: 'Place names, big', why: 'needs 2–10 areas',
      gate: v => v.areas.length >= 2 && v.areas.length <= 10,
      params: (r, { biome: t }) => ({ divider: pick(r, ['slash', 'dot'] as const), brk: rollBreak(r, t, ['band', 'rule']) }),
      shows: () => [{ facet: 'areas', core: true }],
      features: p => [p.divider === 'slash' ? 1 : 0, 1, 1],
      focal: (_p, z) => ({ focal: z.h2 * 0.9, second: z.h2 * 0.5 }),
      loud: true,
    },
    gazetteer: {
      label: 'Gazetteer', why: 'needs 3+ areas',
      gate: v => v.areas.length >= 3,
      params: (r, { content: v, biome: t }) => ({ cols: v.areas.length >= 6 ? 3 : 2, motif: rollMotif(r, t, 'areas', ['leaders'], 0.6), brk: rollBreak(r, t, ['band', 'rule']) }),
      shows: () => [{ facet: 'areas', core: true }],
      features: p => [p.cols - 2, p.motif === 'leaders' ? 1 : 0, 1],
      focal: (_p, z) => ({ focal: z.h2, second: z.h3 }),
    },
  },
  weights: {
    'workwear': { chips: 1.4, columns: 2, split: 2, sentence: 1.6, ticker: 3 },
    'clean-pro': { chips: 3, columns: 2, split: 2, sentence: 1.2 },
    'craft-heritage': { chips: 1, columns: 1.6, split: 2, sentence: 2.4, gazetteer: 3 },
    'friendly-local': { chips: 3.4, columns: 1.2, split: 1.2, sentence: 2 },
  },
  fallback: { v: 2, section: 'areas', archetype: 'split', step: 2, params: { asym: '6/6', motif: 'none', brk: 'band' } },
  body: (s, v, ctx) => {
    const call = v.call ? link(ctx.biome.voice.cta.call(v.call.number), v.call.href) : ''
    const on = ctx.motif
    switch (s.archetype) {
      case 'chips': {
        const p = s.params
        const center = p.align === 'center'
        const cls = cx('sb-row sb-area-chips', center && 'sb-area-chips--center', on && p.motif === 'pastel' && 'sb-pastel sb-area-chips--pastel')
        return { inner: `${HEAD(v, ctx, center ? 'center' : 'left')}<ul class="${cls}">${v.areas.map(a => `<li class="sb-chip">${icon('pin', 16)}<span>${esc(a)}</span></li>`).join('')}</ul>` }
      }
      case 'columns': {
        const p = s.params
        const m = on ? p.motif : 'none'
        const cls = cx('sb-grid sb-area-cols', (m === 'numbers' || m === 'circles') && 'sb-list--num', m === 'ticks' && 'sb-list--tick')
        const tag = m === 'numbers' || m === 'circles' ? 'ol' : 'ul'
        return { vars: `--sb-cols:${p.cols};--sb-cols-m:2;`, inner: `${HEAD(v, ctx, 'row')}<${tag} class="${cls}">${v.areas.map(a => `<li>${m === 'none' ? icon('pin', 16) : ''}<span>${esc(a)}</span></li>`).join('')}</${tag}>` }
      }
      case 'split': {
        const p = s.params
        const m = on ? p.motif : 'none'
        const cls = cx('sb-list sb-area-list', (m === 'numbers' || m === 'circles') && 'sb-list--num', m === 'ticks' && 'sb-list--tick')
        const tag = m === 'numbers' || m === 'circles' ? 'ol' : 'ul'
        return {
          vars: `--sb-ta:${textSpan(p.asym)};`,
          inner: `<div class="sb-cols sb-cols--top"><div class="sb-main sb-stack">${HEAD(v, ctx)}${call}</div><${tag} class="sb-aside ${cls}">${v.areas.map(a => `<li>${m === 'none' ? icon('pin', 18) : ''}<span>${esc(a)}</span></li>`).join('')}</${tag}></div>`,
        }
      }
      case 'sentence': {
        const center = s.params.align === 'center'
        return { cls: center ? 'sb-center' : '', inner: `${HEAD(v, ctx, center ? 'center' : 'left', false)}<p class="sb-area-sentence">We cover ${esc(sentence(v.areas))}.</p>${call}` }
      }
      case 'ticker': {
        const p = s.params
        return { cls: `sb-div--${p.divider}`, inner: `${HEAD(v, ctx, 'row')}<ul class="sb-area-ticker">${v.areas.map(a => `<li>${esc(a)}</li>`).join('')}</ul>${call}` }
      }
      case 'gazetteer': {
        const p = s.params
        const leaders = on && p.motif === 'leaders'
        return {
          vars: `--sb-cols:${p.cols};`,
          inner: `${HEAD(v, ctx, 'center')}<ul class="${cx('sb-area-gaz', leaders && 'sb-area-gaz--leaders')}">${v.areas.map((a, i) => `<li><span>${esc(a)}</span>${leaders ? `<span class="sb-dots" aria-hidden="true"></span><span class="sb-end" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>` : ''}</li>`).join('')}</ul>`,
        }
      }
    }
  },
  words: (s, v, style) => ({ title: THEMES[style.theme].voice.titles.areas(v.base), texts: v.areas, col: s.archetype === 'split' ? 460 : 760 }),
})

export const AREAS_CSS = `
.sb-area-chips--center{justify-content:center}
.sb-area-chips--pastel>li.sb-chip{box-shadow:none}
.sb-area-cols{gap:14px 28px}
.sb-area-cols>li,.sb-area-list>li{display:flex;align-items:center;gap:10px;font-weight:600;overflow-wrap:anywhere}
.sb-area-cols.sb-list--num>li::before,.sb-area-cols.sb-list--tick>li::before{flex:none}
.sb-area-cols.sb-list--num>li::before{content:counter(sb-n,decimal-leading-zero)}
.sb-area-list>li{font-size:19px}
.sb-area-sentence{font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:calc(var(--sb-h2) * 0.62);line-height:1.25;letter-spacing:var(--sb-dtr);max-width:30ch}
.sb-center .sb-area-sentence{align-self:center;text-align:center}
.sb-center .sb-link{align-self:center}
.sb-area-ticker{display:flex;flex-wrap:wrap;gap:4px 0;font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:calc(var(--sb-h2) * 0.9);line-height:1.05;letter-spacing:var(--sb-dtr);text-transform:var(--sb-dup)}
.sb-area-ticker>li{overflow-wrap:anywhere}
.sb-div--slash .sb-area-ticker>li:not(:last-child)::after{content:"/";margin:0 0.3em;color:var(--sb-accent)}
.sb-div--dot .sb-area-ticker>li:not(:last-child)::after{content:"·";margin:0 0.3em;color:var(--sb-accent)}
.sb-area-gaz{columns:var(--sb-cols,2);column-gap:calc(var(--sb-gap) * 3.5);border-top:1px solid var(--sb-fg);border-bottom:1px solid var(--sb-fg);padding:18px 0}
.sb-area-gaz>li{display:flex;align-items:baseline;gap:12px;break-inside:avoid;padding:10px 0;font-family:var(--sb-fd);font-style:italic;font-size:22px;border-bottom:1px solid var(--sb-hair)}
.sb-area-gaz .sb-end{font-family:var(--sb-fl);font-style:normal;font-size:13px}
@container (max-width: 719px){
  .sb-area-sentence{font-size:calc(var(--sb-h2m) * 0.8)}
  .sb-area-ticker{font-size:calc(var(--sb-h2m) * 0.8)}
  .sb-area-gaz{columns:1}
}
`
