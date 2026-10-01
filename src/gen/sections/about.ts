import { z } from 'zod'
import { cx, esc } from '../html'
import { pick } from '../rng'
import type { PageContent, PagePhoto, PageReview } from '../content'
import { facts } from '../content'
import { defineSection, specSchema } from '../core/define'
import type { BodyContext } from '../core/define'
import { corner, head, img, media, SPOTS, stars } from '../core/markup'
import type { Spot } from '../core/markup'
import { rollAlign, rollAsym, rollBreak, rollCrop, rollMotif, rollRot, textSpan } from '../core/punch'
import { THEMES } from '../themes'
import { sizesFor } from '../themes/sizes'
import { ALIGNS, ASYMS, BLEEDS, BREAKS, CROPS, MOTIFS } from '../themes/types'

export interface AboutView {
  trade: string
  place: string
  body: string
  photo: PagePhoto | null
  stats: { n: string; l: string }[]
  /** A short real review, for layouts that quote one. */
  review: PageReview | null
  facts: readonly string[]
}

export function aboutView(c: PageContent): AboutView {
  const trade = c.trade.name.toLowerCase()
  return {
    trade,
    place: c.business.location,
    body: c.business.about || `We’re a local, independent ${trade} business. You deal with the same people from first call to finished job.`,
    photo: c.photos.about,
    stats: [
      ...(c.business.years ? [{ n: c.business.years, l: 'Years local' }] : []),
      ...(c.jobsDone ? [{ n: c.jobsDone, l: 'Jobs done' }] : []),
      ...(c.rating ? [{ n: `${c.rating.score}/5`, l: `${c.rating.count} reviews` }] : []),
    ],
    review: c.reviews.find(r => r.text.length <= 180) ?? null,
    facts: facts(c),
  }
}

const spot = z.enum(SPOTS)

