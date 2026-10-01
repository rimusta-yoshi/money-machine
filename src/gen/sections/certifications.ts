import { z } from 'zod'
import { cx, esc } from '../html'
import { pick } from '../rng'
import type { PageContent } from '../content'
import { defineSection, specSchema } from '../core/define'
import type { BodyContext } from '../core/define'
import { head, icon } from '../core/markup'
import { rollAlign, rollBreak, rollMotif, rollRot } from '../core/punch'
import { THEMES } from '../themes'
import { ALIGNS, BREAKS, MOTIFS } from '../themes/types'

export interface CertsView {
  badges: readonly string[]
  /** The customer's own note, e.g. "Certificates available on request". Never added for them. */
  note: string | null
}
export const certsView = (c: PageContent): CertsView => ({ badges: c.badges, note: c.certsNote })

export const certificationsSchema = specSchema('certifications', {
  cards: { cols: z.union([z.literal(2), z.literal(3), z.literal(4)]), mark: z.enum(['badge', 'shield']), motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
  checklist: { layout: z.enum(['beside', 'below']), motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
  seals: { shape: z.enum(['circle', 'rounded']), align: z.enum(ALIGNS) },
  plates: { motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
  certificate: { motif: z.enum(MOTIFS) },
  badges: { rot: z.number().int().min(-6).max(6), align: z.enum(ALIGNS), motif: z.enum(MOTIFS) },
})
export type CertificationsSpec = z.infer<typeof certificationsSchema>

const HEAD = (ctx: BodyContext, v: CertsView, align: 'left' | 'center' | 'row' = 'left') =>
  head('certifications', { eyebrow: ctx.biome.voice.eyebrows.certifications, title: ctx.biome.voice.titles.certifications, lead: v.note ?? undefined, align })

const short = (v: CertsView) => v.badges.every(b => b.length <= 32)

export const certifications = defineSection<CertificationsSpec, CertsView>({
  type: 'certifications',
  label: 'Certifications',
  view: certsView,
  schema: certificationsSchema,
  archetypes: {
    cards: {
      label: 'Cards', why: 'needs your credentials',
      gate: v => v.badges.length >= 1,
      params: (r, { content: v, biome: t }) => ({
        cols: v.badges.length % 4 === 0 ? 4 : v.badges.length % 3 === 0 || v.badges.length > 4 ? 3 : 2, mark: pick(r, ['badge', 'shield'] as const),
        motif: rollMotif(r, t, 'certifications', ['toprule', 'icontile', 'pastel', 'numbers'], 0.2), brk: rollBreak(r, t, ['band', 'rule']),
      }),
      shows: () => [{ facet: 'badges', core: true }],
      features: p => [(p.cols - 2) / 2, p.mark === 'badge' ? 1 : 0, MOTIFS.indexOf(p.motif) / MOTIFS.length],
      focal: (_p, z) => ({ focal: z.h2, second: z.h3 }),
    },
    checklist: {
      label: 'Checklist', why: 'needs your credentials',
      gate: v => v.badges.length >= 1,
      params: (r, { biome: t }) => ({ layout: pick(r, ['beside', 'below'] as const), motif: rollMotif(r, t, 'certifications', ['ticks', 'leaders', 'numbers'], 0.25), brk: rollBreak(r, t, ['band', 'panel', 'rule']) }),
      shows: () => [{ facet: 'badges', core: true }],
      features: p => [p.layout === 'beside' ? 1 : 0, MOTIFS.indexOf(p.motif) / MOTIFS.length, BREAKS.indexOf(p.brk) / 2],
      focal: (_p, z) => ({ focal: z.h2, second: 18 }),
    },
    seals: {
      label: 'Seals', why: 'needs 2–6 short credentials',
      gate: v => v.badges.length >= 2 && v.badges.length <= 6 && short(v),
      params: (r, { biome: t }) => ({ shape: pick(r, ['circle', 'rounded'] as const), align: rollAlign(r, t, ['center', 'left']) }),
      shows: () => [{ facet: 'badges', core: true }],
      features: p => [p.shape === 'circle' ? 1 : 0, p.align === 'center' ? 1 : 0, 1],
      focal: (_p, z) => ({ focal: z.h2, second: 16 }),
      loud: true,
    },
    plates: {
      label: 'Plates', why: 'needs your credentials',
      gate: v => v.badges.length >= 1,
      params: (r, { biome: t }) => ({ motif: rollMotif(r, t, 'certifications', ['stripe'], 0.3), brk: rollBreak(r, t, ['band', 'rule']) }),
      shows: () => [{ facet: 'badges', core: true }],
      features: p => [p.motif === 'stripe' ? 1 : 0, 1, 1],
      focal: (_p, z) => ({ focal: z.h2, second: 24 }),
      loud: true,
    },
    certificate: {
      label: 'Certificate', why: 'needs your credentials',
      gate: v => v.badges.length >= 1,
      params: (r, { biome: t }) => ({ motif: rollMotif(r, t, 'certifications', ['double', 'diamond'], 0.1) }),
      shows: () => [{ facet: 'badges', core: true }],
      features: p => [MOTIFS.indexOf(p.motif) / MOTIFS.length, 1, 1],
      focal: (_p, z) => ({ focal: z.h2, second: 15 }),
    },
    badges: {
      label: 'Round badges', why: 'needs 2–6 short credentials',
      gate: v => v.badges.length >= 2 && v.badges.length <= 6 && short(v),
      params: (r, { biome: t }) => ({ rot: rollRot(r, t), align: rollAlign(r, t, ['center', 'left']), motif: rollMotif(r, t, 'certifications', ['sticker'], 0) }),
      shows: () => [{ facet: 'badges', core: true }],
      features: p => [Math.abs(p.rot) / 6, p.align === 'center' ? 1 : 0, 1],
      focal: (_p, z) => ({ focal: z.h2, second: 17 }),
    },
  },
  weights: {
    'workwear': { cards: 2, checklist: 2, seals: 1.4, plates: 3 },
    'clean-pro': { cards: 0.6, checklist: 3, seals: 1.8 },
    'craft-heritage': { cards: 1, checklist: 2.5, seals: 1.2, certificate: 3.5 },
    'friendly-local': { cards: 2.4, checklist: 1.4, seals: 1.6, badges: 3 },
  },
  fallback: { v: 2, section: 'certifications', archetype: 'checklist', step: 2, params: { layout: 'below', motif: 'none', brk: 'band' } },
  body: (s, v, ctx) => {
    const on = ctx.motif
    switch (s.archetype) {
      case 'cards': {
        const p = s.params
        const num = on && p.motif === 'numbers'
        const mark = on && p.motif === 'icontile' ? `<span class="sb-icon-tile">${icon(p.mark, 24)}</span>` : num ? '' : icon(p.mark, 30)
        const cls = cx('sb-grid sb-cert-cards', num && 'sb-list--num', on && p.motif === 'pastel' && 'sb-pastel', on && p.motif === 'toprule' && 'sb-cert-cards--rule')
        const tag = num ? 'ol' : 'ul'
        const items = v.badges.map(b => `<li class="sb-card sb-cert">${mark}<p class="sb-h3">${esc(b)}</p></li>`).join('')
        return { vars: `--sb-cols:${p.cols};--sb-cols-m:1;`, inner: `${HEAD(ctx, v, 'row')}<${tag} class="${cls}">${items}</${tag}>` }
      }
      case 'checklist': {
        const p = s.params
        const m = on ? p.motif : 'none'
        const cls = cx('sb-list sb-checks', m === 'ticks' && 'sb-list--tick', m === 'numbers' && 'sb-list--num', m === 'leaders' && 'sb-leaders', p.layout === 'below' && 'sb-checks--2')
        const tag = m === 'numbers' ? 'ol' : 'ul'
        const items = v.badges.map(b => `<li>${m === 'none' ? icon('check', 22) : ''}<span>${esc(b)}</span>${m === 'leaders' ? '<span class="sb-dots" aria-hidden="true"></span><span class="sb-end" aria-hidden="true">✓</span>' : ''}</li>`).join('')
        const list = `<${tag} class="${cls}">${items}</${tag}>`
        return p.layout === 'beside'
          ? { vars: '--sb-ta:5;', inner: `<div class="sb-cols sb-cols--top"><div class="sb-main">${HEAD(ctx, v)}</div><div class="sb-aside">${list}</div></div>` }
          : { inner: `${HEAD(ctx, v)}${list}` }
      }
      case 'seals': {
        const p = s.params
        const center = p.align === 'center'
        const items = v.badges.map(b => `<li class="sb-seal">${icon('badge', 28)}<span>${esc(b)}</span></li>`).join('')
        return { cls: `sb-shape--${p.shape}`, inner: `${HEAD(ctx, v, center ? 'center' : 'left')}<ul class="sb-seals${center ? ' sb-seals--center' : ''}">${items}</ul>` }
      }
      case 'plates': {
        const items = v.badges.map(b => `<li class="sb-plate">${icon('shield', 26)}<span>${esc(b)}</span></li>`).join('')
        return { cls: on ? 'sb-plates--stripe' : '', inner: `${HEAD(ctx, v, 'row')}<ul class="sb-plates">${items}</ul>` }
      }
      case 'certificate': {
        const p = s.params
        const orn = on && p.motif === 'diamond' ? '<div class="sb-diamond" aria-hidden="true"><span></span></div>' : ''
        const items = v.badges.map(b => `<li>${esc(b)}</li>`).join('')
        return { cls: on && p.motif === 'double' ? 'sb-cert-frame--double' : '', inner: `<div class="sb-cert-frame">${HEAD(ctx, v, 'center')}${orn}<ul class="sb-cert-list">${items}</ul></div>` }
      }
      case 'badges': {
        const p = s.params
        // Over the page's sticker quota, the badges sit straight.
        const rot = ctx.motif ? p.rot : 0
        const items = v.badges.map((b, i) => `<li class="sb-rbadge${i % 3 === 1 ? ' sb-rbadge--ink' : ''}" data-over style="--sb-rot:${i % 2 === 0 ? rot : -rot}deg">${icon('badge', 26)}<span>${esc(b)}</span></li>`).join('')
        return { inner: `${HEAD(ctx, v, p.align === 'center' ? 'center' : 'left')}<ul class="sb-rbadges${p.align === 'center' ? ' sb-rbadges--center' : ''}">${items}</ul>` }
      }
    }
  },
  words: (s, v, style) => ({ title: THEMES[style.theme].voice.titles.certifications, texts: [...v.badges, ...(v.note ? [v.note] : [])], col: s.archetype === 'checklist' && s.params.layout === 'beside' ? 440 : 760 }),
})

export const CERTIFICATIONS_CSS = `
.sb-cert{justify-content:flex-start}
.sb-cert-cards--rule>li.sb-card{border-top-width:6px}
.sb-checks>li{align-items:center;font-weight:600;font-size:18px}
.sb-checks--2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:calc(var(--sb-gap) * 3)}
.sb-checks--2>li:nth-last-child(2){border-bottom:1px solid var(--sb-hair)}
.sb-checks .sb-icon{color:var(--sb-link)}
.sb-seals{display:flex;flex-wrap:wrap;gap:22px}
.sb-seals--center{justify-content:center}
.sb-seal{width:176px;min-height:176px;padding:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;font-weight:700;font-size:15px;line-height:1.3;border:2px solid currentColor;overflow-wrap:break-word}
.sb-seal .sb-icon{color:currentColor}
.sb-shape--circle .sb-seal{border-radius:50%}
.sb-shape--rounded .sb-seal{border-radius:calc(var(--sb-r) + 8px)}
.sb-plates{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:calc(var(--sb-gap) * 1.2)}
.sb-plate{display:flex;align-items:center;gap:14px;min-height:88px;padding:18px 22px;border:2px solid var(--sb-fg);font-family:var(--sb-fl);font-weight:var(--sb-lw);font-size:20px;letter-spacing:var(--sb-ltr);text-transform:var(--sb-lup);line-height:1.15}
.sb-plate .sb-icon{color:var(--sb-link)}
.sb-plates--stripe .sb-plate{position:relative;padding-top:30px}
.sb-plates--stripe .sb-plate::before{content:"";position:absolute;left:0;right:0;top:0;height:10px;background:repeating-linear-gradient(-45deg,var(--sb-accent) 0 10px,transparent 10px 20px)}
.sb-cert-frame{display:flex;flex-direction:column;align-items:center;gap:calc(var(--sb-gap) * 1.6);padding:calc(var(--sb-gap) * 3) calc(var(--sb-gap) * 2);border:1px solid var(--sb-fg);text-align:center}
.sb-cert-frame--double .sb-cert-frame{outline:1px solid var(--sb-fg);outline-offset:5px}
.sb-cert-list{display:flex;flex-wrap:wrap;justify-content:center;gap:12px 0;font-family:var(--sb-fl);font-weight:var(--sb-lw);font-size:15px;letter-spacing:var(--sb-ltr);text-transform:var(--sb-lup)}
.sb-cert-list>li+li::before{content:"";display:inline-block;width:7px;height:7px;margin:0 20px;transform:translateY(-2px) rotate(45deg);background:var(--sb-link)}
.sb-rbadges{display:flex;flex-wrap:wrap;gap:26px;padding:10px 0}
.sb-rbadges--center{justify-content:center}
.sb-rbadge{width:168px;height:168px;border-radius:50%;padding:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;background:#FFFFFF;color:var(--sb-ink);box-shadow:0 10px 26px color-mix(in srgb,var(--sb-ink) 12%,transparent);font-weight:800;font-size:15px;line-height:1.25;overflow-wrap:break-word;transform:rotate(var(--sb-rot,0deg))}
.sb-rbadge .sb-icon{color:var(--sb-brand-text)}
.sb-rbadge--ink{background:var(--sb-ink);color:var(--sb-ground)}
.sb-rbadge--ink .sb-icon{color:var(--sb-ground)}
@container (max-width: 719px){
  .sb-checks--2{grid-template-columns:1fr}
  .sb-seals{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .sb-seal{width:auto;min-height:150px}
  .sb-cert-list{flex-direction:column;align-items:center}
  .sb-cert-list>li+li::before{display:none}
  .sb-rbadges{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;justify-items:center}
  .sb-rbadge{width:140px;height:140px;font-size:14px}
}
`
