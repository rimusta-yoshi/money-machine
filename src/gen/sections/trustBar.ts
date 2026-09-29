import { z } from 'zod'
import { cx, esc } from '../html'
import { pick } from '../rng'
import { businessName } from '../content'
import type { PageContent } from '../content'
import { defineSection, specSchema } from '../core/define'
import { head, icon } from '../core/markup'
import type { IconName } from '../core/markup'
import { rollAlign, rollBreak, rollMotif, rollRot } from '../core/punch'
import { ALIGNS, BREAKS, MOTIFS } from '../themes/types'

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
  strip: { align: z.enum(ALIGNS), divider: z.enum(['dot', 'slash', 'none']), brk: z.enum(BREAKS) },
  tiles: { motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
  stats: { motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
  stickers: { rot: z.number().int().min(-6).max(6), align: z.enum(ALIGNS) },
  ledger: { motif: z.enum(MOTIFS) },
  ticks: { brk: z.enum(BREAKS) },
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
      params: (r, { biome: t }) => ({ align: rollAlign(r, t, ['center', 'left', 'split']), divider: pick(r, ['dot', 'slash', 'none'] as const), brk: rollBreak(r, t, ['band', 'rule'], 0.8) }),
      features: p => [ALIGNS.indexOf(p.align) / 2, ['dot', 'slash', 'none'].indexOf(p.divider) / 2],
      focal: () => ({ focal: 22, second: 17 }),
      loud: true,
    },
    tiles: {
      label: 'Tiles', why: 'needs 2+ credentials or facts',
      gate: v => v.items.length >= 2,
      params: (r, { biome: t }) => ({ motif: rollMotif(r, t, 'trust_bar', ['toprule', 'icontile', 'pastel'], 0.2), brk: rollBreak(r, t, ['band', 'panel']) }),
      features: p => [MOTIFS.indexOf(p.motif) / MOTIFS.length, p.brk === 'panel' ? 1 : 0],
      focal: () => ({ focal: 20, second: 17 }),
      loud: true,
    },
    stats: {
      label: 'Big numbers', why: 'needs 2 of: years in business, jobs done, rating',
      gate: v => v.stats.length >= 2,
      params: (r, { biome: t }) => ({ motif: rollMotif(r, t, 'trust_bar', ['toprule', 'pastel'], 0.3), brk: rollBreak(r, t, ['band', 'panel', 'rule']) }),
      features: p => [MOTIFS.indexOf(p.motif) / MOTIFS.length, BREAKS.indexOf(p.brk) / 2, 1],
      focal: (_p, z) => ({ focal: z.xl, second: 17 }),
      loud: true,
    },
    stickers: {
      label: 'Stickers', why: 'needs 2–5 short credentials or facts',
      gate: v => v.items.length >= 2 && v.items.length <= 5 && v.items.every(i => i.text.length <= 36),
      params: (r, { biome: t }) => ({ rot: rollRot(r, t), align: rollAlign(r, t, ['center', 'left']) }),
      features: p => [Math.abs(p.rot) / 6, p.align === 'center' ? 1 : 0, 1],
      focal: () => ({ focal: 18, second: 17 }),
    },
    ledger: {
      label: 'Ruled line', why: 'needs a credential, rating or other fact',
      gate: v => v.items.length >= 1,
      params: (r, { biome: t }) => ({ motif: rollMotif(r, t, 'trust_bar', ['double'], 0.2) }),
      features: p => [p.motif === 'double' ? 1 : 0, 1],
      focal: () => ({ focal: 15, second: 15 }),
    },
    ticks: {
      label: 'Tick row', why: 'needs a credential, rating or other fact',
      gate: v => v.items.length >= 1,
      params: (r, { biome: t }) => ({ brk: rollBreak(r, t, ['band', 'panel']) }),
      features: p => [p.brk === 'panel' ? 1 : 0, 0.5],
      focal: () => ({ focal: 17, second: 17 }),
    },
  },
  weights: {
    'workwear': { strip: 4, tiles: 1.5, stats: 2 },
    'clean-pro': { strip: 1.2, tiles: 2.4, stats: 2, ticks: 2.4 },
    'craft-heritage': { strip: 1.5, tiles: 0.8, stats: 1.5, ledger: 4 },
    'friendly-local': { strip: 1, tiles: 2.4, stats: 1.6, stickers: 3.5 },
  },
  fallback: { v: 2, section: 'trust_bar', archetype: 'strip', step: 2, params: { align: 'left', divider: 'none', brk: 'band' } },
  body: (s, v, ctx) => {
    const title = head('trust_bar', { title: `Why choose ${v.name}`, hidden: true })
    switch (s.archetype) {
      case 'strip': {
        const p = s.params
        const items = v.items.map(i => `<li>${icon(i.icon, 20)}<span>${esc(i.text)}</span></li>`).join('')
        return { cls: `sb-align--${p.align} sb-div--${p.divider}`, inner: `${title}<ul class="sb-trust-strip">${items}</ul>` }
      }
      case 'tiles': {
        const p = s.params
        const on = ctx.motif
        const mark = (i: TrustView['items'][number]) => (on && p.motif === 'icontile' ? `<span class="sb-icon-tile">${icon(i.icon, 22)}</span>` : icon(i.icon, 24))
        const cls = cx('sb-grid sb-trust-tiles', on && p.motif === 'pastel' && 'sb-pastel', on && p.motif === 'toprule' && 'sb-trust-tiles--rule')
        const items = v.items.map(i => `<li class="sb-card">${mark(i)}<span>${esc(i.text)}</span></li>`).join('')
        return { vars: `--sb-cols:${Math.min(4, v.items.length)};--sb-cols-m:1;`, inner: `${title}<ul class="${cls}">${items}</ul>` }
      }
      case 'stats': {
        const p = s.params
        const on = ctx.motif
        const cls = cx('sb-grid sb-trust-stats', on && p.motif === 'pastel' && 'sb-pastel sb-trust-stats--tiles', on && p.motif === 'toprule' && 'sb-trust-stats--rule')
        const stats = v.stats.map(st => `<li><span class="sb-stat-n">${esc(st.n)}</span><span class="sb-stat-l">${esc(st.l)}</span></li>`).join('')
        return { vars: `--sb-cols:${v.stats.length};--sb-cols-m:1;`, inner: `${title}<ul class="${cls}">${stats}</ul>` }
      }
      case 'stickers': {
        const p = s.params
        const items = v.items.map((i, n) => `<li class="sb-sticker sb-trust-sticker${n % 3 === 1 ? ' sb-sticker--ink' : ''}" data-over style="--sb-rot:${n % 2 === 0 ? p.rot : -p.rot}deg">${esc(i.text)}</li>`).join('')
        return { cls: p.align === 'center' ? 'sb-align--center' : '', inner: `${title}<ul class="sb-trust-stickers">${items}</ul>` }
      }
      case 'ledger': {
        const items = v.items.map(i => `<li>${esc(i.text)}</li>`).join('')
        return { cls: ctx.motif ? 'sb-ledger--double' : '', inner: `${title}<ul class="sb-trust-ledger">${items}</ul>` }
      }
      case 'ticks': {
        const items = v.items.map(i => `<li>${esc(i.text)}</li>`).join('')
        return { inner: `${title}<ul class="sb-trust-ticks">${items}</ul>` }
      }
    }
  },
  // The heading is for screen readers only, so it takes no lines.
  words: (_s, v) => ({ title: '', texts: v.items.map(i => i.text) }),
})