export const aboutSchema = specSchema('about', {
  photo_split: { asym: z.enum(ASYMS), crop: z.enum(CROPS), bleed: z.enum(BLEEDS), motif: z.enum(MOTIFS), at: spot, rot: z.number().int().min(-6).max(6), stats: z.boolean(), brk: z.enum(BREAKS) },
  statement: { size: z.enum(['big', 'medium']), align: z.enum(ALIGNS), em: z.boolean(), brk: z.enum(BREAKS) },
  stats_led: { motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
  banner: { height: z.enum(['short', 'tall']), brk: z.enum(BREAKS) },
  panel: { review: z.boolean(), crop: z.enum(CROPS) },
  story: { asym: z.enum(ASYMS), photo: z.boolean(), crop: z.enum(CROPS), motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
  bigtype: { em: z.boolean(), stats: z.boolean(), brk: z.enum(BREAKS) },
  bubble: { asym: z.enum(ASYMS), crop: z.enum(CROPS), motif: z.enum(MOTIFS) },
})
export type AboutSpec = z.infer<typeof aboutSchema>

const titleOf = (v: AboutView, ctx: Pick<BodyContext, 'biome'>) => ctx.biome.voice.titles.about(v.trade, v.place)

function statsList(v: AboutView, cls = '') {
  return v.stats.length
    ? `<ul class="${cx('sb-about-stats', cls)}">${v.stats.map(s => `<li><span class="sb-stat-n">${esc(s.n)}</span><span class="sb-stat-l">${esc(s.l)}</span></li>`).join('')}</ul>`
    : ''
}

const quote = (r: PageReview, cls: string) =>
  `<figure class="${cls}">${stars(r.rating)}<blockquote><p>“${esc(r.text)}”</p></blockquote><figcaption class="sb-mu">${esc(r.author)}${r.location ? ` · ${esc(r.location)}` : ''}</figcaption></figure>`

/** A spot on the photo's outer side, away from the text (decorations never sit between them). */
const away = (r: () => number): Spot => pick(r, ['ob', 'ot'] as const)

export const about = defineSection<AboutSpec, AboutView>({
  type: 'about',
  label: 'About',
  view: aboutView,
  schema: aboutSchema,
  anchor: 'about',
  archetypes: {
    photo_split: {
      label: 'Photo and story', why: 'needs a team or van photo',
      gate: v => v.photo !== null,
      params: (r, { content: v, biome: t }) => {
        const motif = rollMotif(r, t, 'about', ['stripe', 'floatcard', 'caption', 'blob', 'sticker'], 0.3)
        return {
          asym: rollAsym(r, t, ['6/6', '7/5', '5/7']), crop: rollCrop(r, t), bleed: pick(r, t.punch.bleed),
          motif: (motif === 'floatcard' && !v.review) || (motif === 'sticker' && !v.facts.length) ? 'none' : motif,
          at: away(r), rot: rollRot(r, t), stats: v.stats.length > 0 && r() < 0.7, brk: rollBreak(r, t, ['band', 'rule']),
        }
      },
      shows: p => [...(p.stats ? [{ facet: 'stats' as const }] : []), ...(p.motif === 'sticker' ? [{ facet: 'badges' as const }] : []), ...(p.motif === 'floatcard' ? [{ facet: 'reviews' as const }] : [])],
      features: p => [textSpan(p.asym) / 8, CROPS.indexOf(p.crop) / 3, MOTIFS.indexOf(p.motif) / MOTIFS.length, p.stats ? 1 : 0, p.bleed === 'edge' ? 1 : 0],
      focal: (_p, z) => ({ focal: z.h2, second: z.xl * 0.6 }),
      sided: true,
    },
    statement: {
      label: 'Statement', why: '',
      gate: () => true,
      params: (r, { content: v, biome: t }) => ({
        size: v.body.length > 200 ? 'medium' : pick(r, ['big', 'medium'] as const), align: rollAlign(r, t, ['left', 'center']), em: r() < 0.5,
        brk: rollBreak(r, t, ['band', 'panel', 'rule']),
      }),
      shows: () => [{ facet: 'stats' }],
      features: p => [p.size === 'big' ? 1 : 0, p.align === 'center' ? 1 : 0, BREAKS.indexOf(p.brk) / 2],
      focal: (p, z) => ({ focal: z.h2, second: p.size === 'big' ? z.h2 * 0.62 : z.h2 * 0.5 }),
      loud: true,
    },
    stats_led: {
      label: 'Big numbers', why: 'needs 2 of: years in business, jobs done, rating',
      gate: v => v.stats.length >= 2,
      params: (r, { biome: t }) => ({ motif: rollMotif(r, t, 'about', ['toprule'], 0.3), brk: rollBreak(r, t, ['band', 'panel']) }),
      shows: () => [{ facet: 'stats', core: true }],
      features: p => [p.motif === 'toprule' ? 1 : 0, p.brk === 'panel' ? 1 : 0],
      focal: (_p, z) => ({ focal: z.xl, second: z.h2 }),
    },
    banner: {
      label: 'Photo banner', why: 'needs a team or van photo',
      gate: v => v.photo !== null,
      params: (r, { biome: t }) => ({ height: pick(r, ['short', 'tall'] as const), brk: rollBreak(r, t, ['band', 'rule']) }),
      shows: () => [{ facet: 'stats' }],
      features: p => [p.height === 'tall' ? 1 : 0, 1],
      focal: (_p, z) => ({ focal: z.h2, second: 18 }),
    },
    panel: {
      label: 'Panel with a review', why: 'needs a team or van photo',
      gate: v => v.photo !== null,
      params: (r, { content: v, biome: t }) => ({ review: v.review !== null && r() < 0.8, crop: rollCrop(r, t, ['4:5', '1:1', '4:3']) }),
      shows: p => (p.review ? [{ facet: 'reviews' }] : []),
      features: p => [p.review ? 1 : 0, CROPS.indexOf(p.crop) / 3, 1],
      focal: (_p, z) => ({ focal: z.h2, second: 18 }),
      sided: true,
    },
    story: {
      label: 'Our story', why: '',
      gate: () => true,
      params: (r, { content: v, biome: t }) => ({
        asym: rollAsym(r, t, ['5/7', '4/8', '6/6']), photo: v.photo !== null && r() < 0.8, crop: rollCrop(r, t, ['4:5', '4:3']),
        motif: rollMotif(r, t, 'about', ['caption', 'diamond'], 0.2), brk: rollBreak(r, t, ['band', 'rule']),
      }),
      shows: () => [{ facet: 'stats' }],
      features: p => [p.photo ? 1 : 0, textSpan(p.asym) / 8, MOTIFS.indexOf(p.motif) / MOTIFS.length],
      focal: (_p, z) => ({ focal: z.h2, second: 60 }),
      sided: true,
    },
    bigtype: {
      label: 'Big type', why: '',
      gate: () => true,
      params: (r, { content: v, biome: t }) => ({ em: r() < 0.8, stats: v.stats.length > 0 && r() < 0.7, brk: rollBreak(r, t, ['band', 'rule']) }),
      shows: p => (p.stats ? [{ facet: 'stats' }] : []),
      features: p => [p.em ? 1 : 0, p.stats ? 1 : 0, 1],
      focal: (_p, z) => ({ focal: z.h1 * 0.85, second: z.xl * 0.6 }),
      loud: true,
    },
    bubble: {
      label: 'Chat bubble', why: 'needs a review of 180 characters or fewer',
      gate: v => v.review !== null,
      params: (r, { content: v, biome: t }) => ({
        asym: rollAsym(r, t, ['6/6', '7/5']), crop: rollCrop(r, t, ['4:5', '1:1']), motif: v.photo ? rollMotif(r, t, 'about', ['blob'], 0.3) : 'none',
      }),
      shows: () => [{ facet: 'reviews' }],
      features: p => [textSpan(p.asym) / 8, p.motif === 'blob' ? 1 : 0, 1],
      focal: (_p, z) => ({ focal: z.h2, second: 26 }),
      sided: true,
    },
  },
  weights: {
    'workwear': { photo_split: 3, statement: 1.4, stats_led: 1.6, banner: 1.4, bigtype: 3 },
    'clean-pro': { photo_split: 2.5, statement: 1.6, stats_led: 2.4, banner: 1, panel: 3.5 },
    'craft-heritage': { photo_split: 2, statement: 2, stats_led: 1, banner: 1.4, story: 3.5 },
    'friendly-local': { photo_split: 3, statement: 1.4, stats_led: 1.4, banner: 1, bubble: 2.6 },
  },
  fallback: { v: 2, section: 'about', archetype: 'statement', step: 2, params: { size: 'medium', align: 'left', em: false, brk: 'band' } },
  trim: (v, omit) => ({
    ...v,
    stats: omit.has('stats') ? [] : v.stats,
    review: omit.has('reviews') ? null : v.review,
    facts: omit.has('badges') || omit.has('rating') ? [] : v.facts,
  }),
  panel: s => s.archetype === 'panel' || (s.params as { brk?: string }).brk === 'panel',
  body: (s, v, ctx) => {
    const t = ctx.biome
    const h = (o: { align?: 'left' | 'center' | 'row'; em?: boolean } = {}) => head('about', { eyebrow: t.voice.eyebrows.about, title: titleOf(v, ctx), ...o })
    const body = (cls = 'sb-body') => `<p class="${cls}">${esc(v.body)}</p>`
    switch (s.archetype) {
      case 'photo_split': {
        const p = s.params
        const m = ctx.motif ? p.motif : 'none'
        const at = corner(p.at, ctx.rhythm.side)
        const float = m === 'floatcard' && v.review ? { html: `${stars(v.review.rating)}<p>“${esc(v.review.text)}”</p><p class="sb-float-l">${esc(v.review.author)}</p>`, at } : undefined
        const pic = media(v.photo, {
          crop: p.crop, cls: cx('sb-aside', p.bleed === 'edge' && 'sb-bleed--edge'), stripe: m === 'stripe' ? at : undefined, blob: m === 'blob',
          caption: m === 'caption' ? v.photo?.alt : undefined, float,
          // The facts can change after the pick; a sticker only appears with something true to say.
          stickers: m === 'sticker' && v.facts[0] ? [{ text: v.facts[0], at }] : undefined, rot: p.rot,
        })
        return { vars: `--sb-ta:${textSpan(p.asym)};`, inner: `<div class="sb-cols"><div class="sb-main sb-stack">${h()}${body()}${p.stats ? statsList(v) : ''}</div>${pic}</div>` }
      }
      case 'statement': {
        const p = s.params
        const center = p.align === 'center'
        return {
          cls: cx(`sb-size--${p.size}`, center && 'sb-center'),
          inner: `${h({ align: center ? 'center' : 'left', em: p.em })}${body('sb-about-statement')}${statsList(v)}`,
        }
      }
      case 'stats_led': {
        const p = s.params
        return { vars: '--sb-ta:6;', inner: `<div class="sb-cols sb-cols--top"><div class="sb-main sb-stack">${h()}${body()}</div><div class="sb-aside">${statsList(v, cx('sb-about-stats--grid', ctx.motif && p.motif === 'toprule' && 'sb-about-stats--rule'))}</div></div>` }
      }
      case 'banner': {
        const p = s.params
        return { cls: `sb-height--${p.height}`, inner: `${img(v.photo, 'sb-photo sb-about-banner')}<div class="sb-cols sb-cols--top"><div class="sb-main">${h()}</div><div class="sb-aside sb-stack">${body()}${statsList(v)}</div></div>` }
      }
      case 'panel': {
        const p = s.params
        const rev = p.review && v.review ? quote(v.review, 'sb-card sb-about-review') : ''
        return { brk: 'panel', vars: '--sb-ta:6;', inner: `<div class="sb-cols">${media(v.photo, { crop: p.crop, cls: 'sb-aside' })}<div class="sb-main sb-stack">${h()}${body()}${rev}</div></div>` }
      }
      case 'story': {
        const p = s.params
        const m = ctx.motif ? p.motif : 'none'
        const orn = m === 'diamond' ? '<div class="sb-diamond" aria-hidden="true"><span></span></div>' : ''
        const text = `<div class="sb-main sb-stack">${h()}${orn}${body('sb-body sb-dropcap')}${statsList(v)}</div>`
        if (!p.photo || !v.photo) return { vars: '--sb-ta:8;', inner: `<div class="sb-cols sb-cols--top">${text}</div>` }
        return {
          vars: `--sb-ta:${12 - textSpan(p.asym)};`,
          inner: `<div class="sb-cols sb-cols--top">${media(v.photo, { crop: p.crop, cls: 'sb-aside', caption: m === 'caption' ? v.photo.alt : undefined })}${text}</div>`,
        }
      }
      case 'bigtype': {
        const p = s.params
        const title = head('about', { eyebrow: t.voice.eyebrows.about, title: titleOf(v, ctx), em: p.em, big: true })
        return { vars: '--sb-ta:7;', inner: `<div class="sb-cols sb-cols--top sb-about-big"><div class="sb-main">${title}</div><div class="sb-aside sb-stack">${body()}${p.stats ? statsList(v) : ''}</div></div>` }
      }
      case 'bubble': {
        const p = s.params
        const m = ctx.motif ? p.motif : 'none'
        const bubble = v.review ? quote(v.review, 'sb-bubble') : ''
        const pic = v.photo ? media(v.photo, { crop: p.crop, cls: 'sb-aside', blob: m === 'blob' }) : ''
        return { vars: `--sb-ta:${pic ? textSpan(p.asym) : 12};`, inner: `<div class="sb-cols"><div class="sb-main sb-stack">${h()}${body()}${bubble}</div>${pic}</div>` }
      }
    }
  },
  words: (s, v, style) => ({
    title: THEMES[style.theme].voice.titles.about(v.trade, v.place),
    texts: [v.body],
    col: s.archetype === 'statement' ? 820 : s.archetype === 'bigtype' ? 620 : 500,
    // The big-type heading is set near the hero's size.
    px: s.archetype === 'bigtype' ? { d: sizesFor(style, s.step).h1 * 0.82, m: sizesFor(style, s.step).h1m } : undefined,
  }),
})


export const ABOUT_CSS = `
.sb-about-statement{font-family:var(--sb-fd);font-weight:var(--sb-dw);letter-spacing:var(--sb-dtr);line-height:1.25;max-width:30ch;font-size:calc(var(--sb-h2) * 0.5)}
.sb-size--big .sb-about-statement{font-size:calc(var(--sb-h2) * 0.62)}
.sb-center .sb-about-statement{align-self:center;text-align:center}
.sb-center .sb-about-stats{justify-content:center}
.sb-about-stats{display:flex;flex-wrap:wrap;gap:var(--sb-gap) calc(var(--sb-gap) * 3.5)}
.sb-about-stats .sb-stat-n{font-size:calc(var(--sb-xl) * 0.62)}
.sb-about-stats--grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:calc(var(--sb-gap) * 2)}
.sb-about-stats--grid .sb-stat-n{font-size:var(--sb-xl)}
.sb-about-stats--rule>li{border-top:6px solid var(--sb-accent);padding-top:18px}
.sb-about-banner{width:100%;height:300px}
.sb-height--tall .sb-about-banner{height:440px}
.sb-about-review{max-width:520px;padding:22px 24px;gap:10px}
.sb-about-review p{font-size:17px}
.sb-h2--big{font-size:var(--sb-h1)}
.sb-about-big .sb-h2--big{font-size:calc(var(--sb-h1) * 0.82)}
.sb-dropcap::first-letter{float:left;margin:0.06em 0.1em 0 0;font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:4.1em;line-height:0.82;color:var(--sb-link)}
.sb-bubble{position:relative;display:flex;flex-direction:column;gap:10px;max-width:560px;margin-bottom:28px;padding:26px 28px;border-radius:28px;background:#FFFFFF;color:var(--sb-ink);box-shadow:0 10px 30px color-mix(in srgb,var(--sb-ink) 9%,transparent)}
.sb-bubble .sb-stars{color:var(--sb-brand-text)}
.sb-bubble p{font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:22px;line-height:1.3;letter-spacing:var(--sb-dtr)}
.sb-bubble figcaption{color:var(--sb-muted)}
.sb-bubble::after{content:"";position:absolute;left:48px;bottom:-16px;width:34px;height:34px;background:#FFFFFF;transform:rotate(45deg);border-radius:5px}
.sb-about .sb-media .sb-photo{max-height:600px}
.sb-about.sb-img--right .sb-bleed--edge{margin-right:calc(-1 * (var(--sb-pad) + (100cqw - min(100cqw, 1200px)) / 2))}
.sb-about.sb-img--left .sb-bleed--edge{margin-left:calc(-1 * (var(--sb-pad) + (100cqw - min(100cqw, 1200px)) / 2))}
.sb-about .sb-bleed--edge .sb-photo{border-radius:0}
@container (max-width: 719px){
  .sb-about-statement,.sb-size--big .sb-about-statement{font-size:calc(var(--sb-h2m) * 0.62)}
  .sb-about-banner,.sb-height--tall .sb-about-banner{height:220px}
  .sb-about-stats{gap:var(--sb-gap) calc(var(--sb-gap) * 2)}
  .sb-about-stats--grid .sb-stat-n{font-size:var(--sb-xlm)}
  .sb-h2--big,.sb-about-big .sb-h2--big{font-size:var(--sb-h1m)}
  .sb-about.sb-img--right .sb-bleed--edge,.sb-about.sb-img--left .sb-bleed--edge{margin:0 -20px}
  .sb-bubble p{font-size:19px}
}
`
