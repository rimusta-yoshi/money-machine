import { z } from 'zod'
import { cx, esc } from '../html'
import { pick } from '../rng'
import type { PageContent, PagePhoto } from '../content'
import { defineSection, specSchema } from '../core/define'
import type { BodyContext } from '../core/define'
import { head, icon, media } from '../core/markup'
import type { IconName } from '../core/markup'
import { rollAlign, rollAsym, rollBreak, rollCrop, rollMotif, textSpan } from '../core/punch'
import { THEMES } from '../themes'
import { ALIGNS, ASYMS, BREAKS, CROPS, MOTIFS } from '../themes/types'
import type { Motif } from '../themes/types'

/**
 * How the business works, in the customer's own chosen lines. The theme's voice only
 * suggests them in the builder; nothing is published until the customer ticks or writes it.
 */
export interface WhyView {
  points: readonly (readonly [string, string])[]
  /** A real photo to sit beside the points, if the customer has one. */
  photo: PagePhoto | null
}
export const whyView = (c: PageContent): WhyView => ({ points: c.whyUs, photo: c.photos.about ?? c.photos.gallery[0] ?? null })

const some = (n: number) => (v: WhyView) => v.points.length >= n

const ICONS: IconName[] = ['bolt', 'tag', 'badge', 'sparkle', 'chat']