export const TRUST_BAR_CSS = `
.sb-trust-bar .sb-wrap{padding-block:calc(var(--sb-py) * 0.36)}
.sb-trust-bar.sb-brk--panel .sb-wrap{padding-block:calc(var(--sb-py) * 0.42)}
.sb-trust-strip{display:flex;flex-wrap:wrap;gap:12px 34px;font-weight:600;font-size:17px}
.sb-trust-strip li{display:flex;align-items:center;gap:10px;min-height:32px}
.sb-align--center .sb-trust-strip{justify-content:center}
.sb-align--split .sb-trust-strip{justify-content:space-between}
.sb-div--dot .sb-trust-strip li+li::before{content:"";width:6px;height:6px;margin-right:24px;border-radius:50%;background:currentColor;opacity:0.55}
.sb-div--slash .sb-trust-strip li+li::before{content:"/";margin-right:24px;opacity:0.5;font-weight:400}
.sb-div--dot .sb-trust-strip .sb-icon,.sb-div--slash .sb-trust-strip .sb-icon{display:none}
.sb-trust-tiles>li{flex-direction:row;align-items:center;gap:14px;font-weight:600;font-size:17px}
.sb-trust-stats>li{display:flex;flex-direction:column}
.sb-trust-stats--tiles>li{padding:28px;border-radius:var(--sb-r)}
.sb-trust-stats--tiles>li .sb-stat-n,.sb-trust-stats--tiles>li .sb-stat-l{color:var(--sb-ink)}
.sb-trust-stats--rule>li{border-top:6px solid var(--sb-accent);padding-top:20px}
.sb-trust-tiles--rule>li.sb-card{border-top-width:6px}
.sb-trust-stickers{display:flex;flex-wrap:wrap;gap:18px 22px;padding:8px 0}
.sb-align--center .sb-trust-stickers{justify-content:center}
.sb-trust-sticker{position:relative;max-width:none}
.sb-trust-ledger{display:flex;flex-wrap:wrap;justify-content:center;gap:10px 0;padding:18px 0;font-family:var(--sb-fl);font-weight:var(--sb-lw);font-size:14px;letter-spacing:var(--sb-ltr);text-transform:var(--sb-lup)}
.sb-trust-ledger>li+li::before{content:"";display:inline-block;width:7px;height:7px;margin:0 22px;transform:translateY(-2px) rotate(45deg);background:var(--sb-link)}
.sb-ledger--double .sb-trust-ledger{border-top:1px solid var(--sb-fg);border-bottom:1px solid var(--sb-fg);box-shadow:0 -5px 0 -4px var(--sb-fg),0 5px 0 -4px var(--sb-fg)}
.sb-trust-ticks{display:flex;flex-wrap:wrap;gap:12px 32px;font-weight:600}
.sb-trust-ticks>li{display:flex;align-items:center;gap:10px}
.sb-trust-ticks>li::before{content:"";flex:none;width:20px;height:20px;background:var(--sb-link);-webkit-mask:var(--sb-tick) center/contain no-repeat;mask:var(--sb-tick) center/contain no-repeat}
.sb-sec.sb-th--workwear .sb-trust-strip{font-family:var(--sb-fl);font-weight:700;font-size:22px;letter-spacing:0.06em;text-transform:uppercase}
.sb-sec.sb-th--workwear .sb-trust-strip .sb-icon{color:currentColor}
.sb-sec.sb-th--craft-heritage .sb-trust-strip{font-family:var(--sb-fl);font-size:14px;letter-spacing:0.16em;text-transform:uppercase}
@container (max-width: 719px){
  .sb-trust-strip{flex-direction:column;align-items:flex-start;gap:10px}
  .sb-align--center .sb-trust-strip,.sb-align--split .sb-trust-strip{align-items:flex-start}
  .sb-div--dot .sb-trust-strip li+li::before,.sb-div--slash .sb-trust-strip li+li::before{display:none}
  .sb-div--dot .sb-trust-strip .sb-icon,.sb-div--slash .sb-trust-strip .sb-icon{display:block}
  .sb-sec.sb-th--workwear .sb-trust-strip{font-size:19px}
  .sb-trust-ledger{flex-direction:column;align-items:center;gap:12px}
  .sb-trust-ledger>li+li::before{display:none}
}
`