export const whyUsSchema = specSchema('why_us', {
  grid: { cols: z.union([z.literal(2), z.literal(3)]), motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
  rows: { motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
  split: { asym: z.enum(ASYMS), motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
  numbered: { align: z.enum(ALIGNS), brk: z.enum(BREAKS) },
  photo_points: { asym: z.enum(ASYMS), crop: z.enum(CROPS), motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
  checkpanel: { motif: z.enum(MOTIFS) },
  ruled: { motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
})
export type WhyUsSpec = z.infer<typeof whyUsSchema>

const LIST_MOTIFS: Motif[] = ['numbers', 'circles', 'ticks']

function HEAD(ctx: BodyContext, align: 'left' | 'center' | 'row' = 'left') {
  const t = ctx.biome
  return head('why_us', { eyebrow: t.voice.eyebrows.why_us, title: t.voice.titles.whyUs, align })
}

const point = ([t, d]: readonly [string, string], mark = '') =>
  `${mark}<div class="sb-point"><h3 class="sb-h3">${esc(t)}</h3><p class="sb-mu">${esc(d)}</p></div>`

/** A list of the points, marked by the motif (numerals, circles, ticks drawn by CSS) or icons. */
function pointList(v: WhyView, ctx: BodyContext, motif: string, cls = '') {
  const on = ctx.motif && LIST_MOTIFS.includes(motif as Motif)
  const tag = on && motif !== 'ticks' ? 'ol' : 'ul'
  const lc = cx('sb-list sb-points', on && (motif === 'ticks' ? 'sb-list--tick' : 'sb-list--num'), cls)
  const li = v.points.map((p, i) => `<li>${point(p, on ? '' : `<span class="sb-point-icon">${icon(ICONS[i % ICONS.length], 24)}</span>`)}</li>`).join('')
  return `<${tag} class="${lc}">${li}</${tag}>`
}

export const whyUs = defineSection<WhyUsSpec, WhyView>({
  type: 'why_us',
  label: 'Why us',
  view: whyView,
  schema: whyUsSchema,
  archetypes: {
    grid: {
      label: 'Grid', why: 'needs 2+ reasons to choose you',
      gate: some(2),
      params: (r, { biome: t }) => ({ cols: pick(r, [2, 3] as const), motif: rollMotif(r, t, 'why_us', ['toprule', 'icontile', 'pastel', 'numbers', 'circles'], 0.2), brk: rollBreak(r, t, ['band', 'panel', 'rule']) }),
      features: p => [p.cols - 2, MOTIFS.indexOf(p.motif) / MOTIFS.length, BREAKS.indexOf(p.brk) / 2],
      focal: (_p, z) => ({ focal: z.h2, second: z.h3 }),
      loud: true,
    },
    rows: {
      label: 'Rows', why: 'needs a reason to choose you',
      gate: some(1),
      params: (r, { biome: t }) => ({ motif: rollMotif(r, t, 'why_us', LIST_MOTIFS, 0.3), brk: rollBreak(r, t, ['band', 'rule']) }),
      features: p => [MOTIFS.indexOf(p.motif) / MOTIFS.length, p.brk === 'rule' ? 1 : 0],
      focal: (_p, z) => ({ focal: z.h2, second: z.h3 }),
    },
    split: {
      label: 'Heading and points', why: 'needs a reason to choose you',
      gate: some(1),
      params: (r, { biome: t }) => ({ asym: rollAsym(r, t, ['4/8', '5/7', '6/6']), motif: rollMotif(r, t, 'why_us', LIST_MOTIFS, 0.25), brk: rollBreak(r, t, ['band', 'panel', 'rule']) }),
      features: p => [textSpan(p.asym) / 8, MOTIFS.indexOf(p.motif) / MOTIFS.length, BREAKS.indexOf(p.brk) / 2],
      focal: (_p, z) => ({ focal: z.h2, second: z.h3 }),
      loud: true,
    },
    numbered: {
      label: 'Big numbers', why: 'needs 2+ reasons to choose you',
      gate: some(2),
      params: (r, { biome: t }) => ({ align: rollAlign(r, t, ['left', 'center']), brk: rollBreak(r, t, ['band', 'panel', 'rule']) }),
      features: p => [p.align === 'center' ? 1 : 0, BREAKS.indexOf(p.brk) / 2, 1],
      focal: (_p, z) => ({ focal: z.xl, second: z.h2 * 0.7 }),
      loud: true,
    },
    photo_points: {
      label: 'Photo and points', why: 'needs a photo and a reason to choose you',
      gate: v => v.photo !== null && v.points.length >= 1,
      params: (r, { biome: t }) => ({ asym: rollAsym(r, t, ['7/5', '6/6']), crop: rollCrop(r, t, ['4:5', '1:1']), motif: rollMotif(r, t, 'why_us', LIST_MOTIFS, 0.25), brk: rollBreak(r, t, ['band', 'rule']) }),
      features: p => [textSpan(p.asym) / 8, CROPS.indexOf(p.crop) / 3, MOTIFS.indexOf(p.motif) / MOTIFS.length],
      focal: (_p, z) => ({ focal: z.h2, second: z.h3 }),
      sided: true,
    },
    checkpanel: {
      label: 'Checklist panel', why: 'needs 2+ reasons to choose you',
      gate: some(2),
      params: (r, { biome: t }) => ({ motif: rollMotif(r, t, 'why_us', ['ticks'], 0.15) }),
      features: p => [p.motif === 'ticks' ? 1 : 0, 1, 1],
      focal: (_p, z) => ({ focal: z.h2, second: z.h3 }),
    },
    ruled: {
      label: 'Ruled columns', why: 'needs 3–5 reasons to choose you',
      gate: v => v.points.length >= 3 && v.points.length <= 5,
      params: (r, { biome: t }) => ({ motif: rollMotif(r, t, 'why_us', ['double'], 0.25), brk: rollBreak(r, t, ['band', 'rule']) }),
      features: p => [p.motif === 'double' ? 1 : 0, 1, 1],
      focal: (_p, z) => ({ focal: z.h2, second: z.h3 }),
    },
  },
  weights: {
    'workwear': { grid: 2, rows: 1.4, split: 2.4, numbered: 3, photo_points: 2 },
    'clean-pro': { grid: 0.8, rows: 1.2, split: 2.6, numbered: 2.6, photo_points: 2.4, checkpanel: 3 },
    'craft-heritage': { grid: 1.4, rows: 2, split: 2.4, numbered: 1.6, photo_points: 1.6, ruled: 3 },
    'friendly-local': { grid: 3, rows: 1.2, split: 1.2, numbered: 1.4, photo_points: 3 },
  },
  fallback: { v: 2, section: 'why_us', archetype: 'rows', step: 2, params: { motif: 'none', brk: 'band' } },
  panel: s => s.archetype === 'checkpanel' || (s.params as { brk?: string }).brk === 'panel',
  body: (s, v, ctx) => {
    switch (s.archetype) {
      case 'grid': {
        const p = s.params
        const on = ctx.motif
        const num = on && (p.motif === 'numbers' || p.motif === 'circles')
        const mark = (i: number) => (on && p.motif === 'icontile' ? `<span class="sb-icon-tile">${icon(ICONS[i % ICONS.length], 22)}</span>` : num ? '' : `<span class="sb-point-icon">${icon(ICONS[i % ICONS.length], 26)}</span>`)
        const cls = cx('sb-grid sb-why-grid', num && 'sb-list--num', on && p.motif === 'pastel' && 'sb-pastel', on && p.motif === 'toprule' && 'sb-why-grid--rule')
        const li = v.points.map((pt, i) => `<li class="sb-card sb-point-cell">${point(pt, mark(i))}</li>`).join('')
        const tag = num ? 'ol' : 'ul'
        return { vars: `--sb-cols:${Math.min(p.cols, v.points.length)};--sb-cols-m:1;`, inner: `${HEAD(ctx, 'row')}<${tag} class="${cls}">${li}</${tag}>` }
      }
      case 'rows':
        return { inner: `${HEAD(ctx)}${pointList(v, ctx, s.params.motif, 'sb-points--rows')}` }
      case 'split': {
        const p = s.params
        return { vars: `--sb-ta:${textSpan(p.asym)};`, inner: `<div class="sb-cols sb-cols--top"><div class="sb-main sb-sticky">${HEAD(ctx)}</div><div class="sb-aside">${pointList(v, ctx, p.motif)}</div></div>` }
      }
      case 'numbered': {
        const center = s.params.align === 'center'
        const li = v.points.map(pt => `<li class="sb-point-num">${point(pt)}</li>`).join('')
        return { cls: center ? 'sb-center' : '', inner: `${HEAD(ctx, center ? 'center' : 'left')}<ol class="sb-grid sb-why-big" style="--sb-cols:${v.points.length > 4 || v.points.length === 3 ? 3 : 2};--sb-cols-m:1">${li}</ol>` }
      }
      case 'photo_points': {
        const p = s.params
        return {
          vars: `--sb-ta:${textSpan(p.asym)};`,
          inner: `<div class="sb-cols sb-cols--top"><div class="sb-main sb-stack">${HEAD(ctx)}${pointList(v, ctx, p.motif)}</div>${media(v.photo, { crop: p.crop, cls: 'sb-aside sb-why-photo' })}</div>`,
        }
      }
      case 'checkpanel': {
        const on = ctx.motif
        const li = v.points.map(pt => `<li>${point(pt)}</li>`).join('')
        return { brk: 'panel', vars: '--sb-ta:4;', inner: `<div class="sb-cols sb-cols--top"><div class="sb-main">${HEAD(ctx)}</div><ul class="${cx('sb-aside sb-list sb-list--bare sb-why-checks', on && 'sb-list--tick')}">${li}</ul></div>` }
      }
      case 'ruled': {
        const li = v.points.map(pt => `<li>${point(pt)}</li>`).join('')
        return { vars: `--sb-cols:${v.points.length};`, cls: ctx.motif ? 'sb-ruled--double' : '', inner: `${HEAD(ctx, 'center')}<ol class="sb-why-ruled">${li}</ol>` }
      }
    }
  },
  words: (s, _v, style) => {
    const t = THEMES[style.theme]
    return { title: t.voice.titles.whyUs, texts: _v.points.flat(), col: s.archetype === 'split' || s.archetype === 'checkpanel' ? 420 : 760 }
  },
})

export const WHY_US_CSS = `
.sb-point{display:flex;flex-direction:column;gap:8px;min-width:0}
.sb-points>li{align-items:flex-start}
.sb-point-icon{display:inline-flex}
.sb-point-cell{justify-content:flex-start}
.sb-why-grid--rule>li.sb-card{border-top-width:6px}
.sb-why-big{counter-reset:sb-n;row-gap:calc(var(--sb-gap) * 2.5)}
.sb-why-big>li{counter-increment:sb-n;display:flex;flex-direction:column;gap:14px}
.sb-why-big>li::before{content:counter(sb-n,decimal-leading-zero);font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:var(--sb-xl);line-height:0.9;letter-spacing:var(--sb-dtr);color:var(--sb-link)}
.sb-center .sb-why-big>li{align-items:center;text-align:center}
.sb-why-photo .sb-photo{max-height:640px}
.sb-why-checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:calc(var(--sb-gap) * 1.5) calc(var(--sb-gap) * 2.5)}
.sb-why-checks>li{padding:0}
.sb-why-ruled{counter-reset:sb-n;display:grid;grid-template-columns:repeat(var(--sb-cols,5),minmax(0,1fr));border-top:1px solid var(--sb-fg);border-bottom:1px solid var(--sb-fg)}
.sb-ruled--double .sb-why-ruled{box-shadow:0 -5px 0 -4px var(--sb-fg),0 5px 0 -4px var(--sb-fg)}
.sb-why-ruled>li{counter-increment:sb-n;display:flex;flex-direction:column;gap:12px;padding:28px 22px;border-left:1px solid var(--sb-hair)}
.sb-why-ruled>li:first-child{border-left:0}
.sb-why-ruled>li::before{content:counter(sb-n,upper-roman) ".";font-family:var(--sb-fd);font-style:italic;font-size:24px;color:var(--sb-link)}
.sb-why-ruled .sb-h3{font-size:22px}
.sb-sec.sb-th--workwear .sb-why-big>li::before{color:var(--sb-accent)}
.sb-sec.sb-th--craft-heritage .sb-why-big>li::before{content:counter(sb-n,upper-roman);font-style:italic}
.sb-sec.sb-th--friendly-local .sb-why-big>li::before{content:counter(sb-n);display:grid;place-items:center;width:1.4em;height:1.4em;border-radius:50%;background:var(--sb-btn-bg);color:var(--sb-btn-fg);font-size:calc(var(--sb-xl) * 0.62)}
.sb-sec.sb-th--clean-pro .sb-why-big>li::before{font-size:calc(var(--sb-xl) * 0.8)}
@container (max-width: 719px){
  .sb-why-photo .sb-photo{max-height:300px}
  .sb-why-checks{grid-template-columns:1fr}
  .sb-why-ruled{grid-template-columns:1fr}
  .sb-why-ruled>li{border-left:0;border-top:1px solid var(--sb-hair);padding:20px 0}
  .sb-why-ruled>li:first-child{border-top:0}
  .sb-why-big>li::before{font-size:var(--sb-xlm)}
}
`
